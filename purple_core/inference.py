"""Real pretrained-model inference for Purple Creator.

This loads an existing Hugging Face model at first use. It does NOT train,
fine-tune, or claim that the base model is Purple-trained.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class InferenceSettings:
    model_id: str = "Qwen/Qwen2.5-0.5B-Instruct"
    device: str = "auto"
    load_in_4bit: bool = True
    max_new_tokens: int = 1024
    temperature: float = 0.2
    top_p: float = 0.9


class HuggingFaceRuntime:
    """Lazy Transformers runtime; model weights download only on first load."""

    def __init__(self, settings: InferenceSettings | None = None):
        self.settings = settings or InferenceSettings()
        self._tokenizer: Any = None
        self._model: Any = None
        self._device = "not_loaded"
        self._load_note = "Model has not been loaded yet."

    def info(self):
        from .model_runtime import RuntimeInfo
        return RuntimeInfo(
            name=self.settings.model_id,
            loaded=self._model is not None,
            device=self._device,
            model_revision=None,
            detail=self._load_note,
        )

    def load(self) -> None:
        if self._model is not None:
            return

        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer
        except ImportError as exc:
            raise RuntimeError(
                "Missing inference dependencies. Install with: "
                "pip install -r requirements-inference.txt"
            ) from exc

        self._tokenizer = AutoTokenizer.from_pretrained(
            self.settings.model_id,
            trust_remote_code=False,
        )

        load_kwargs: dict[str, Any] = {}
        if torch.cuda.is_available():
            self._device = torch.cuda.get_device_name(0)
            if self.settings.load_in_4bit:
                try:
                    from transformers import BitsAndBytesConfig
                    load_kwargs["quantization_config"] = BitsAndBytesConfig(
                        load_in_4bit=True,
                        bnb_4bit_quant_type="nf4",
                        bnb_4bit_compute_dtype=(
                            torch.bfloat16
                            if torch.cuda.is_bf16_supported()
                            else torch.float16
                        ),
                        bnb_4bit_use_double_quant=True,
                    )
                    load_kwargs["device_map"] = "auto"
                except Exception as exc:
                    self._load_note = (
                        "4-bit loading unavailable; using standard GPU loading: "
                        + str(exc)
                    )
                    load_kwargs["torch_dtype"] = (
                        torch.float16
                        if torch.cuda.is_available()
                        else torch.float32
                    )
                    load_kwargs["device_map"] = "auto"
            else:
                load_kwargs["torch_dtype"] = (
                    torch.bfloat16
                    if torch.cuda.is_bf16_supported()
                    else torch.float16
                )
                load_kwargs["device_map"] = "auto"
        else:
            self._device = "CPU"
            load_kwargs["torch_dtype"] = torch.float32

        self._model = AutoModelForCausalLM.from_pretrained(
            self.settings.model_id,
            **load_kwargs,
        )
        if not torch.cuda.is_available():
            self._model.to("cpu")
        self._model.eval()
        self._load_note = (
            "Pretrained base model loaded for inference. "
            "No Purple Creator fine-tuning has been applied."
        )

    def generate(
        self,
        prompt: str,
        *,
        temperature: float | None = None,
        max_new_tokens: int | None = None,
    ) -> str:
        if not isinstance(prompt, str) or not prompt.strip():
            raise ValueError("Prompt must not be empty.")

        self.load()

        import torch

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a careful programming and project creation assistant. "
                    "Answer in the language used by the user. Provide complete, "
                    "practical outputs. Never claim that code was executed or tested "
                    "unless it actually was."
                ),
            },
            {"role": "user", "content": prompt},
        ]

        if hasattr(self._tokenizer, "apply_chat_template"):
            encoded = self._tokenizer.apply_chat_template(
                messages,
                tokenize=True,
                add_generation_prompt=True,
                return_tensors="pt",
            )
            inputs = {"input_ids": encoded}
            if hasattr(encoded, "to"):
                inputs = {"input_ids": encoded.to(self._model.device)}
        else:
            rendered = (
                messages[0]["content"]
                + "\n\nUser: "
                + prompt
                + "\nAssistant:"
            )
            inputs = self._tokenizer(
                rendered,
                return_tensors="pt",
            ).to(self._model.device)

        input_ids = inputs["input_ids"]
        attention_mask = torch.ones_like(input_ids)
        temperature_value = (
            self.settings.temperature if temperature is None else temperature
        )
        token_count = (
            self.settings.max_new_tokens
            if max_new_tokens is None
            else max_new_tokens
        )
        if token_count < 1:
            raise ValueError("max_new_tokens must be positive.")

        generation_args: dict[str, Any] = {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
            "max_new_tokens": token_count,
            "pad_token_id": self._tokenizer.eos_token_id,
            "eos_token_id": self._tokenizer.eos_token_id,
            "use_cache": True,
        }
        if temperature_value > 0:
            generation_args.update(
                do_sample=True,
                temperature=temperature_value,
                top_p=self.settings.top_p,
            )
        else:
            generation_args["do_sample"] = False

        with torch.inference_mode():
            output = self._model.generate(**generation_args)

        new_tokens = output[0, input_ids.shape[-1]:]
        text = self._tokenizer.decode(
            new_tokens,
            skip_special_tokens=True,
        ).strip()

        if not text:
            raise RuntimeError("The model returned an empty response.")
        return text

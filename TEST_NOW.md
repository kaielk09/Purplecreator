# Test Purple Creator now — no training required

Purple Creator can be tested before any fine-tuning. The repository now has two distinct paths:

1. **Pretrained text inference** — loads the existing Qwen2.5-0.5B-Instruct base model from Hugging Face on first use. This is a real pretrained model, not a trained Purple Creator checkpoint. Internet is needed for the first model download.
2. **Procedural 3D export** — creates editable mesh geometry from a small set of prompt patterns and exports OBJ + scene JSON. This works without model weights.

## 1. Install

Python 3.10 or 3.11 is recommended.

```bash
python -m venv .venv
```

Windows:
```bat
.venv\Scripts\activate
python -m pip install -U pip
pip install -r requirements-inference.txt
```

Linux:
```bash
source .venv/bin/activate
python -m pip install -U pip
pip install -r requirements-inference.txt
```

For NVIDIA GPU, install a PyTorch build compatible with the installed CUDA driver if pip did not select a suitable build. Verify with:
```bash
python -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU')"
```

## 2. Check installation

```bash
python -m purple_core status
```

## 3. Generate text (downloads base model on first run)

```bash
python -m purple_core ask "Wyjaśnij, jak działa funkcja w Pythonie, i pokaż przykład."
```

First run downloads model files from Hugging Face. Later runs use the local cache.

## 4. Generate code

```bash
python -m purple_core code "Napisz kompletny moduł Luau do zarządzania punktami gracza" --language Luau --target Roblox --output ./generated
```

The generated file is saved under the selected output directory. Review it before using it.

## 5. Generate editable 3D geometry without a model download

```bash
python -m purple_core 3d "Stwórz dom z drzwiami i oknami" --output ./generated3d
```

This creates an OBJ mesh and a JSON scene description. Current natural-language 3D support is procedural and limited to built-in primitive patterns; it is not neural 3D generation.

## 6. Run offline tests

```bash
python -m unittest discover -s purple_core/tests -p "test_live_generation.py" -v
```

These tests do not download model weights or start training.

## Honest current status

- No training is required for these tests.
- Text generation uses the un-fine-tuned pretrained base model.
- There are no Purple Creator model weights yet.
- 3D generation creates real procedural meshes, not arbitrary AI-designed meshes.
- The lightweight code checks are not a compiler and do not prove generated source code is correct.

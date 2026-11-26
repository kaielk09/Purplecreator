# Purple Creator — external training datasets

Purple Creator's model architecture and model implementation are original. Training data may come from third-party public datasets; it does not have to be created by us.

We do not use another pretrained model's weights as the Purple model. The project can learn from datasets while keeping its own architecture and training pipeline.

## Important distinction
- Public dataset: may be used only after its license, provenance, terms and quality have been reviewed.
- Pretrained model checkpoint: someone else's trained model. It is not used as Purple's model backbone under the original-model requirement.
- PyTorch, NumPy and tokenizer tooling: libraries are infrastructure, not pretrained model weights.

## Prepare a dataset
1. Download a dataset from its original publisher or an authorized dataset host.
2. Keep the original license and source metadata.
3. Convert it to JSONL with one JSON object per line. Accepted text field pairs are instruction/output, prompt/response, or question/answer.
4. Add a source entry to a copy of dataset_manifest.example.json.
5. Record exact revision, license identifier, license URL, retrieval date, SHA-256, languages and task tags.
6. Set status to approved only after a human has reviewed the terms and data.
7. Put the matching local file at data/raw/<source-id>.jsonl.

The manifest requires commercial-use and modification permission because the project may later be distributed. If a dataset has non-commercial, share-alike, attribution, or other obligations, do not bypass them; review whether the project can comply before approval. Unknown or unclear licenses stay quarantined.

## Current status
No external dataset is pre-approved or bundled by this repository yet. The example manifest is deliberately a template, not a declaration that an example source is licensed. Dataset selection and license review happen before training. The preparation tool does not train the model.

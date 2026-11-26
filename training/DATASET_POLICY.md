# Purple Creator training data policy

## Core rule
Purple Creator's architecture, tokenizer implementation, model code, inference engine and final trained weights are our own project. Training examples do not have to be authored by us.

We may train from lawfully usable public datasets, openly licensed datasets, and our own examples. Using a dataset is not the same as importing another model. We do not load another model's pretrained weights or use another model as the inference engine.

## Dataset acceptance gates
Every dataset needs a source record before it enters a training mixture:
- dataset name and exact version/revision
- original publisher and canonical URL
- license identifier and license URL
- commercial-use and modification permissions
- attribution, share-alike and notice requirements
- collection date and retrieval method
- supported languages and task categories
- privacy, personal-data and opt-out concerns
- filtering and transformation steps
- content hash and final record count

Do not infer that a dataset is open merely because it is downloadable or publicly hosted. If licensing is unclear, quarantine it until reviewed. Do not include secrets, credentials, private messages, personal records, or material obtained in violation of access restrictions.

## Recommended mixture categories
- Polish and multilingual instruction following
- programming concepts and code explanation
- code generation across selected languages
- debugging and repair
- multi-file project planning
- reasoning and task decomposition
- 3D geometry, coordinate systems, mesh topology and procedural modeling

Choose source proportions only after inspecting quality, language balance, duplication and license compatibility. Do not fill category quotas by duplicating a small set of records.

## Data splits
Split by source/document/conversation before chunking or augmentation. Keep near-duplicates and related records in the same split to reduce leakage. Maintain train, validation and test splits. Store split manifests and content hashes so a run is reproducible.

## No external model weights
Allowed: public datasets and compatible data-processing libraries.
Not allowed for the original Purple model path: using Qwen, Llama, Gemma, Mistral or other pretrained model weights as the model backbone or runtime. A dataset containing model-generated responses must be separately reviewed and clearly labeled; it must not be presented as human-authored ground truth.

## Current status
This policy does not claim that any third-party dataset has already been approved or downloaded. Each proposed source needs license and quality review before use.

# Remy Fine-Tuning Pipeline Setup

## Overview

Fine-tune `qwen3:4b` into `remy:latest` using QLoRA (4-bit quantized LoRA training).
This gives Remy a domain-specific model that already "knows" its personality, guardrails,
and ChefFlow business context — reducing system prompt size and improving voice consistency.

## Hardware Requirements (your PC)

- **GPU:** RTX 3050 (6GB VRAM) — fits qwen3:4b with QLoRA in 4-bit
- **RAM:** 128GB DDR5 — more than enough
- **CPU:** Ryzen 9 7900X — handles data preprocessing
- **Storage:** ~5GB for model checkpoints

## Software Requirements

### Option A: WSL2 (Recommended for Windows)

```bash
# 1. Install WSL2 if not present
wsl --install

# 2. Inside WSL2:
sudo apt update && sudo apt install python3.11 python3.11-pip python3.11-venv

# 3. Create virtual environment
python3.11 -m venv ~/remy-finetune
source ~/remy-finetune/bin/activate

# 4. Install Unsloth (QLoRA training framework)
pip install "unsloth[cu124-torch250]"

# 5. Install other dependencies
pip install transformers datasets trl peft accelerate bitsandbytes
```

### Option B: Direct Windows (if WSL2 issues)

```powershell
# Python 3.11 needed (3.14 may have compatibility issues)
# Download from python.org, install with pip enabled

python -m venv C:\remy-finetune
C:\remy-finetune\Scripts\activate

pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
pip install transformers datasets trl peft accelerate
# Note: bitsandbytes on Windows requires special build
pip install bitsandbytes-windows
pip install unsloth
```

## Training Script

```python
# scripts/remy-eval/train-remy.py

from unsloth import FastLanguageModel
from trl import SFTTrainer
from transformers import TrainingArguments
from datasets import load_dataset

# 1. Load base model in 4-bit
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/Qwen3-4B-bnb-4bit",
    max_seq_length=4096,
    dtype=None,  # Auto-detect
    load_in_4bit=True,
)

# 2. Add LoRA adapters
model = FastLanguageModel.get_peft_model(
    model,
    r=16,              # LoRA rank
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                     "gate_proj", "up_proj", "down_proj"],
    lora_alpha=16,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=42,
)

# 3. Load training data
dataset = load_dataset("json", data_files="training-data/remy-sharegpt.jsonl", split="train")

# 4. Configure training
training_args = TrainingArguments(
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    warmup_steps=5,
    num_train_epochs=3,
    learning_rate=2e-4,
    fp16=True,
    logging_steps=1,
    optim="adamw_8bit",
    output_dir="outputs",
    seed=42,
)

# 5. Train
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",  # Will need preprocessing
    max_seq_length=4096,
    args=training_args,
)

trainer.train()

# 6. Save LoRA adapters
model.save_pretrained("outputs/remy-lora")

# 7. Merge and export to GGUF for Ollama
model.save_pretrained_gguf("outputs/remy-gguf", tokenizer, quantization_method="q4_k_m")
```

## Loading in Ollama

After exporting the GGUF:

```bash
# Create Modelfile
cat > Modelfile << 'EOF'
FROM outputs/remy-gguf/unsloth.Q4_K_M.gguf

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER stop "<|im_end|>"

SYSTEM "You are Remy, a seasoned kitchen veteran AI concierge for ChefFlow."
EOF

# Load into Ollama
ollama create remy:latest -f Modelfile

# Test
ollama run remy:latest "How's revenue this month?"
```

## Updating Remy to Use the Fine-Tuned Model

In `lib/ai/parse-ollama.ts`, update the model routing:

```typescript
// Before
const MODEL_TIERS = {
  fast: 'qwen3:4b',
  standard: 'qwen3-coder:30b',
  complex: 'qwen3:30b',
}

// After (for conversational responses)
const MODEL_TIERS = {
  fast: 'qwen3:4b', // Keep for classification (unchanged)
  standard: 'remy:latest', // Use fine-tuned for structured tasks
  complex: 'remy:latest', // Use fine-tuned for conversation
}
```

## Training Data Scaling

Current: 31 conversations (seed dataset)
Target: 500+ conversations for meaningful fine-tuning

To expand:

1. Run the eval harness and capture all passing Remy responses
2. Manually curate the best responses as training examples
3. Generate variations across all 7 archetypes for each topic
4. Include multi-turn conversations (3-5 turns each)
5. Ensure all safety refusals are well-represented (recipe, politics, injection)

## Estimated Training Time

- **qwen3:4b with QLoRA on RTX 3050:** ~15-30 minutes for 500 examples
- **Export to GGUF:** ~5 minutes
- **Total pipeline:** ~1 hour end-to-end

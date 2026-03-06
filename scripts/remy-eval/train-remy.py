#!/usr/bin/env python3
"""
Remy QLoRA Fine-Tune Script

Fine-tunes qwen3:4b into remy:latest using QLoRA (4-bit quantized LoRA).
Uses Unsloth for 2x training speed on consumer GPUs.

Prerequisites:
  pip install "unsloth[cu124-torch250]" transformers datasets trl peft accelerate bitsandbytes

Usage:
  python scripts/remy-eval/train-remy.py [--epochs 3] [--data training-data/remy-sharegpt.jsonl] [--output outputs/remy-lora]

Hardware: RTX 3050 (6GB VRAM), 128GB RAM, Ryzen 9 7900X
Expected time: ~15-30 min for 500 examples, ~5 min GGUF export
"""

import argparse
import os
import sys
import json
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="Fine-tune Remy via QLoRA")
    parser.add_argument("--data", default="training-data/remy-sharegpt.jsonl", help="Training data path")
    parser.add_argument("--output", default="outputs/remy-lora", help="Output directory for LoRA adapters")
    parser.add_argument("--gguf-output", default="outputs/remy-gguf", help="Output directory for GGUF export")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=2, help="Per-device batch size")
    parser.add_argument("--lr", type=float, default=2e-4, help="Learning rate")
    parser.add_argument("--max-seq-length", type=int, default=4096, help="Max sequence length")
    parser.add_argument("--lora-rank", type=int, default=16, help="LoRA rank")
    parser.add_argument("--skip-export", action="store_true", help="Skip GGUF export step")
    parser.add_argument("--skip-ollama", action="store_true", help="Skip Ollama model creation")
    parser.add_argument("--dry-run", action="store_true", help="Validate data without training")
    args = parser.parse_args()

    # Resolve paths relative to script directory
    script_dir = Path(__file__).parent
    data_path = script_dir / args.data
    output_path = script_dir / args.output
    gguf_path = script_dir / args.gguf_output

    # Validate training data exists
    if not data_path.exists():
        print(f"ERROR: Training data not found at {data_path}")
        print(f"Run: npx tsx scripts/remy-eval/generate-training-data.ts")
        sys.exit(1)

    # Count and validate training examples
    examples = []
    with open(data_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                examples.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"WARNING: Skipping malformed line: {e}")

    print(f"Loaded {len(examples)} training conversations")

    if len(examples) < 10:
        print("WARNING: Very few training examples. Recommend 100+ for meaningful results.")

    if args.dry_run:
        # Validate data format
        valid = 0
        for i, ex in enumerate(examples):
            convs = ex.get("conversations", [])
            if not convs:
                print(f"  Example {i}: missing 'conversations' key")
                continue
            roles = [c.get("from") for c in convs]
            if "system" not in roles:
                print(f"  Example {i}: missing system message")
            if "human" not in roles:
                print(f"  Example {i}: missing human message")
            if "gpt" not in roles:
                print(f"  Example {i}: missing gpt (assistant) message")
            valid += 1

        print(f"\nDry run complete: {valid}/{len(examples)} valid examples")
        print(f"Estimated training time: ~{len(examples) * 0.04:.0f} minutes on RTX 3050")
        return

    # ── Actual Training ──

    try:
        from unsloth import FastLanguageModel
        from trl import SFTTrainer
        from transformers import TrainingArguments
        from datasets import load_dataset
    except ImportError as e:
        print(f"ERROR: Missing dependency: {e}")
        print("Install with: pip install 'unsloth[cu124-torch250]' transformers datasets trl peft accelerate bitsandbytes")
        sys.exit(1)

    print("\n=== Step 1/5: Loading base model (qwen3:4b in 4-bit) ===")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name="unsloth/Qwen3-4B-bnb-4bit",
        max_seq_length=args.max_seq_length,
        dtype=None,
        load_in_4bit=True,
    )

    print("\n=== Step 2/5: Adding LoRA adapters ===")
    model = FastLanguageModel.get_peft_model(
        model,
        r=args.lora_rank,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                         "gate_proj", "up_proj", "down_proj"],
        lora_alpha=args.lora_rank,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=42,
    )

    print("\n=== Step 3/5: Loading training data ===")
    dataset = load_dataset("json", data_files=str(data_path), split="train")
    print(f"  {len(dataset)} conversations loaded")

    # Format conversations for training
    def format_conversation(example):
        """Convert ShareGPT format to chat template."""
        messages = []
        for msg in example["conversations"]:
            role = {"system": "system", "human": "user", "gpt": "assistant"}.get(msg["from"], "user")
            messages.append({"role": role, "content": msg["value"]})
        return {"text": tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)}

    dataset = dataset.map(format_conversation, remove_columns=dataset.column_names)

    print("\n=== Step 4/5: Training ===")
    os.makedirs(output_path, exist_ok=True)

    training_args = TrainingArguments(
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=4,
        warmup_steps=5,
        num_train_epochs=args.epochs,
        learning_rate=args.lr,
        fp16=True,
        logging_steps=1,
        optim="adamw_8bit",
        output_dir=str(output_path),
        seed=42,
        save_strategy="epoch",
        report_to="none",
    )

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=args.max_seq_length,
        args=training_args,
    )

    trainer.train()
    print(f"\n  Training complete! LoRA adapters saved to {output_path}")

    if not args.skip_export:
        print("\n=== Step 5/5: Exporting to GGUF (q4_k_m quantization) ===")
        os.makedirs(gguf_path, exist_ok=True)
        model.save_pretrained_gguf(str(gguf_path), tokenizer, quantization_method="q4_k_m")
        print(f"  GGUF exported to {gguf_path}")

        if not args.skip_ollama:
            # Create Ollama Modelfile
            modelfile_path = gguf_path / "Modelfile"
            gguf_file = list(gguf_path.glob("*.gguf"))
            if gguf_file:
                modelfile_content = f"""FROM {gguf_file[0].name}

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER stop "<|im_end|>"

SYSTEM "You are Remy, a seasoned kitchen veteran AI concierge for ChefFlow. You help private chefs manage their business: revenue, clients, events, scheduling, communications, and operations. You NEVER generate recipes. You're warm, direct, and food-first."
"""
                with open(modelfile_path, "w") as f:
                    f.write(modelfile_content)

                print(f"\n  Modelfile written to {modelfile_path}")
                print(f"\n  To load into Ollama:")
                print(f"    cd {gguf_path}")
                print(f"    ollama create remy:latest -f Modelfile")
                print(f"    ollama run remy:latest \"How's my revenue this month?\"")
    else:
        print("\n  Skipping GGUF export (--skip-export)")

    print("\n=== Done! ===")
    print(f"  Training data: {len(examples)} conversations")
    print(f"  LoRA adapters: {output_path}")
    if not args.skip_export:
        print(f"  GGUF model: {gguf_path}")


if __name__ == "__main__":
    main()

# Hardware Upgrade Plan — Always-On AI Inference

> **Last updated:** 2026-02-28
> **Problem:** ChefFlow's AI (Ollama) runs entirely on the developer's PC. PC off = all AI features dead.
> **Goal:** Dedicated always-on device that runs Ollama 24/7, independent of the PC.

---

## The Problem

| Scenario                             | AI Status                                                           |
| ------------------------------------ | ------------------------------------------------------------------- |
| PC on                                | Works                                                               |
| PC off, sleeping, restarting, gaming | **Dead** — every `parseWithOllama` call throws `OllamaOfflineError` |
| Windows Update restarts at 2am       | **Dead**                                                            |
| Power flicker                        | **Dead**                                                            |
| Traveling with laptop, desktop off   | **Dead**                                                            |

The Raspberry Pi 5 (8GB) cannot help — Ollama is permanently masked because `qwen3:8b` (5.2GB) caused OOM, killing SSH and Cloudflare. The Pi is a good web server (beta hosting) but a terrible AI server.

---

## Current Models (What the Device Must Run)

| Tier     | Model             | Size        | Use Case                               | Files Using It |
| -------- | ----------------- | ----------- | -------------------------------------- | -------------- |
| fast     | `qwen3:4b`        | 2.5 GB      | Classification, intent parsing, triage | ~10 files      |
| standard | `qwen3-coder:30b` | 18 GB (MoE) | Structured JSON extraction (default)   | ~30+ files     |
| complex  | `qwen3:30b`       | 18 GB (MoE) | Prose, conversation, creative          | ~3 files       |

All three loaded simultaneously = ~38.5 GB. Minimum usable memory for the standard tier alone = 20 GB+.

The 30B MoE models activate only 3.3B parameters per token — that's why they're fast despite the large size.

---

## Options Compared

### Option 1: HP Z640 + RTX 3090 (~$1,000)

**The budget play.** Buy a used enterprise workstation, drop in a used GPU.

| Component                                  | Cost            |
| ------------------------------------------ | --------------- |
| HP Z640 workstation (Facebook Marketplace) | ~$200           |
| SSD (256GB, Linux boot)                    | ~$40            |
| Used RTX 3090 (24GB VRAM)                  | ~$700-800       |
| **Total**                                  | **~$950-1,050** |

**Specs that matter:**

- 24GB GDDR6X @ 936 GB/s memory bandwidth
- Xeon E5-1620 v3 (plenty for serving Ollama)
- 925W or 1125W PSU (can power a 3090)
- Full tower, enterprise cooling, built for 24/7

**Performance:** ~40-50 tok/s on 30B MoE models

**Pros:** Cheapest option, fastest single-GPU inference, upgradeable (swap in 4090/5090 later)
**Cons:** Loud (fans), big (full tower), power hungry (~150W idle), runs one 30B model at a time in VRAM (second would spill to RAM)

**What to search on Facebook Marketplace:** `HP Z640`, `HP Z440`, `Dell Precision T5810`, `Lenovo ThinkStation P520`

**Before buying, ask:** PSU wattage (need 925W+) and RAM amount (need 16GB+).

---

### Option 2: Mac Mini M4 Pro 48GB (~$1,600)

**The balanced play.** Small, silent, always-on, enough memory for all models.

**Specs that matter:**

- 48GB unified memory (all GPU-accessible)
- ~273 GB/s memory bandwidth
- Apple M4 Pro chip with Metal acceleration
- 15W idle, fanless at low load

**Performance:** ~30 tok/s on 30B MoE models

**Pros:** Silent, tiny, low power, zero maintenance, replaces the Pi for beta hosting too
**Cons:** Not upgradeable, slower than dedicated GPU, Apple ecosystem

---

### Option 3: Mac Studio M4 Ultra 192GB (~$7,000)

**The "never think about it again" play.**

**Specs that matter:**

- 192GB unified memory (all GPU-accessible)
- ~800 GB/s memory bandwidth
- Can run 70B+ dense models, 100B+ quantized
- All 3 current models loaded simultaneously with 150GB to spare

**Performance:** ~40 tok/s on 30B MoE models

**Pros:** Runs anything, silent, compact, future-proof for years
**Cons:** $7,000

---

### Option 4: Custom Build + RTX 3090 (~$1,200-1,500)

**Build from scratch instead of buying used.**

| Component                    | Cost              |
| ---------------------------- | ----------------- |
| Ryzen 5 + budget motherboard | ~$180             |
| 32GB DDR4 RAM                | ~$60              |
| Case (ATX)                   | ~$60              |
| PSU 750W+                    | ~$80              |
| SSD 256GB                    | ~$40              |
| Used RTX 3090                | ~$750             |
| **Total**                    | **~$1,170-1,500** |

Same performance as Option 1 but costs $200-400 more (you're paying retail for parts vs buying a pre-built workstation for $200).

---

## Comparison Table

|                        | Z640 + 3090     | Mac Mini M4 Pro | Mac Studio M4 Ultra | Custom Build    |
| ---------------------- | --------------- | --------------- | ------------------- | --------------- |
| **Price**              | ~$1,000         | ~$1,600         | ~$7,000             | ~$1,300         |
| **VRAM/Memory**        | 24GB dedicated  | 48GB unified    | 192GB unified       | 24GB dedicated  |
| **Bandwidth**          | 936 GB/s        | 273 GB/s        | 800 GB/s            | 936 GB/s        |
| **Speed (30B)**        | ~45 tok/s       | ~30 tok/s       | ~40 tok/s           | ~45 tok/s       |
| **Noise**              | Loud            | Silent          | Silent              | Loud            |
| **Size**               | Full tower      | Book-sized      | Shoebox             | Mid tower       |
| **Power (idle)**       | ~100-150W       | ~15W            | ~30W                | ~100-150W       |
| **Upgradeable**        | Yes (GPU swap)  | No              | No                  | Yes (GPU swap)  |
| **Also replaces Pi?**  | Yes (run beta)  | Yes (run beta)  | Yes (run beta)      | Yes (run beta)  |
| **Always-on friendly** | Yes (closet it) | Perfect         | Perfect             | Yes (closet it) |

---

## Recommendation

**Right now:** Leave PC on. It works. AI downtime at 3am doesn't matter yet.

**First investment (~$1,000):** HP Z640 + RTX 3090. Best performance per dollar. Put it in a closet, install Ubuntu + Ollama, point ChefFlow at its LAN IP. Done.

**When ChefFlow makes money (~$1,600):** Mac Mini M4 Pro 48GB. Silent, maintenance-free, replaces the Pi entirely.

**Endgame (~$7,000):** Mac Studio M4 Ultra 192GB. The forever machine.

---

## Architecture After Upgrade

```
PC (localhost:3100)              → Development only, AI optional
Inference Box (LAN IP:11434)     → PRIMARY Ollama — always on, all 3 tiers
  └─ Also runs: beta hosting (PM2 + Cloudflare Tunnel)
Vercel (app.cheflowhq.com)       → Production
```

**Config change (`.env.local` on PC):**

```bash
OLLAMA_BASE_URL=http://<inference-box-ip>:11434
```

PC becomes optional for AI. Shut it down — everything still works.

---

## Facebook Marketplace Search Terms

For used enterprise workstations:

- `HP Z640` / `HP Z440` / `HP Z840`
- `Dell Precision T5810` / `Dell Precision T7810`
- `Lenovo ThinkStation P520` / `P720`
- `Gaming PC no GPU`

For the GPU:

- `RTX 3090` / `RTX 3090 24GB`

**Check before buying:** PSU wattage (650W+ minimum, 925W+ ideal) and installed RAM (16GB+ minimum).

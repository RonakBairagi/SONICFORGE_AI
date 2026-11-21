---
title: SonicForge AI Demucs Neural Stem Engine
emoji: 🎛️
colorFrom: purple
colorTo: indigo
sdk: gradio
sdk_version: 4.44.1
app_file: app.py
pinned: false
license: mit
---

# SonicForge AI — Demucs Neural Stem Engine
### Free Hosted Audio Source Separation Powered by Meta AI Demucs (HTDemucs v4)

This Hugging Face Space hosts the high-performance AI inference engine for **SonicForge AI**.

---

## Capabilities
* **4-Stem Standard Band Separation:** Isolates Vocals, Drums, Bass, and Other Instruments.
* **2-Stem Vocal / Instrumental Separation:** Isolates Lead Acapella and Backing Instrumental.
* **Hardware Acceleration:** Supports Hugging Face **ZeroGPU** (`@spaces.GPU`) with dynamic Nvidia A100/H100 allocation, with automatic CPU fallback.
* **API Endpoints:**
  - `separate_stems`: Accepts audio file & preset, returns lossless 24-bit/16-bit separated audio stems.
  - `health`: Returns system status, model state, and active hardware device.

---

## API Usage with @gradio/client
```javascript
import { Client, handle_file } from "@gradio/client";

const app = await Client.connect("YOUR_USERNAME/SPACE_NAME");
const result = await app.predict("/separate_stems", [
  handle_file(audioBlobOrFile),
  "4_tracks"
]);

console.log("Separated Stems:", result.data);
// result.data contains: [vocals_url, drums_url, bass_url, other_url]
```

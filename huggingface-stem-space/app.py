"""
SonicForge AI — Demucs Neural Stem Engine
Hosted Gradio Application for Hugging Face Spaces with ZeroGPU & Free CPU Support
Model: Meta AI Demucs (Hybrid Transformer v4 / htdemucs)
"""

import os
import sys
import uuid
import shutil
import tempfile
from pathlib import Path
from typing import Tuple, Optional, Dict, Any

# CRITICAL ZeroGPU requirement: import spaces before importing torch or any CUDA library
try:
    import spaces
    HAS_SPACES = True
except Exception:
    HAS_SPACES = False

import torch
import soundfile as sf
import gradio as gr
from demucs.pretrained import get_model
from demucs.apply import apply_model
from demucs.audio import AudioFile

# Device detection
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[*] Initializing SonicForge Demucs Space (Device: {DEVICE}, ZeroGPU: {HAS_SPACES})")

# Preload Demucs htdemucs model globally at module scope
# ZeroGPU intercepts model caching and streams weights to GPU on execution
MODEL_NAME = "htdemucs"
try:
    print(f"[*] Preloading {MODEL_NAME} model weights...")
    model = get_model(name=MODEL_NAME)
    model.eval()
    print(f"[✓] {MODEL_NAME} ready. Sources: {model.sources}, Sample Rate: {model.samplerate} Hz")
except Exception as e:
    print(f"[!] Warning preloading model: {e}")
    model = None

# Base scratch directory for output stems
SCRATCH_DIR = Path(tempfile.gettempdir()) / "sonicforge_stems"
SCRATCH_DIR.mkdir(parents=True, exist_ok=True)

# Conditional decorator for ZeroGPU execution
# Free ZeroGPU grants up to 120s of dynamic A100 GPU compute
if HAS_SPACES:
    gpu_decorator = spaces.GPU(duration=120)
else:
    def gpu_decorator(func):
        return func


def health_status() -> Dict[str, Any]:
    """Health check endpoint for frontend connection verification"""
    cuda_avail = torch.cuda.is_available()
    dev_name = torch.cuda.get_device_name(0) if cuda_avail else "Host CPU"
    return {
        "status": "ok",
        "service": "SonicForge Demucs Space",
        "version": "1.0.0",
        "model": MODEL_NAME,
        "device": "cuda" if cuda_avail else "cpu",
        "deviceName": dev_name,
        "zeroGpuEnabled": HAS_SPACES,
        "supportedPresets": ["4_tracks", "2_tracks"],
        "maxDurationSeconds": 360,
        "maxFileSizeMB": 50,
    }


@gpu_decorator
def separate_stems(
    audio_path: Optional[str],
    preset: str = "4_tracks"
) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    """
    Separates input audio into isolated stems using Meta AI Demucs HTDemucs v4.
    
    Inputs:
        audio_path: Local filesystem path to uploaded audio file
        preset: '4_tracks' (vocals, drums, bass, other) or '2_tracks' (vocals, instrumental)
        
    Outputs:
        (vocals_path, drums_path, bass_path, other_path)
    """
    global model

    if not audio_path or not os.path.exists(audio_path):
        raise gr.Error("No valid audio file received. Please provide an audio track.")

    input_file = Path(audio_path)
    file_size_mb = input_file.stat().st_size / (1024 * 1024)

    # 1. Validate file size (max 50 MB on free tier to prevent memory exhaustion)
    if file_size_mb > 50:
        raise gr.Error(f"Audio file ({file_size_mb:.1f} MB) exceeds maximum allowed size of 50 MB.")

    # 2. Ensure model is loaded
    if model is None:
        try:
            model = get_model(name=MODEL_NAME)
            model.eval()
        except Exception as e:
            raise gr.Error(f"Failed to load Demucs model: {str(e)}")

    # 3. Read and normalize audio using Demucs AudioFile
    try:
        audio_loader = AudioFile(str(input_file))
        wav = audio_loader.read(
            streams=0,
            samplerate=model.samplerate,
            channels=model.audio_channels
        )
    except Exception as e:
        raise gr.Error(f"Could not decode audio file: {str(e)}. Please use MP3, WAV, FLAC, or OGG.")

    # 4. Validate duration (max 6 minutes / 360 seconds on free tier)
    duration_sec = wav.shape[-1] / model.samplerate
    if duration_sec > 360:
        raise gr.Error(
            f"Audio duration ({duration_sec / 60:.1f} mins) exceeds the 6-minute limit for free tier processing."
        )

    # 5. Move tensors to GPU if available inside the @spaces.GPU context
    inf_device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[*] Starting Demucs separation ({duration_sec:.1f}s) on {inf_device}...")

    try:
        model.to(inf_device)
        ref_wav = wav[None].to(inf_device)

        with torch.no_grad():
            # apply_model returns shape: (1, 4, 2, time)
            # Sources: ['drums', 'bass', 'other', 'vocals']
            sources = apply_model(
                model,
                ref_wav,
                device=inf_device,
                split=True,
                overlap=0.25,
                progress=False
            )[0]
    except Exception as e:
        raise gr.Error(f"Inference error during stem separation: {str(e)}")

    # 6. Export stems to unique temporary directory
    job_id = str(uuid.uuid4())[:8]
    job_out_dir = SCRATCH_DIR / job_id
    job_out_dir.mkdir(parents=True, exist_ok=True)

    # Map sources by name
    # Demucs sources order: ['drums', 'bass', 'other', 'vocals']
    source_names = model.sources
    stem_tensors = {}
    for idx, src_name in enumerate(source_names):
        stem_tensors[src_name] = sources[idx].cpu()

    vocals_path = str(job_out_dir / "vocals.wav")
    drums_path = str(job_out_dir / "drums.wav")
    bass_path = str(job_out_dir / "bass.wav")
    other_path = str(job_out_dir / "other.wav")

    # Helper to save tensor to WAV (time, channels)
    def save_wav(tensor: torch.Tensor, out_path: str):
        np_arr = tensor.numpy().T
        sf.write(out_path, np_arr, samplerate=model.samplerate, subtype="PCM_16")

    # Save isolated tracks
    save_wav(stem_tensors["vocals"], vocals_path)

    if preset == "2_tracks":
        # Sum drums + bass + other into instrumental backing
        inst_tensor = stem_tensors["drums"] + stem_tensors["bass"] + stem_tensors["other"]
        inst_path = str(job_out_dir / "instrumental.wav")
        save_wav(inst_tensor, inst_path)
        print(f"[✓] 2-stem separation complete: {job_id}")
        return vocals_path, inst_path, None, None

    # 4-stem default
    save_wav(stem_tensors["drums"], drums_path)
    save_wav(stem_tensors["bass"], bass_path)
    save_wav(stem_tensors["other"], other_path)

    print(f"[✓] 4-stem separation complete: {job_id}")
    return vocals_path, drums_path, bass_path, other_path


# Build Gradio UI & define official API endpoints
theme = gr.themes.Soft(
    primary_hue="purple",
    secondary_hue="amber",
    neutral_hue="slate"
)

with gr.Blocks(title="SonicForge AI — Demucs Neural Stem Engine", theme=theme) as demo:
    gr.Markdown(
        """
        # 🎛️ SonicForge AI — Demucs Neural Stem Engine
        ### High-fidelity neural audio source separation powered by Meta AI Demucs (HTDemucs v4).
        Supports lossless 4-stem and 2-stem deconstruction.
        """
    )

    with gr.Row():
        with gr.Column(scale=1):
            audio_in = gr.Audio(
                label="Input Audio Track (MP3, WAV, FLAC, OGG — Max 50 MB, 6 mins)",
                type="filepath"
            )
            preset_choice = gr.Radio(
                choices=["4_tracks", "2_tracks"],
                value="4_tracks",
                label="Separation Preset",
                info="4 Stems (Vocals, Drums, Bass, Other) or 2 Stems (Vocals, Instrumental)"
            )
            process_btn = gr.Button("⚡ Separate Stems", variant="primary", size="lg")

        with gr.Column(scale=1):
            gr.Markdown("### Output Audio Stems")
            out_vocals = gr.Audio(label="Vocals", type="filepath")
            out_drums = gr.Audio(label="Drums", type="filepath")
            out_bass = gr.Audio(label="Bass", type="filepath")
            out_other = gr.Audio(label="Other Instruments", type="filepath")

    # Connect UI event & register official API endpoint
    process_btn.click(
        fn=separate_stems,
        inputs=[audio_in, preset_choice],
        outputs=[out_vocals, out_drums, out_bass, out_other],
        api_name="separate_stems"
    )

    with gr.Accordion("Engine Diagnostic & Health Probe", open=False):
        health_btn = gr.Button("Check Health Status")
        health_json = gr.JSON(label="System Status")
        health_btn.click(
            fn=health_status,
            inputs=[],
            outputs=[health_json],
            api_name="health"
        )

if __name__ == "__main__":
    demo.queue(max_size=10, default_concurrency_limit=2).launch(
        show_error=True,
        allowed_paths=[str(SCRATCH_DIR)]
    )

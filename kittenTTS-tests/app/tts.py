from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_DIRS = {
    "mini": ("Mini — 80M", BASE_DIR / "model"),
    "micro": ("Micro — 40M", BASE_DIR / "model-micro"),
    "nano": ("Nano — 15M", BASE_DIR / "model-nano"),
    "nano-int8": ("Nano INT8 — 15M", BASE_DIR / "model-nano-int8"),
}

VOICES = [
    "Bella", "Jasper", "Luna", "Bruno",
    "Rosie", "Hugo", "Kiki", "Leo"
]

ALIASES = {
    "Bella": "expr-voice-2-f",
    "Jasper": "expr-voice-2-m",
    "Luna": "expr-voice-3-f",
    "Bruno": "expr-voice-3-m",
    "Rosie": "expr-voice-4-f",
    "Hugo": "expr-voice-4-m",
    "Kiki": "expr-voice-5-f",
    "Leo": "expr-voice-5-m",
}

_models = {}


def _load_model(model_id):
    if model_id in _models:
        return _models[model_id]

    from kittentts.onnx_model import KittenTTS_1_Onnx

    model_dir = MODEL_DIRS[model_id][1]
    onnx_files = list(model_dir.glob("*.onnx"))
    voices = model_dir / "voices.npz"

    if not onnx_files:
        raise FileNotFoundError(f"No ONNX model found in {model_dir}")
    if not voices.exists():
        raise FileNotFoundError(f"voices.npz not found in {model_dir}")

    model = KittenTTS_1_Onnx(
        model_path=str(onnx_files[0]),
        voices_path=str(voices),
        voice_aliases=ALIASES,
    )
    _models[model_id] = model
    return model


def generate_audio_stream(text, model_id, voice, speed, clean_text, on_chunk=None, on_start=None):
    """
    Compatibility streaming wrapper for KittenTTS 0.8.1.

    The installed 0.8.1 package's low-level KittenTTS_1_Onnx object does not
    expose generate_stream(), even though newer versions/documentation do.
    Its normal generate() method already splits the text internally with
    chunk_text() and calls generate_single_chunk() for each piece.

    We reproduce that exact internal path here so the UI can receive a
    callback after each real KittenTTS inference chunk without changing the
    synthesis boundaries or requiring a newer KittenTTS package.
    """
    model = _load_model(model_id)

    import numpy as np

    # These are the same internals used by KittenTTS_1_Onnx.generate().
    # chunk_text is imported by onnx_model.py itself in the installed 0.8.1
    # package, so importing it from that module avoids the incompatible
    # direct preprocess import that caused the previous version to fail.
    from kittentts.onnx_model import chunk_text

    prepared_text = model.preprocessor(text) if clean_text else text
    text_chunks = list(chunk_text(prepared_text))

    if not text_chunks:
        raise RuntimeError("KittenTTS produced no text chunks.")

    if on_start:
        on_start(len(text_chunks))

    audio_chunks = []
    for index, text_chunk in enumerate(text_chunks, 1):
        audio = model.generate_single_chunk(text_chunk, voice=voice, speed=speed)
        audio = np.asarray(audio)
        audio_chunks.append(audio)

        if on_chunk:
            on_chunk(audio, index, len(text_chunks))

    return np.concatenate(audio_chunks, axis=-1)


def generate_audio(text, model_id, voice, speed, clean_text, output_path,
                   on_chunk=None, on_start=None):
    import soundfile as sf

    audio = generate_audio_stream(
        text, model_id, voice, speed, clean_text,
        on_chunk=on_chunk,
        on_start=on_start,
    )
    sf.write(str(output_path), audio, 24000)
    return Path(output_path)

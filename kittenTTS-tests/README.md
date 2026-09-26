# KittenTTS WebUI

A local web interface for KittenTTS, providing an offline interface for converting text and documents into speech.

The application runs entirely on the local machine through a Python virtual environment and a local Flask web server. The interface is accessed through a browser at `127.0.0.1`, and generated audio is saved locally.

## Setup

The application was developed and tested inside a Python 3.12 virtual environment.

Create and activate the environment:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install the required dependencies:

python -m pip install -r requirements.txt

The web interface can then be started through the included local server.

WebUI Dependencies

The interface depends on the following Python packages:

Flask
KittenTTS
NumPy
SoundFile
ONNX Runtime
spaCy
Misaki
Num2Words
espeakng-loader
Hugging Face Hub

KittenTTS also provides the underlying ONNX-based TTS models and voice data.

Models and Voices

The interface supports the KittenTTS model variants included with this project.

There are four model variants, with eight voices available for each model, for a total of 32 voice/model combinations.

All four models and their corresponding voice files are required if the complete set of models and voices is to be available through the interface.


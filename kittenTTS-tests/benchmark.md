# KittenTTS Benchmark

Performance measurements for the local KittenTTS installation.

## Test System

- GPU: NVIDIA GeForce RTX 5060 Laptop GPU
- VRAM: 8 GB
- System RAM: 16 GB
- Python: 3.12.10
- KittenTTS: 0.8.1
- ONNX Runtime: Local installation
- Operating System: Windows 11

## Test 01

### Configuration

- Model: KittenTTS Mini
- Model size: approximately 80M parameters
- Voice: Jasper
- Speed: 1.0×
- Input: 83,325 characters
- Intermediate chunking: Disabled

### Results

- Generation time: approximately 39 minutes
- Generated audio duration: 1 hour, 34 minutes, 54 seconds
- Generation ratio: approximately 2.43× faster than the resulting audio duration
- GPU utilization: relatively low compared with local LLM workloads
- System temperatures: remained under control during the test

### Notes

The system was able to process the full 83,325-character input in a single generation without intermediate chunking.

The laptop experienced a noticeable increase in workload during generation, but temperatures remained within acceptable operating conditions.

Additional benchmarks should be recorded for the other models, voices, and speech speeds as they are tested.

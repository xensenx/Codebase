import torch
from transformers import AutoTokenizer, AutoModel

MODEL_PATH = r"F:\Local_AI\Unlimited-OCR\huggingface\hub\models--baidu--Unlimited-OCR\snapshots\07dea832e22aefee32ad281d4b80551282e1c168"

IMAGE_PATH = r"F:\Local_AI\Unlimited-OCR\Tests\Inputs\Handwritten\Good-Handwriting-ocr-page-1.jpg"

OUTPUT_PATH = r"F:\Local_AI\Unlimited-OCR\Tests\Outputs\Handwritten\Level-01-Clean"

print("Loading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(
    MODEL_PATH,
    trust_remote_code=True
)

print("Loading model...")
model = AutoModel.from_pretrained(
    MODEL_PATH,
    trust_remote_code=True,
    use_safetensors=True,
    dtype=torch.bfloat16
)

model = model.eval().cuda()

print("Model loaded on:", torch.cuda.get_device_name(0))
print("Starting handwriting OCR...")
print("=" * 60)

model.infer(
    tokenizer=tokenizer,
    prompt="<image>document parsing.",
    image_file=IMAGE_PATH,
    output_path=OUTPUT_PATH,
    base_size=1024,
    image_size=640,
    crop_mode=True,
    max_length=32768,
    no_repeat_ngram_size=35,
    ngram_window=128,
    save_results=True,
    temperature=0.0
)

print("=" * 60)
print("HANDWRITING OCR COMPLETE")
print("Result directory:", OUTPUT_PATH)
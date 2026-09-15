import torch
from transformers import AutoTokenizer, AutoModel

MODEL_PATH = r"F:\Local_AI\Unlimited-OCR\huggingface\hub\models--baidu--Unlimited-OCR\snapshots\07dea832e22aefee32ad281d4b80551282e1c168"

IMAGE_FILES = [
    r"F:\Local_AI\Unlimited-OCR\Test.png",
    r"F:\Local_AI\Unlimited-OCR\Test1.png",
    r"F:\Local_AI\Unlimited-OCR\Test2.png",
]

OUTPUT_PATH = r"F:\Local_AI\Unlimited-OCR\test_multi_output"

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
print("Starting MULTI-PAGE OCR...")
print("Pages:", len(IMAGE_FILES))
print("=" * 60)

model.infer_multi(
    tokenizer=tokenizer,
    prompt="<image>Multi page parsing.",
    image_files=IMAGE_FILES,
    output_path=OUTPUT_PATH,
    image_size=640,
    max_length=32768,
    no_repeat_ngram_size=35,
    ngram_window=1024,
    save_results=True,
    temperature=0.0
)

print("=" * 60)
print("MULTI-PAGE OCR COMPLETE")
print("Result directory:", OUTPUT_PATH)
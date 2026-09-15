import os
import tempfile

import fitz
import torch
from transformers import AutoTokenizer, AutoModel

MODEL_PATH = r"F:\Local_AI\Unlimited-OCR\huggingface\hub\models--baidu--Unlimited-OCR\snapshots\07dea832e22aefee32ad281d4b80551282e1c168"

PDF_PATH = r"F:\Local_AI\Unlimited-OCR\Tests\Inputs\Handwritten\personal-journal-sample.pdf"

OUTPUT_PATH = r"F:\Local_AI\Unlimited-OCR\Tests\Outputs\Handwritten\Personal-PDF-01"


def pdf_to_images(pdf_path, dpi=300):
    doc = fitz.open(pdf_path)

    temp_dir = tempfile.mkdtemp(prefix="unlimited_ocr_pdf_")
    image_paths = []

    matrix = fitz.Matrix(dpi / 72, dpi / 72)

    for i, page in enumerate(doc):
        output = os.path.join(
            temp_dir,
            f"page_{i + 1:04d}.png"
        )
        page.get_pixmap(matrix=matrix).save(output)
        image_paths.append(output)

    doc.close()

    return image_paths


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
print("Converting PDF pages to images...")

image_files = pdf_to_images(PDF_PATH, dpi=300)

print("Pages:", len(image_files))
for image in image_files:
    print(" ", image)

print("=" * 60)
print("Starting PDF MULTI-PAGE OCR...")
print("=" * 60)

model.infer_multi(
    tokenizer=tokenizer,
    prompt="<image>Multi page parsing.",
    image_files=image_files,
    output_path=OUTPUT_PATH,
    image_size=1024,
    max_length=32768,
    no_repeat_ngram_size=35,
    ngram_window=1024,
    save_results=True,
    temperature=0.0
)

print("=" * 60)
print("PDF OCR COMPLETE")
print("Result directory:", OUTPUT_PATH)
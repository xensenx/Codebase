"""Conservative, document-level cleanup. Never changes the stored raw response."""
import re

_REGION_LABELS = (
    "title|text|table|figure|image|caption|header|footer|list|formula|"
    "equation|reference|footnote|page_number|page number|"
    "abstract|paragraph|section|author|date"
)
_REGION_RE = re.compile(
    rf"(?i)(?:<\|det\|>\s*)?(?:{_REGION_LABELS})\s*"
    r"\[\s*\d{1,6}\s*,\s*\d{1,6}\s*,\s*\d{1,6}\s*,\s*\d{1,6}\s*\]"
    r"\s*(?:<\|/det\|>)?"
)
_DET_MARKER_RE = re.compile(r"<\|/?det\|>")
_IMAGE_FILENAME_RE = re.compile(
    r"(?im)^[ \t]*\d+_[0-9a-f]{6,}\.(?:png|jpe?g|webp|bmp|tiff?)"
    r"[ \t]*\r?$"
)

def clean_ocr_output(raw: str) -> str:
    """Remove only known OCR metadata patterns; preserve other content."""
    text = raw or ""
    text = _REGION_RE.sub("", text)
    text = _DET_MARKER_RE.sub("", text)
    text = _IMAGE_FILENAME_RE.sub("", text)
    # Remove only leftover whitespace-only line noise; don't collapse paragraphs.
    text = re.sub(r"[ \t]+\r?\n", "\n", text)
    text = re.sub(r"\r?\n[ \t]+", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

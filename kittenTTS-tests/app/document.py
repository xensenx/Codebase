from pathlib import Path


def extract_document(path):
    ext = path.suffix.lower()

    if ext == ".pdf":
        return extract_pdf(path)
    if ext == ".epub":
        return extract_epub(path)
    if ext in {".txt", ".md"}:
        return path.read_text(encoding="utf-8", errors="replace")

    raise ValueError(f"Unsupported document type: {ext}")


def extract_pdf(path):
    import fitz

    pages = []
    with fitz.open(path) as doc:
        for page in doc:
            text = page.get_text("text")
            if text.strip():
                pages.append(text.strip())

    return "\n\n".join(pages)


def extract_epub(path):
    from ebooklib import epub, ITEM_DOCUMENT
    from bs4 import BeautifulSoup

    book = epub.read_epub(str(path))
    sections = []

    for item in book.get_items_of_type(ITEM_DOCUMENT):
        soup = BeautifulSoup(item.get_content(), "html.parser")
        text = soup.get_text("\n", strip=True)
        if text:
            sections.append(text)

    return "\n\n".join(sections)

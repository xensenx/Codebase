from output_processor import clean_ocr_output

def test_known_metadata_removed_and_text_preserved():
    raw = """000_c9c2fb16.png
<|det|>title [85, 65, 304, 89]<|/det|>Introduction
<|det|>text [84, 328, 941, 533]<|/det|>Sound reasoning is the basis of winning at argument.
"""
    cleaned = clean_ocr_output(raw)
    assert "000_c9c2fb16.png" not in cleaned
    assert "<|det|>" not in cleaned
    assert "[85, 65, 304, 89]" not in cleaned
    assert "Introduction" in cleaned
    assert "Sound reasoning is the basis of winning at argument." in cleaned

def test_does_not_remove_normal_square_brackets():
    raw = "This is a citation [1] and a phrase [citation needed]."
    assert clean_ocr_output(raw) == raw

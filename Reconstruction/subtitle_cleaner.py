import os
import re
import glob
from pathlib import Path

# Keywords in ASS Style names that represent non-dialogue elements to exclude
EXCLUDED_STYLE_KEYWORDS = [
    'sign', 'title', 'op', 'ed', 'song', 'lyric', 
    'sfx', 'typeset', 'logo', 'sponsor', 'caption', 
    'note', 'staff', 'credit'
]

def is_dialogue_style(style_name: str) -> bool:
    """Check if the line's style is likely spoken dialogue rather than signs, lyrics, or titles."""
    style_lower = style_name.lower().strip()
    return not any(keyword in style_lower for keyword in EXCLUDED_STYLE_KEYWORDS)

def clean_dialogue_text(text: str) -> str:
    """Clean ASS/SSA dialogue line by removing override tags, line breaks, and formatting."""
    # Ignore lines that contain vector drawing tags
    if re.search(r'\{\\p[1-9]\}', text):
        return ""
        
    # Strip Aegisub override blocks like {\an7\pos(3,13)...}
    cleaned = re.sub(r'\{[^}]*\}', '', text)
    
    # Replace ASS line break codes (\N, \n) and hard spaces (\h) with a single space
    cleaned = re.sub(r'\\[Nnh]', ' ', cleaned)
    
    # Remove vector drawing paths if left behind (e.g., m 620.125 814.125 b...)
    if re.match(r'^\s*m\s+\d+', cleaned):
        return ""
        
    # Unescape remaining escaped backslashes or formatting
    cleaned = cleaned.replace('\\', '')
    
    # Collapse multiple spaces into a single space
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    
    return cleaned

def process_ass_file(file_path: Path) -> list[str]:
    """Parse an ASS file and extract clean spoken dialogue lines."""
    # Attempt reading with multiple common subtitle encodings
    content = None
    for encoding in ['utf-8-sig', 'utf-8', 'utf-16', 'cp1252', 'latin-1']:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                content = f.readlines()
            break
        except (UnicodeDecodeError, Exception):
            continue
            
    if content is None:
        print(f"[Error] Could not read file encoding for: {file_path.name}")
        return []

    dialogues = []
    in_events = False
    format_indices = {}

    for line in content:
        line_str = line.strip()

        # Track [Events] section
        if line_str.startswith('[Events]'):
            in_events = True
            continue
        elif line_str.startswith('[') and line_str.endswith(']'):
            in_events = False
            continue

        if not in_events:
            continue

        # Parse Format line to identify column indexes
        if line_str.startswith('Format:'):
            format_parts = [p.strip() for p in line_str[7:].split(',')]
            format_indices = {col.lower(): idx for idx, col in enumerate(format_parts)}
            continue

        # Parse Dialogue lines
        if line_str.startswith('Dialogue:'):
            raw_data = line_str[9:].strip()
            
            # Determine maximum split limit based on format specification
            max_splits = len(format_indices) - 1 if format_indices else 9
            parts = raw_data.split(',', max_splits)

            if len(parts) <= max_splits:
                continue

            # Default indices if Format: header wasn't standard
            style_idx = format_indices.get('style', 3)
            text_idx = format_indices.get('text', 9)

            style = parts[style_idx].strip()
            raw_text = parts[text_idx].strip()

            # Filter out non-dialogue styles (signs, OP, ED, etc.)
            if not is_dialogue_style(style):
                continue

            cleaned_text = clean_dialogue_text(raw_text)

            # Avoid empty lines and duplicate consecutive lines (caused by overlays or typesetting split)
            if cleaned_text and (not dialogues or dialogues[-1] != cleaned_text):
                dialogues.append(cleaned_text)

    return dialogues

def clean_all_subtitles(input_dir: str):
    """Process all subtitle files in the target directory and save cleaned text files."""
    target_path = Path(input_dir)
    if not target_path.exists():
        print(f"[Error] Provided directory path does not exist: {input_dir}")
        return

    # Create an output directory for cleaned text files
    output_dir = target_path / "Cleaned_Dialogues"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Search for subtitle files (.ass, .ssa, .srt)
    sub_files = sorted(list(target_path.glob("*.ass")) + list(target_path.glob("*.ssa")) + list(target_path.glob("*.srt")))

    if not sub_files:
        print(f"No subtitle files (.ass, .ssa, .srt) found in {input_dir}")
        return

    print(f"Found {len(sub_files)} subtitle files. Starting cleaning process...\n")

    for file_path in sub_files:
        print(f"Processing: {file_path.name}")
        dialogues = process_ass_file(file_path)

        # Write cleaned dialogues to text file
        output_filename = file_path.stem + "_dialogue.txt"
        output_filepath = output_dir / output_filename

        with open(output_filepath, 'w', encoding='utf-8') as out_file:
            out_file.write('\n'.join(dialogues))

        print(f"  └─ Extracted {len(dialogues)} dialogue lines -> Saved to Cleaned_Dialogues/{output_filename}")

    print(f"\n[Success] Processing complete! Cleaned text files saved in:\n{output_dir}")

if __name__ == "__main__":
    # Your specified path
    DEFAULT_DATASET_DIR = r"G:\Nao Tomori DataSet\S01 - Anime Subtitles - Preprocessing"
    clean_all_subtitles(DEFAULT_DATASET_DIR)
"""
reconstruct_flow.py
-------------------
Cleans up PDF-to-txt conversions where page markers interrupt sentence flow.

Page marker format handled:  28 | P a g e   (number | P a g e, with variable spacing)

Logic:
  - Remove page marker lines entirely
  - At each page boundary, decide: join lines (sentence continues) or keep break (sentence ended)
  - Preserve intentional blank-line paragraph breaks
  - Process single files or entire directories (batch mode for 30 volumes)

Usage:
  python reconstruct_flow.py input.txt                     # single file → input_clean.txt
  python reconstruct_flow.py input.txt -o output.txt       # single file, custom output
  python reconstruct_flow.py ./volumes/ -o ./clean/        # batch: folder → folder
  python reconstruct_flow.py ./volumes/                    # batch: outputs alongside inputs as *_clean.txt
"""

import re
import sys
import os
import argparse
from pathlib import Path


# ---------------------------------------------------------------------------
# Regex: matches the page marker in all its spacing variants
#   "28 | P a g e", "28|Page", "28 |  P  a  g  e", etc.
# ---------------------------------------------------------------------------
PAGE_MARKER_RE = re.compile(
    r'^\s*\d+\s*\|\s*P\s*a\s*g\s*e\s*$',
    re.IGNORECASE
)

# Sentence-ending punctuation (the line BEFORE the page break ended cleanly)
SENTENCE_END_RE = re.compile(r'[.!?…"\')\]—–-]\s*$')

# Abbreviations that end with a period but are NOT sentence endings
# Expand this list to match your domain (legal, medical, academic, etc.)
ABBREVIATIONS = {
    'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'etc',
    'vol', 'no', 'pp', 'ed', 'eds', 'ibid', 'op', 'cit',
    'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
    'st', 'ave', 'blvd', 'dept', 'approx', 'est', 'fig', 'govt', 'approx',
    'inc', 'ltd', 'corp', 'co', 'assoc', 'inst',
}


def is_sentence_continuation(line_before: str, line_after: str) -> bool:
    """
    Returns True  → join the two lines with a space (sentence continues)
    Returns False → keep a paragraph break (sentence ended on this page)

    Heuristic priority (top = highest confidence):
      1. line_before is empty after stripping        → keep break (blank line = para break)
      2. line_after starts with lowercase             → almost certainly a continuation
      3. line_before ends with no terminal punct      → continuation (mid-sentence cut)
      4. line_before ends with sentence punct AND
         line_after starts with uppercase             → new sentence → keep break
      5. line_before ends with period but last word
         is a known abbreviation                      → continuation
      6. line_before ends with closing quote/paren
         AND line_after starts with uppercase         → ambiguous, conservative: keep break
      7. Fallback                                     → keep break (safe default)
    """
    before = line_before.rstrip()
    after  = line_after.lstrip()

    if not before:
        return False  # blank line before page marker = intentional break

    if not after:
        return False  # nothing after = keep as-is

    # Rule 2: next line starts lowercase → definitely continuing
    if after and after[0].islower():
        return True

    # Rule 3: line_before has no terminal punctuation → mid-sentence cut
    if not SENTENCE_END_RE.search(before):
        return True

    # From here: line_before ends with sentence-like punctuation
    # Rule 5: ends with '.' but last word is an abbreviation
    if before.endswith('.'):
        last_word = re.split(r'[\s\-–—]', before.rstrip('.'))[-1].lower().rstrip('.')
        if last_word in ABBREVIATIONS:
            return True  # "Dr." mid-sentence

    # Rule 4 / Rule 6: ends with sentence punct AND next starts uppercase
    # → treat as sentence end (new paragraph or new sentence)
    if after and after[0].isupper():
        return False

    # Fallback: safe default is to keep the break
    return False


def reconstruct(text: str) -> str:
    """
    Main reconstruction pipeline.

    Pass 1 — Tag page-marker lines.
    Pass 2 — Walk line by line; at each [PAGE] tag decide join vs break.
    """

    lines = text.splitlines()

    # Pass 1: replace page marker lines with a sentinel
    SENTINEL = '\x00PAGE_BREAK\x00'
    tagged = []
    for line in lines:
        if PAGE_MARKER_RE.match(line):
            tagged.append(SENTINEL)
        else:
            tagged.append(line)

    # Pass 2: reconstruct
    result   = []
    i        = 0
    n        = len(tagged)

    while i < n:
        line = tagged[i]

        if line != SENTINEL:
            result.append(line)
            i += 1
            continue

        # We hit a page break sentinel.
        # Look backward for the last non-empty, non-sentinel content line.
        prev_content = ''
        for j in range(len(result) - 1, -1, -1):
            if result[j].strip():
                prev_content = result[j]
                break

        # Look forward for the next non-empty, non-sentinel content line.
        next_content = ''
        next_idx     = i + 1
        while next_idx < n and (tagged[next_idx] == SENTINEL or not tagged[next_idx].strip()):
            next_idx += 1
        if next_idx < n:
            next_content = tagged[next_idx]

        # Consecutive page markers (e.g. a blank page) → just skip
        if not prev_content and not next_content:
            i += 1
            continue

        if is_sentence_continuation(prev_content, next_content):
            # JOIN: remove the trailing newline of prev line by appending a
            # space-join token; the next real content line will be appended
            # directly to it.
            # Strategy: pop the last result line, store it, and when we
            # encounter the next content line we'll re-attach it.
            # Simpler: insert a special join marker.
            JOIN = '\x00JOIN\x00'
            result.append(JOIN)
        else:
            # BREAK: insert a blank line to mark paragraph boundary
            result.append('')

        i += 1

    # Pass 3: resolve JOIN markers
    final   = []
    join_next = False

    for line in result:
        if line == '\x00JOIN\x00':
            join_next = True
            continue
        if join_next and line.strip():
            # Attach to previous non-empty line
            if final:
                final[-1] = final[-1].rstrip() + ' ' + line.lstrip()
            else:
                final.append(line)
            join_next = False
        else:
            if join_next and not line.strip():
                # blank line between join marker and content — skip the blank
                continue
            final.append(line)
            join_next = False

    # Pass 4: collapse runs of 3+ blank lines down to 2 (cosmetic)
    cleaned = []
    blank_count = 0
    for line in final:
        if not line.strip():
            blank_count += 1
            if blank_count <= 2:
                cleaned.append(line)
        else:
            blank_count = 0
            cleaned.append(line)

    return '\n'.join(cleaned)


# ---------------------------------------------------------------------------
# File I/O helpers
# ---------------------------------------------------------------------------

def process_file(input_path: Path, output_path: Path) -> dict:
    """Process one file and return stats."""
    raw = input_path.read_text(encoding='utf-8', errors='replace')

    page_markers_found = len(PAGE_MARKER_RE.findall(raw, re.MULTILINE))

    result = reconstruct(raw)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(result, encoding='utf-8')

    return {
        'input':   str(input_path),
        'output':  str(output_path),
        'markers': page_markers_found,
        'in_lines':  raw.count('\n'),
        'out_lines': result.count('\n'),
    }


def process_directory(input_dir: Path, output_dir: Path | None) -> None:
    txt_files = sorted(input_dir.rglob('*.txt'))
    if not txt_files:
        print(f"No .txt files found in {input_dir}")
        return

    print(f"Found {len(txt_files)} .txt file(s) in {input_dir}\n")
    total_markers = 0

    for src in txt_files:
        if output_dir:
            # Mirror directory structure under output_dir
            relative = src.relative_to(input_dir)
            dst = output_dir / relative
        else:
            dst = src.with_stem(src.stem + '_clean')

        stats = process_file(src, dst)
        total_markers += stats['markers']
        reduction = stats['in_lines'] - stats['out_lines']
        print(f"  ✓ {stats['input']}")
        print(f"    → {stats['output']}")
        print(f"    Page markers removed: {stats['markers']}  |  Line reduction: {reduction}\n")

    print(f"Done. Total page markers removed across all files: {total_markers}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Reconstruct sentence flow across PDF page breaks in .txt files.'
    )
    parser.add_argument(
        'input',
        help='Input .txt file OR directory of .txt files'
    )
    parser.add_argument(
        '-o', '--output',
        default=None,
        help=(
            'Output file (if input is a file) or output directory (if input is a dir). '
            'Defaults to input_clean.txt or input dir with _clean suffix on filenames.'
        )
    )
    args = parser.parse_args()

    input_path = Path(args.input)

    if not input_path.exists():
        print(f"Error: '{input_path}' does not exist.")
        sys.exit(1)

    if input_path.is_dir():
        output_dir = Path(args.output) if args.output else None
        process_directory(input_path, output_dir)

    elif input_path.is_file():
        if args.output:
            output_path = Path(args.output)
        else:
            output_path = input_path.with_stem(input_path.stem + '_clean')
        stats = process_file(input_path, output_path)
        print(f"✓ Done")
        print(f"  Input : {stats['input']}  ({stats['in_lines']} lines)")
        print(f"  Output: {stats['output']} ({stats['out_lines']} lines)")
        print(f"  Page markers removed: {stats['markers']}")
        reduction = stats['in_lines'] - stats['out_lines']
        print(f"  Line reduction: {reduction}")

    else:
        print(f"Error: '{input_path}' is not a file or directory.")
        sys.exit(1)


if __name__ == '__main__':
    main()

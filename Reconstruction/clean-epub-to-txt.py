import re

# File paths
input_file = r'G:\convert.txt'
output_file = r'G:\convert_clean.txt'

# Regex pattern to match "Chapter One" through "Chapter Ten"
chapter_pattern = re.compile(
    r'^(Chapter\s+(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten))\s*$', 
    re.IGNORECASE
)

cleaned_text = ""
current_block = ""

with open(input_file, 'r', encoding='utf-8') as f:
    for line in f:
        # 1. Remove non-breaking spaces (both the unicode char and the literal string just in case)
        line = line.replace('\xa0', ' ').replace('<0xa0>', ' ')
        line = line.strip()
        
        if not line:
            continue

        # 3. Check if the line is a chapter heading
        if chapter_pattern.match(line):
            # Save the accumulated chapter text before starting a new one
            if current_block:
                cleaned_text += current_block + "\n\n"
                current_block = ""
            
            # Add the Chapter header itself
            cleaned_text += line + "\n"
        else:
            # 2. Join sentence breaks and handle hyphenated line breaks
            if current_block.endswith('-'):
                # If the previous line ended with a hyphen (e.g., "self-"), attach directly
                current_block += line
            elif current_block:
                # Otherwise, connect with a standard space
                current_block += " " + line
            else:
                # Start of a new block right after a chapter heading
                current_block = line

# Append the final accumulated block to the text
if current_block:
    cleaned_text += current_block + "\n"

# Write the clean continuous text to a new file
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(cleaned_text)

print(f"Processing complete. Cleaned file saved to: {output_file}")
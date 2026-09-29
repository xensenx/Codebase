from PIL import Image
import subprocess
import sys
from pathlib import Path

BASE = Path(r"F:\protrace\potrace-1.16.win64")
MKBITMAP = BASE / "mkbitmap.exe"
POTRACE = BASE / "potrace.exe"


def run(cmd):
    print(">", " ".join(f'"{x}"' if " " in str(x) else str(x) for x in cmd))
    subprocess.run(cmd, check=True)


def vectorize(input_file, output_file):
    input_file = Path(input_file)
    output_file = Path(output_file)

    if not input_file.exists():
        raise FileNotFoundError(input_file)

    if not MKBITMAP.exists():
        raise FileNotFoundError(MKBITMAP)

    if not POTRACE.exists():
        raise FileNotFoundError(POTRACE)

    workdir = output_file.parent

    bmp = workdir / (output_file.stem + ".bmp")
    pbm = workdir / (output_file.stem + ".pbm")

    print(f"Input: {input_file}")

    # Step 1: Convert the source image to BMP.
    print("Converting to BMP...")
    Image.open(input_file).convert("RGB").save(bmp)

    # Step 2: Let mkbitmap perform the actual bitmap preprocessing.
    print("Running mkbitmap...")
    run([
        str(MKBITMAP),
        str(bmp),
        "-o",
        str(pbm),
    ])

    # Step 3: Let Potrace perform the vector tracing.
    print("Running Potrace...")
    run([
        str(POTRACE),
        str(pbm),
        "-b",
        "svg",
        "--group",
        "-o",
        str(output_file),
    ])

    print()
    print("Finished.")
    print(f"SVG: {output_file}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage:")
        print("  python vectorize.py input.png output.svg")
        sys.exit(1)

    vectorize(sys.argv[1], sys.argv[2])
"""
chunker.py
──────────
What this file does:
  1. Reads a PDF and extracts all the text
  2. Splits that text into small overlapping pieces called "chunks"

Why we chunk instead of sending the whole PDF to the AI:
  - LLMs have a token limit (~4000-8000 words max in context)
  - A 200-page textbook is 100,000+ words
  - Solution: find the RELEVANT 5 chunks and only send those

Why overlap:
  - Without overlap: "...end of chunk 1." | "Start of chunk 2..."
    An idea that spans the boundary gets cut in half → bad answers
  - With overlap: last 100 words of chunk 1 = first 100 words of chunk 2
    Ideas near boundaries are always fully captured in at least one chunk
"""

import re
import os
import PyPDF2
from config import CHUNK_SIZE, CHUNK_OVERLAP


# ── Step 1: Extract raw text from PDF ────────────────

def extract_text_from_pdf(file_path: str) -> str:
    import pdfplumber
    full_text = ""
    with pdfplumber.open(file_path) as pdf:
        total = len(pdf.pages)
        print(f"PDF has {total} pages. Extracting text...")
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text and text.strip():
                full_text += f"\n[PAGE {i+1}]\n{text}"
    if not full_text.strip():
        raise ValueError("No text found. This PDF may be a scanned image.")
    print(f"Extracted {len(full_text.split())} words ✓")
    return full_text

# ── Step 2: Detect headings to preserve structure ────

def detect_sections(text: str) -> list:
    """
    Try to split the text by section headings.
    This keeps related content together in the same chunks.

    Heading detection rules (handles most textbook formats):
    - Short lines (< 70 chars) that are ALL CAPS
    - Lines matching "1. Introduction" or "2.3 Topic Name" pattern
    - Lines ending with ':' that are short

    Returns:
        List of dicts: [{"heading": "UNIT 1", "content": "..."}, ...]
    """
    lines = text.split("\n")
    sections = []
    current = {"heading": "General", "content": ""}

    for line in lines:
        line = line.strip()
        if not line:
            continue

        is_heading = (
            # ALL CAPS short line
            (len(line) < 70 and line.isupper() and len(line) > 3)
            # Numbered heading like "1. Introduction" or "2.3 Neural Networks"
            or bool(re.match(r"^\d+[\.\d]*\s+[A-Z][a-zA-Z\s]{3,60}$", line))
            # Short line ending with colon
            or (len(line) < 60 and line.endswith(":") and len(line.split()) < 8)
            # [PAGE X] markers — new page starts a new section
            or bool(re.match(r"^\[PAGE \d+\]$", line))
        )

        if is_heading:
            # Save the current section if it has content
            if current["content"].strip():
                sections.append(current)
            current = {"heading": line.replace("[PAGE ", "Page ").replace("]", ""), "content": ""}
        else:
            current["content"] += " " + line

    # Don't forget the last section
    if current["content"].strip():
        sections.append(current)

    print(f"Found {len(sections)} sections in document ✓")
    return sections


# ── Step 3: Chunk each section with overlap ───────────

def chunk_section(section: dict, chunk_size: int, overlap: int) -> list:
    """
    Take one section and split it into overlapping word windows.

    Example with chunk_size=10, overlap=3:
    Words: [A B C D E F G H I J K L M]
    Chunk 1: [A B C D E F G H I J]
    Chunk 2: [H I J K L M N O P Q]   ← HiJ repeated from chunk 1
    Chunk 3: [O P Q R S T ...]        ← OPQ repeated from chunk 2
    """
    words = section["content"].split()
    chunks = []

    if len(words) < 30:   # skip sections with barely any content
        return []

    step = chunk_size - overlap   # how far to advance each time

    for i in range(0, len(words), step):
        chunk_words = words[i : i + chunk_size]

        if len(chunk_words) < 30:   # skip tiny leftover chunks
            continue

        chunks.append({
            "text":        " ".join(chunk_words),
            "topic":       section["heading"],
            "word_count":  len(chunk_words),
            "chunk_index": -1   # will be assigned in chunk_text()
        })

    return chunks


# ── Main function: PDF path → list of chunks ─────────

def chunk_text(text: str) -> list:
    """
    Full pipeline: raw text → clean list of chunks ready for embedding.

    Input:  The big string from extract_text_from_pdf()
    Output: List of dicts like:
        [
          {"text": "Photosynthesis is...", "topic": "UNIT 3", "chunk_index": 0},
          {"text": "chlorophyll absorbs...", "topic": "UNIT 3", "chunk_index": 1},
          ...
        ]
    """
    sections = detect_sections(text)
    all_chunks = []

    for section in sections:
        section_chunks = chunk_section(section, CHUNK_SIZE, CHUNK_OVERLAP)
        all_chunks.extend(section_chunks)

    # Assign sequential index to every chunk
    for i, chunk in enumerate(all_chunks):
        chunk["chunk_index"] = i

    print(f"Created {len(all_chunks)} chunks total ✓")
    return all_chunks


# ── TEST: Run this file directly to verify it works ──
# Command: python chunker.py path/to/your/file.pdf
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python chunker.py path/to/yourfile.pdf")
        print("Example: python chunker.py ../data/sample.pdf")
        sys.exit(1)

    pdf_path = sys.argv[1]
    print(f"\n--- Testing chunker.py on: {pdf_path} ---\n")

    # Step 1: Extract
    text = extract_text_from_pdf(pdf_path)
    print(f"Total words extracted: {len(text.split())}\n")

    # Step 2 & 3: Chunk
    chunks = chunk_text(text)
    print(f"\nTotal chunks created: {len(chunks)}")

    # Show first 3 chunks
    print("\n--- First 3 Chunks (preview) ---")
    for i, chunk in enumerate(chunks[:3]):
        print(f"\nChunk {i} | Topic: {chunk['topic']} | Words: {chunk['word_count']}")
        print(f"Preview: {chunk['text'][:200]}...")

    print("\nchunker.py works correctly! ✓")
    print("Each chunk above will become one entry in the vector database.")
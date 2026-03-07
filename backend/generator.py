
"""
generator.py
────────────
What this file does:
  Takes the relevant chunks retrieved from FAISS and
  sends them to an LLM (Groq/LLaMA) to generate a response.

The RAG flow:
  User question
      ↓
  retriever.py finds top 5 relevant chunks
      ↓
  THIS FILE builds a prompt: "Given this context... answer this question"
      ↓
  LLM reads context + question → generates answer
      ↓
  We return the answer + which chunks were used (for source citation)

Key design decision — Hallucination Control:
  We explicitly tell the LLM in every prompt:
  "If the answer is not in the context, say so."
  This stops the AI from making things up. Very important for exam prep.
"""

from groq import Groq
from config import GROQ_API_KEY

# ── Initialize Groq client ────────────────────────────
client = Groq(api_key=GROQ_API_KEY)

# Best free model on Groq (fast + smart enough for this use case)
# Alternatives: "llama3-70b-8192" (smarter but slower), "mixtral-8x7b-32768"
MODEL = "llama-3.3-70b-versatile"


# ── Helper: Format chunks into a readable context block ──

def build_context(chunks: list) -> str:
    """
    Combine retrieved chunks into one formatted context string
    that the LLM can read.

    Example output:
        [Source 1 — Topic: UNIT 3 PHOTOSYNTHESIS]
        Photosynthesis is the process by which...

        [Source 2 — Topic: UNIT 3 PHOTOSYNTHESIS]
        Chlorophyll absorbs light energy at wavelengths...
    """
    parts = []
    for i, chunk in enumerate(chunks):
        source_label = f"[Source {i+1} — Topic: {chunk.get('topic', 'Unknown')}]"
        parts.append(f"{source_label}\n{chunk['text']}")
    return "\n\n".join(parts)


def build_sources_list(chunks: list) -> list:
    """
    Create a clean list of sources to show in the frontend.
    This is the "Source: Page 12" feature.
    """
    return [
        {
            "source_number": i + 1,
            "topic":         chunk.get("topic", "Unknown"),
            "chunk_index":   chunk.get("chunk_index", -1),
        }
        for i, chunk in enumerate(chunks)
    ]


# ── Mode 1: Answer a Question ─────────────────────────

def ask_question(query: str, chunks: list) -> dict:
    """
    Standard RAG Q&A mode.

    The prompt tells the LLM:
    - Only use the provided context
    - If the answer isn't there, say so (hallucination control)
    - Explain clearly for a student

    Returns:
        {"answer": "...", "sources": [...]}
    """
    context = build_context(chunks)

    prompt = f"""You are a helpful academic tutor helping a student understand their study material.

INSTRUCTIONS:
- Answer the question using ONLY the context provided below.
- If the answer is not found in the context, respond with exactly:
  "This topic is not covered in your uploaded material."
- Explain in simple, clear language that a student can easily understand.
- If relevant, mention key terms or definitions.

CONTEXT FROM STUDENT'S NOTES:
{context}

STUDENT'S QUESTION: {query}

YOUR ANSWER:"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=800,
        temperature=0.3,   # lower = more factual, less creative
    )

    return {
        "answer":  response.choices[0].message.content.strip(),
        "sources": build_sources_list(chunks),
    }


# ── Mode 2: Generate Exam Questions ───────────────────

def generate_exam_questions(chunks: list) -> dict:
    """
    Generates 5 possible 10-mark university exam questions
    based on the content of the retrieved chunks.

    This is the feature that makes this project unique.
    Any "chat with PDF" can answer questions.
    But generating exam questions requires understanding
    what's important — that's harder and more impressive.
    """
    context = build_context(chunks)

    prompt = f"""You are an experienced university professor setting an exam paper.

Based on the academic content below, generate exactly 5 important exam questions.
These should be suitable as 10-mark questions in a university exam.

For each question, also provide:
- A brief answer outline (3-4 bullet points) that would earn full marks

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
Q1. [Question text here]
Answer outline:
• [Key point 1]
• [Key point 2]
• [Key point 3]

Q2. [Question text here]
Answer outline:
• [Key point 1]
• [Key point 2]
• [Key point 3]

(continue for Q3, Q4, Q5)

ACADEMIC CONTENT:
{context}

EXAM QUESTIONS:"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1200,
        temperature=0.4,
    )

    return {
        "questions": response.choices[0].message.content.strip(),
        "sources":   build_sources_list(chunks),
    }


# ── Mode 3: Generate Revision Summary ─────────────────

def generate_summary(chunks: list) -> dict:
    """
    Creates a concise revision summary — like a cheat sheet.
    Perfect for the night before an exam.
    """
    context = build_context(chunks)

    prompt = f"""You are helping a student create a revision summary the night before their exam.

Based on the content below, create a concise revision summary with this exact structure:

📌 KEY CONCEPTS
(list the 5-7 most important concepts as bullet points)

📖 IMPORTANT DEFINITIONS
(list key terms and their definitions)

⚡ EXAM-READY FACTS
(list 5 specific facts, formulas, or rules worth memorizing)

🔁 COMMON EXAM TRAPS
(list 2-3 things students commonly confuse or get wrong)

Keep the entire summary under 400 words. Be concise and exam-focused.

CONTENT FROM STUDENT'S NOTES:
{context}

REVISION SUMMARY:"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=700,
        temperature=0.3,
    )

    return {
        "summary": response.choices[0].message.content.strip(),
        "sources": build_sources_list(chunks),
    }


# ── Mode 4: Viva — Get One Question ───────────────────

def get_viva_question(chunks: list, previous_questions: list = []) -> dict:
    """
    Asks ONE viva question at a time from the content.
    Like a professor conducting an oral exam.

    We pass previous_questions so it doesn't repeat.
    """
    context = build_context(chunks)
    prev_str = "\n".join(previous_questions) if previous_questions else "None yet."

    prompt = f"""You are a professor conducting a viva voce (oral exam).

Ask ONE direct viva question based on the academic content below.
The question should test conceptual understanding, not just memorization.

Rules:
- Ask only ONE question
- Keep it short (1-2 sentences)
- Don't ask questions already asked
- Don't add any explanation — just ask the question

Questions already asked (don't repeat these):
{prev_str}

CONTENT:
{context}

YOUR VIVA QUESTION:"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=100,
        temperature=0.6,   # slightly higher = more variety in questions
    )

    return {
        "question": response.choices[0].message.content.strip(),
    }


# ── Mode 4: Viva — Evaluate Student's Answer ──────────

def evaluate_viva_answer(question: str, student_answer: str, chunks: list) -> dict:
    """
    After the student answers a viva question, evaluate their response.
    Shows them what they got right, what they missed, and the correct answer.
    """
    context = build_context(chunks)

    prompt = f"""You are a strict but fair professor evaluating a student's viva answer.

QUESTION ASKED: {question}

STUDENT'S ANSWER: {student_answer}

Using the reference content below, evaluate the student's answer.

Provide your evaluation in this format:

SCORE: X/10

✅ WHAT YOU GOT RIGHT:
(mention what the student said correctly)

❌ WHAT WAS MISSING:
(mention key points the student didn't cover)

📚 COMPLETE ANSWER:
(give the correct full answer in 3-5 sentences)

💡 TIP:
(one specific advice for improvement)

REFERENCE CONTENT:
{context}"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500,
        temperature=0.2,   # very low = consistent, factual evaluation
    )

    return {
        "feedback": response.choices[0].message.content.strip(),
    }


# ── TEST: Run this file directly ──────────────────────
# IMPORTANT: You need GROQ_API_KEY in your .env file first!
# Command: python generator.py
if __name__ == "__main__":
    print("\n--- Testing generator.py ---\n")
    print("(This will make a real API call to Groq — make sure your .env is set up)\n")

    # Fake chunks (normally from retriever.py)
    test_chunks = [
        {
            "text": "Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce oxygen and energy in the form of glucose. The equation is: 6CO2 + 6H2O + light energy → C6H12O6 + 6O2. This process occurs in the chloroplasts, which contain chlorophyll.",
            "topic": "Chapter 3: Plant Biology",
            "chunk_index": 0,
        },
        {
            "text": "Chlorophyll is the green pigment in plants that absorbs light energy, primarily at wavelengths of 430nm (blue) and 680nm (red). It reflects green light, which is why plants appear green. There are two types: chlorophyll-a and chlorophyll-b.",
            "topic": "Chapter 3: Plant Biology",
            "chunk_index": 1,
        },
    ]

    print("Testing ask_question mode...")
    result = ask_question("What is photosynthesis and where does it occur?", test_chunks)
    print("ANSWER:")
    print(result["answer"])
    print("\nSOURCES:", result["sources"])
    print("\n--- generator.py works! ✓ ---")
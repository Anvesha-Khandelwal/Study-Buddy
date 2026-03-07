"""
main.py
───────
This is your FastAPI server — the brain of your backend.
Every route here is one feature your frontend can call.

To run this server from the project root:
    uvicorn main:app --reload

Then open: http://localhost:8000/docs
You'll see ALL your routes with a test UI — test everything there first!
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import shutil

# Import all your modules
from chunker import extract_text_from_pdf, chunk_text
from retriever import retriever
from generator import (
    ask_question,
    generate_exam_questions,
    generate_summary,
    get_viva_question,
    evaluate_viva_answer,
)
from config import UPLOAD_FOLDER

# ── Create the FastAPI app ────────────────────────────
app = FastAPI(
    title="AI Academic Assistant",
    description="RAG-based exam preparation system",
    version="1.0.0",
)

# ── CORS: Allow React frontend to talk to this server ─
# Without this, your browser will block all requests!
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request body models (what JSON the frontend sends) ─
class QueryRequest(BaseModel):
    query: str

class VivaEvaluateRequest(BaseModel):
    question: str
    answer: str

class VivaQuestionRequest(BaseModel):
    query: str
    previous_questions: list = []


# ═══════════════════════════════════════════════════════
#  ROUTES
# ═══════════════════════════════════════════════════════

@app.get("/")
def health_check():
    """Quick check that server is running."""
    return {
        "status": "running",
        "document_loaded": retriever.is_ready,
        "chunks_in_memory": len(retriever.chunks) if retriever.is_ready else 0,
    }


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a PDF → extract text → chunk → embed → store in FAISS.
    This is the first thing the user does.
    """
    # Validate file type
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # Save the uploaded file to disk
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    print(f"\nFile saved: {file_path}")

    # Run the full pipeline
    print("Step 1: Extracting text from PDF...")
    text = extract_text_from_pdf(file_path)

    print("Step 2: Chunking text...")
    chunks = chunk_text(text)

    if not chunks:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF. Try a different file.")

    print("Step 3: Building vector index...")
    retriever.build_index(chunks)

    print("Done! Document ready for queries.\n")

    return {
        "message": "Document processed successfully!",
        "filename": file.filename,
        "chunks_created": len(chunks),
        "topics_found": list(retriever.get_topic_frequency().keys())[:5],
    }


@app.get("/status")
def get_status():
    """Check if a document is loaded and ready."""
    if not retriever.is_ready:
        return {"ready": False, "message": "No document uploaded yet."}

    return {
        "ready": True,
        "total_chunks": len(retriever.chunks),
        "topics": retriever.get_topic_frequency(),
    }


@app.post("/ask")
def ask(request: QueryRequest):
    """Mode 1: Answer a question from the uploaded document."""
    if not retriever.is_ready:
        raise HTTPException(status_code=400, detail="Please upload a document first.")

    chunks = retriever.search(request.query)
    result = ask_question(request.query, chunks)
    return result


@app.post("/exam-questions")
def exam_questions(request: QueryRequest):
    """Mode 2: Generate 5 exam questions on a topic."""
    if not retriever.is_ready:
        raise HTTPException(status_code=400, detail="Please upload a document first.")

    chunks = retriever.search(request.query)
    result = generate_exam_questions(chunks)
    return result


@app.post("/summary")
def summary(request: QueryRequest):
    """Mode 3: Generate a revision summary for a topic."""
    if not retriever.is_ready:
        raise HTTPException(status_code=400, detail="Please upload a document first.")

    chunks = retriever.search(request.query)
    result = generate_summary(chunks)
    return result


@app.post("/viva/question")
def viva_get_question(request: VivaQuestionRequest):
    """Mode 4: Get one viva question on a topic."""
    if not retriever.is_ready:
        raise HTTPException(status_code=400, detail="Please upload a document first.")

    chunks = retriever.search(request.query)
    result = get_viva_question(chunks, request.previous_questions)
    return result


@app.post("/viva/evaluate")
def viva_evaluate(request: VivaEvaluateRequest):
    """Mode 4: Evaluate a student's viva answer."""
    if not retriever.is_ready:
        raise HTTPException(status_code=400, detail="Please upload a document first.")

    chunks = retriever.search(request.question)
    result = evaluate_viva_answer(request.question, request.answer, chunks)
    return result
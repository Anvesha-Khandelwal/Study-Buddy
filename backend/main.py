from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import shutil

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

app = FastAPI(title="AI Academic Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str

class VivaEvaluateRequest(BaseModel):
    question: str
    answer: str

class VivaQuestionRequest(BaseModel):
    query: str
    previous_questions: list = []


@app.get("/")
def health_check():
    return {
        "status": "running",
        "document_loaded": retriever.is_ready,
        "chunks_in_memory": len(retriever.chunks) if retriever.is_ready else 0,
    }


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    print(f"File saved: {file_path}")
    print("Extracting text...")
    text = extract_text_from_pdf(file_path)

    print("Chunking...")
    chunks = chunk_text(text)

    if not chunks:
        raise HTTPException(status_code=400, detail="Could not extract text. Try a different PDF.")

    print("Building vector index...")
    retriever.build_index(chunks)

    print("Done!")
    return {
        "message": "Document processed successfully!",
        "filename": file.filename,
        "chunks_created": len(chunks),
        "topics_found": list(retriever.get_topic_frequency().keys())[:5],
    }


@app.get("/status")
def get_status():
    if not retriever.is_ready:
        return {"ready": False, "message": "No document uploaded yet."}
    return {
        "ready": True,
        "total_chunks": len(retriever.chunks),
        "topics": retriever.get_topic_frequency(),
    }


@app.post("/ask")
def ask(request: QueryRequest):
    if not retriever.is_ready:
        raise HTTPException(status_code=400, detail="Please upload a document first.")
    chunks = retriever.search(request.query)
    return ask_question(request.query, chunks)


@app.post("/exam-questions")
def exam_questions(request: QueryRequest):
    if not retriever.is_ready:
        raise HTTPException(status_code=400, detail="Please upload a document first.")
    chunks = retriever.search(request.query)
    return generate_exam_questions(chunks)


@app.post("/summary")
def summary(request: QueryRequest):
    if not retriever.is_ready:
        raise HTTPException(status_code=400, detail="Please upload a document first.")
    chunks = retriever.search(request.query)
    return generate_summary(chunks)


@app.post("/viva/question")
def viva_get_question(request: VivaQuestionRequest):
    if not retriever.is_ready:
        raise HTTPException(status_code=400, detail="Please upload a document first.")
    chunks = retriever.search(request.query)
    return get_viva_question(chunks, request.previous_questions)


@app.post("/viva/evaluate")
def viva_evaluate(request: VivaEvaluateRequest):
    if not retriever.is_ready:
        raise HTTPException(status_code=400, detail="Please upload a document first.")
    chunks = retriever.search(request.question)
    return evaluate_viva_answer(request.question, request.answer, chunks)
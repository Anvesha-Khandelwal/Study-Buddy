StudyBuddy 📚
Most AI tools answer from the internet. StudyBuddy answers from your notes.
Upload any PDF — textbook, lecture slides, previous year papers — and get instant answers, exam questions, revision summaries, and viva practice. All grounded in what you actually studied.

What you can do with it

Ask questions — get answers cited from your own material
Generate exam questions — 10-mark university-style questions on any topic
Revision summary — a tight cheat-sheet for the night before
Viva practice — an AI professor that questions you and grades your answers


How it works
Your PDF → extract → chunk → embed → FAISS index
Your question → embed → similarity search → top 5 chunks → LLM → answer
Built from scratch without LangChain. Every piece is hand-rolled so I actually understand what's happening at each step.

Stack
LayerTechBackendFastAPI, PythonEmbeddingssentence-transformers (all-MiniLM-L6-v2)Vector DBFAISSLLMLLaMA 3.3 70B via Groq APIPDF parsingpdfplumberFrontendReact + Vite

Running locally
Backend
bashcd backend
python -m venv venv && .\venv\Scripts\activate  # Windows
pip install fastapi uvicorn pdfplumber sentence-transformers faiss-cpu python-multipart python-dotenv groq

# create backend/.env
echo "GROQ_API_KEY=your_key_here" > .env

uvicorn main:app --reload
Frontend
bashcd frontend
npm install && npm install axios
npm run dev
Open http://localhost:5173 — upload a PDF and start studying.

Get a free Groq API key at console.groq.com


One thing I'm proud of
Every prompt tells the LLM: "If the answer isn't in the uploaded material, say so."
This single instruction is what separates a useful study tool from a confident hallucination machine. For exam prep, a wrong answer is worse than no answer.

What's next

Persistent vector storage so re-uploading isn't needed on restart
Multi-PDF support — query across an entire semester at once
Streaming responses for faster feel
Topic frequency heatmap to predict likely exam questions



import os
from dotenv import load_dotenv

load_dotenv()  # reads your .env file automatically

# ── API Keys ──────────────────────────────────────────
# These come from your .env file — never write keys directly here
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# ── Chunking Settings ─────────────────────────────────
CHUNK_SIZE    = 600   # max words per chunk
CHUNK_OVERLAP = 100   # words shared between consecutive chunks
                      # overlap stops ideas being cut mid-sentence

# ── Retrieval Settings ────────────────────────────────
TOP_K_RESULTS = 5     # how many chunks to fetch per query
                      # 5 gives enough context without overloading the LLM

# ── Embedding Model ───────────────────────────────────
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
# Free, runs on your CPU, 384-dimensional vectors
# Good enough for a portfolio project
# Upgrade to "text-embedding-3-small" (OpenAI) for production

# ── File Paths ────────────────────────────────────────
UPLOAD_FOLDER = "../data/uploads"
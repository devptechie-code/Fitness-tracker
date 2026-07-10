"""In-memory RAG store: chunks from medical_knowledge.txt plus any PDFs the
user uploads. Retrieval is TF-IDF + cosine similarity (kept from the original
prototype — no network, no external vector DB)."""
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

CHUNK_SIZE = 1000
OVERLAP = 200

# Similarity below this means "the documents don't cover it" → the chat
# falls back to Gemini's web-search grounding instead.
RELEVANCE_THRESHOLD = 0.12

_knowledge_chunks: list[str] = []
_base_chunks: list[str] = []


def _chunk(text: str) -> list[str]:
    chunks, i = [], 0
    while i < len(text):
        chunks.append(text[i:i + CHUNK_SIZE])
        i += CHUNK_SIZE - OVERLAP
    return chunks


def load_knowledge_base():
    """Load the repo's bundled medical_knowledge.txt as the base corpus."""
    global _knowledge_chunks, _base_chunks
    path = Path(__file__).parent.parent / "medical_knowledge.txt"
    if path.exists():
        _base_chunks = _chunk(path.read_text(encoding="utf-8"))
        _knowledge_chunks = list(_base_chunks)


def add_document_text(text: str) -> int:
    """Add an uploaded document (e.g. extracted PDF text) to the corpus."""
    global _knowledge_chunks
    new_chunks = _chunk(text)
    _knowledge_chunks = _base_chunks + new_chunks if _base_chunks else new_chunks
    return len(new_chunks)


def retrieve(query: str, top_k: int = 3):
    """Return (context_text, best_similarity). Empty context if nothing relevant."""
    if not _knowledge_chunks:
        return "", 0.0
    try:
        vectorizer = TfidfVectorizer(stop_words="english")
        matrix = vectorizer.fit_transform(_knowledge_chunks + [query])
        sims = cosine_similarity(matrix[-1], matrix[:-1]).flatten()
        top = sims.argsort()[-top_k:][::-1]
        best = float(sims[top[0]]) if len(top) else 0.0
        chunks = [_knowledge_chunks[i] for i in top if sims[i] > 0.05]
        return "\n\n".join(chunks), best
    except Exception:
        return "", 0.0


load_knowledge_base()

from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from app.services.pdf_extract import extract_text_from_pdf
from app.services.chunker import chunk_text
from app.services.embeddings_gemini import embed_texts_gemini
from app.services.vectorstore import add_documents, similarity_search
import os


router = APIRouter()


class RetrieveBody(BaseModel):
    query: str | None = None
    text: str | None = None  # accept 'text' as an alias for 'query'
    topK: int | None = 5


@router.post("/retrieve")
def retrieve(body: RetrieveBody):
    try:
        if os.getenv("DEV_FORCE_OK", "0") in ("1", "true", "True"):
            q = (body.query or body.text or "").strip()
            k = int(body.topK or 5)
            return {"matches": []}
        q = (body.query or body.text or "").strip()
        k = int(body.topK or 5)
        matches = similarity_search(q, k)
        # Normalize keys for frontend
        return {
            "matches": [
                {"id": m.get("id"), "score": m.get("score"), "chunk": m.get("chunk"), "meta": m.get("meta", {})}
                for m in matches
            ]
        }
    except Exception as e:
        try:
            print("/api/kb/retrieve error:", str(e))
        except Exception:
            pass
        return {"matches": [], "error": str(e)}


class IngestBody(BaseModel):
    text: str
    filename: str | None = None


@router.post("/ingest")
def ingest_text(body: IngestBody):
    raw_text = (body.text or "").strip()
    if not raw_text:
        return {"ok": False, "ingested": 0, "detail": "No text provided"}
    # Chunk the text and embed
    chunks = chunk_text(raw_text)
    if not chunks:
        return {"ok": False, "ingested": 0, "detail": "No chunks produced"}
    embeddings = embed_texts_gemini(chunks)
    meta = {"filename": body.filename or "inline"}
    ids = add_documents(chunks, embeddings, meta)
    return {"ok": True, "ingested": len(ids), "ids": ids[:5]}


@router.get("/debug/ping")
def ping():
    return {"ok": True}


@router.post("/debug/extract")
async def debug_extract(file: UploadFile = File(...)):
    text = await extract_text_from_pdf(file)
    return {"chars": len(text or ""), "sample": (text or "")[:300]}


@router.post("/debug/embed")
def debug_embed():
    v = embed_texts_gemini(["hello world"])[0]
    return {"dim": len(v)}


@router.post("/debug/vector")
def debug_vector():
    # NOTE: 768 is common, but Gemini v004 returns 768-d; if not, adjust dims to your embed size
    ids = add_documents(["abc","def"], [[0.1]*768, [0.2]*768], {"filename":"test"})
    q = similarity_search("abc", 2)
    return {"ids": ids, "results": q}

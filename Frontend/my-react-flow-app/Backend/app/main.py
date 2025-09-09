from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.routers import kb, llm
import traceback
from app.routers import recent as recents
from app.db import init_db

app = FastAPI(title="RAG Pipeline", debug=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def unhandled_exc_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Unhandled error: {exc.__class__.__name__}: {exc}"},
    )

@app.get("/api/health")
def health():
    return {"status": "ok"}

app.include_router(kb.router, prefix="/api/kb", tags=["kb"])
app.include_router(llm.router, prefix="/api/llm", tags=["llm"])
app.include_router(recents.router, prefix="/api", tags=["recents"])


@app.on_event("startup")
def on_startup():
    try:
        init_db()
    except Exception:
        # Don't block server startup on DB init in dev
        traceback.print_exc()
from fastapi import APIRouter, HTTPException, Request
from sqlalchemy.orm import Session
from app.db import SessionLocal, init_db
from app.models.recent import RecentChat
from pydantic import BaseModel
import os

router = APIRouter()

class RecentCreate(BaseModel):
    title: str

@router.get("/recents")
def list_recents():
    if os.getenv("DEV_FORCE_OK", "0") in ("1", "true", "True"):
        return []
    db: Session | None = None
    try:
        db = SessionLocal()
        recents = db.query(RecentChat).order_by(RecentChat.created_at.desc()).limit(20).all()
        return [{"id": r.id, "title": r.title, "created_at": r.created_at} for r in recents]
    except Exception as e:
        # Ensure tables exist and return empty list instead of 500
        try:
            init_db()
        except Exception:
            pass
        try:
            print("/api/recents GET error:", str(e))
        except Exception:
            pass
        return []
    finally:
        try:
            db and db.close()
        except Exception:
            pass

@router.post("/recents")
async def add_recent(request: Request):
    # Accept both JSON body {"title": "..."} and query param ?title=
    title_value = None
    try:
        body = await request.json()
        if isinstance(body, dict):
            title_value = body.get("title")
    except Exception:
        title_value = None
    if not title_value:
        title_value = request.query_params.get("title")
    if not title_value:
        raise HTTPException(status_code=400, detail="Missing 'title'")

    db: Session | None = None
    try:
        db = SessionLocal()
        item = RecentChat(title=str(title_value))
        db.add(item)
        db.commit()
        db.refresh(item)
        return {"id": item.id, "title": item.title, "created_at": item.created_at}
    except Exception as e:
        try:
            init_db()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            db and db.close()
        except Exception:
            pass

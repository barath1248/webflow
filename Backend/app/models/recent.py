from sqlalchemy import Column, Integer, String, DateTime, func
from app.db import Base

class RecentChat(Base):
    __tablename__ = "recent_chats"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

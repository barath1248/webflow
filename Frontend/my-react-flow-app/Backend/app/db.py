import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


# Use Postgres if DATABASE_URL is provided; otherwise default to local SQLite
# Build an absolute path for SQLite to avoid cwd-specific issues
_env_database_url = os.getenv("DATABASE_URL")
if _env_database_url:
    DATABASE_URL = _env_database_url
else:
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    sqlite_path = os.path.join(base_dir, "app.db")
    # Normalize to forward slashes for SQLAlchemy URL compatibility on Windows
    sqlite_path = sqlite_path.replace("\\", "/")
    DATABASE_URL = f"sqlite:///{sqlite_path}"

# SQLite needs special connect args for check_same_thread in many FastAPI setups
is_sqlite = DATABASE_URL.startswith("sqlite:")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if is_sqlite else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    # Import models so they are registered with SQLAlchemy metadata
    from app.models import recent  # noqa: F401
    Base.metadata.create_all(bind=engine)



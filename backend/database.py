from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import Base

# Import models so SQLAlchemy registers them
import backend.models

# Always point at the project-root strategy.db regardless of working directory.
# Using a relative URL ("sqlite:///strategy.db") breaks when uvicorn is launched
# from a sub-directory (e.g. the Claude worktree).
_DB_PATH = Path(__file__).resolve().parent.parent / "strategy.db"
DATABASE_URL = f"sqlite:///{_DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def init_db():
    """
    Create all database tables if they do not exist.
    """
    Base.metadata.create_all(bind=engine)
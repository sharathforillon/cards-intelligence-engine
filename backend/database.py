from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import Base

# Import models so SQLAlchemy registers them
import backend.models


DATABASE_URL = "sqlite:///strategy.db"

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
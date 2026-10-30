"""SQLite database connection and session management for ShopSphere."""

import os
from contextlib import contextmanager
from typing import Generator, Optional
from sqlalchemy import create_engine, Engine, event
from sqlalchemy.orm import sessionmaker, Session
from .models import Base

DEFAULT_DB_URL = os.environ.get("SHOPSPHERE_DB_URL", "sqlite:///shopsphere.db")

_engine: Optional[Engine] = None
_session_factory: Optional[sessionmaker[Session]] = None


def get_engine(db_url: Optional[str] = None) -> Engine:
    """Return singleton or configured SQLAlchemy Engine.

    Configures SQLite foreign key pragma on connect.
    """
    global _engine, _session_factory
    url = db_url or DEFAULT_DB_URL

    # If asking for a custom URL (e.g. during testing) or engine not yet created
    if _engine is None or db_url is not None:
        engine = create_engine(
            url,
            connect_args={"check_same_thread": False} if url.startswith("sqlite") else {},
            echo=False,
        )

        # Ensure foreign keys are enforced in SQLite
        if url.startswith("sqlite"):
            @event.listens_for(engine, "connect")
            def set_sqlite_pragma(dbapi_connection, connection_record):
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA foreign_keys=ON;")
                cursor.close()

        if db_url is None:
            _engine = engine
            _session_factory = sessionmaker(
                autocommit=False, autoflush=False, expire_on_commit=False, bind=_engine
            )
        return engine

    return _engine


def get_session_factory(engine: Optional[Engine] = None) -> sessionmaker[Session]:
    """Return sessionmaker bound to current engine."""
    global _session_factory
    eng = engine or get_engine()
    if _session_factory is None or engine is not None:
        factory = sessionmaker(
            autocommit=False, autoflush=False, expire_on_commit=False, bind=eng
        )
        if engine is None:
            _session_factory = factory
        return factory
    return _session_factory



def create_tables(engine: Optional[Engine] = None) -> None:
    """Create all database tables defined in metadata."""
    eng = engine or get_engine()
    Base.metadata.create_all(bind=eng)


def drop_tables(engine: Optional[Engine] = None) -> None:
    """Drop all tables (primarily for clean testing)."""
    eng = engine or get_engine()
    Base.metadata.drop_all(bind=eng)


@contextmanager
def get_db_session(engine: Optional[Engine] = None) -> Generator[Session, None, None]:
    """Provide a transactional database session scope."""
    factory = get_session_factory(engine)
    session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

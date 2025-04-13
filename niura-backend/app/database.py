from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Get current user for PostgreSQL connection
current_user = os.environ.get('USER', os.environ.get('USERNAME', 'postgres'))

# Database URL for PostgreSQL
# In production, use environment variables for sensitive information
DATABASE_URL = os.getenv("DATABASE_URL", f"postgresql://{current_user}@localhost/niura_db")

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

# Dependency for getting DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 
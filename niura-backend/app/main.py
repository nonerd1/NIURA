from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine
from . import models
from .routers import auth, metrics

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="NIURA API",
    description="REST API for NIURA brain-computer interface app",
    version="0.1.0"
)

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:19006",  # React Native web
    "exp://localhost:19000",   # Expo
    "https://*.loca.lt",       # Localtunnel domains
    "*",                       # Allow all origins for development (remove in production)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(metrics.router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to NIURA API",
        "docs": "/docs",
        "redoc": "/redoc"
    } 
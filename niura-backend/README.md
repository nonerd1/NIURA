# NIURA FastAPI Backend

This is the FastAPI backend for the NIURA brain-computer interface app.

## Features

- User authentication with JWT
- Secure password hashing
- API endpoints for BCI metrics storage and retrieval
- PostgreSQL database integration

## Prerequisites

- Python 3.8+
- PostgreSQL

## Setup

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up PostgreSQL:
    - Install PostgreSQL if not already installed: `brew install postgresql`
    - Start PostgreSQL service: `brew services start postgresql`
    - Create a database user if needed
    - Update the database URL in `app/database.py` if necessary

4. Initialize the database:
```bash
python setup_db.py
```

## Running the Server

```bash
# For development
./run.sh

# Or manually
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

Once the server is running, you can access:
- Interactive API docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user
- `POST /auth/token` - Login and get access token

### Metrics

- `POST /metrics` - Save new metrics
- `GET /metrics` - Get all metrics for current user
- `GET /metrics/today` - Get today's metrics
- `GET /metrics/range` - Get metrics for a date range
- `GET /metrics/average` - Get average metrics

## Frontend Integration

The React Native app connects to this backend using the API service in `src/services/api.ts`. 
#!/bin/bash

# Activate the virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up the database
python setup_db.py

# Start the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# Deactivate virtual environment on exit
trap "deactivate" EXIT
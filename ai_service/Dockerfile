# AI Microservice — Slim build without tensorflow
FROM python:3.10-slim

WORKDIR /app

# System dependencies needed for numpy/scipy build
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Cache pip install layer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Create model directory
RUN mkdir -p /app/saved_models

EXPOSE 8001

# Train models on first start if not present, then serve
CMD ["sh", "-c", "python train_on_start.py && uvicorn main:app --host 0.0.0.0 --port 8001 --workers 1"]

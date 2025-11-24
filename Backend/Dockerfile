# Base Python image
FROM python:3.10-slim

# Set the working directory
WORKDIR /app

# Copy the requirements file and install dependencies
# This step is crucial for the memory-heavy packages (Whisper, Sentence-Transformers)
COPY Backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend application code
COPY Backend/ .

# Set the environment variable for the port
ENV PORT 8000

# Command to run the application using Uvicorn (FastAPI server)
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

# syntax=docker/dockerfile:1

FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir "vision-agents[getstream,openai]" python-dotenv

COPY main.py feedback.py instruction_language.py pronunciation.py ./

ENV PORT=8000
EXPOSE 8000

# Set at runtime: STREAM_API_KEY, STREAM_API_SECRET, OPENAI_API_KEY
CMD ["python", "main.py", "serve-cmd", "--host", "0.0.0.0", "--port", "8000"]

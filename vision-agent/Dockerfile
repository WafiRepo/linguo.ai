# syntax=docker/dockerfile:1

FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir "vision-agents[getstream,openai]" python-dotenv

COPY main.py feedback.py instruction_language.py pronunciation.py ./

ENV PORT=8000
EXPOSE 8000

# Railway/Fly inject PORT at runtime
CMD ["sh", "-c", "python main.py serve --host 0.0.0.0 --port ${PORT:-8000}"]

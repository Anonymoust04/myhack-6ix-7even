FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

# Cloud Run sets PORT env var
ENV PORT=8080
EXPOSE 8080

CMD exec gunicorn ecolink.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 2 \
    --threads 4
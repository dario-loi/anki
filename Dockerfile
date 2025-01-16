
FROM python:3.11-alpine

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apk add --no-cache --virtual .build-deps \
    gcc \
    libc-dev \
    libffi-dev \
    musl-dev \
    make \
    && apk add --no-cache bash

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

RUN apk del .build-deps

COPY . .

RUN mkdir -p decks

EXPOSE 8000

CMD ["uvicorn", "web:app", "--host", "0.0.0.0", "--port", "8000"]

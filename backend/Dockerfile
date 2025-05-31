FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV UV_SYSTEM_PYTHON=1

# Install system dependencies, including postgresql-client
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

WORKDIR /app/

# Install uv
RUN pip install uv

# First, copy only the pyproject.toml to leverage Docker layer caching for dependencies
COPY ./pyproject.toml ./pyproject.toml

# Install dependencies using uv
RUN uv pip install --system .

# Copy the rest of the application code
COPY ./app /app/app
COPY ./cli.py /app/cli.py
COPY ./schema.postgresql /app/schema.postgresql
COPY ./prestart.sh /app/prestart.sh
COPY ./app/data /app/data

ENV PYTHONPATH=/app

CMD ["fastapi", "run", "--workers", "4", "app/main.py"]

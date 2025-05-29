FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV UV_SYSTEM_PYTHON=1
# Tell uv to use the system python it finds, not manage its own shims for now

WORKDIR /app/

# Install uv
RUN pip install uv

# First, copy only the pyproject.toml to leverage Docker layer caching for dependencies
COPY ./pyproject.toml ./pyproject.toml

# Install dependencies using uv
# This will install based on pyproject.toml
# Add --system if you want to ensure it installs into the global site-packages of this Python env
RUN uv pip install --system .
# The dot indicates to install the current project defined by pyproject.toml

# Copy the rest of the application code
COPY ./app /app/app
COPY ./cli.py /app/cli.py
COPY ./schema.postgresql /app/schema.postgresql
COPY ./prestart.sh /app/prestart.sh
COPY ./app/data /app/data

# Ensure quotes.csv is still downloaded (this line is from your original Dockerfile)
# Consider moving this to prestart.sh or an entrypoint script if it needs to be more dynamic
# or if the file is very large and changes often, to avoid invalidating Docker cache layers unnecessarily.
# RUN curl --location -o /app/quotes.csv https://huggingface.co/datasets/jstet/quotes-500k/resolve/main/quotes.csv # Removed, as populate_db.py uses quotes_sample.csv

ENV PYTHONPATH=/app

# Your CMD remains the same, assuming FastAPI and other necessary packages are correctly installed by uv.
# If you define a script in [project.scripts] like `backend-cli = "app.cli:main"`,
# you could also run it via `uv run backend-cli` or similar, but for FastAPI, this is fine.
CMD ["fastapi", "run", "--workers", "4", "app/main.py"]

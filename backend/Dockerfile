FROM python:3.13

ENV PYTHONUNBUFFERED=1

WORKDIR /app/

COPY ./requirements.txt ./requirements.txt

RUN python -m pip install -r requirements.txt

ENV PYTHONPATH=/app

COPY ./app /app/app

COPY ./prestart.sh /app/prestart.sh

CMD ["fastapi", "run", "--workers", "4", "app/main.py"]

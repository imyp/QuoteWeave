FROM python:3.13

ENV PYTHONUNBUFFERED=1

WORKDIR /app/

RUN curl --location -o /app/quotes.csv https://huggingface.co/datasets/jstet/quotes-500k/resolve/main/quotes.csv

COPY ./requirements.txt ./requirements.txt

RUN python -m pip install -r requirements.txt

ENV PYTHONPATH=/app

COPY ./app /app/app

COPY ./cli.py /app/cli.py

COPY ./schema.postgresql /app/schema.postgresql

COPY ./prestart.sh /app/prestart.sh

CMD ["fastapi", "run", "--workers", "4", "app/main.py"]

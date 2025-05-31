# QuoteWeave

QuoteWeave: a site to create, find, and share quotes.

## Quirks

- If "could not validate credentials", it means that the JWT token has expired and that you need to log out and log in again.
- You can only delete and edit a quote if the username matches the author exactly.
- The user password (`password_hash` in the diagram and schema) is hashed. For demonstration purposes, this hashing is deterministic due to the use of static salts, which is not secure for production.

## Demo Credentials

For demonstration purposes, you can use the following credentials:
- **Username**: user
- **Email**: user@example.com
- **Password**: 123abc@XYZ

## Database Model (E/R Diagram)

![Entity/Relationship Diagram for QuoteWeave](diagram/diagram_v1.png)

The relations are shown below:

```
Author(aid:int, name:str)
User(aid:int, email:str, password_hash:str)
Collection(cid:int, aid:int, name:str, desc:str, pub:bool)
Quote(qid:int, aid:int, text:str, pub:bool, embedding:list[float])
TaggedAs(qid:int, tid:int)
Tag(tid:int, name:str)
Favorites(aid:int, qid:int)
```

## How to compile and run our web-app

### Prerequisites
- Docker
- Docker Compose

### Compilation & Initialization
The application is containerized using Docker. The database schema is defined in `backend/schema.postgresql` and initial data population is handled by scripts.

To build and run the application:

1.  **Build and Run with Docker Compose**:
    Open a terminal in the project's root directory (where `docker-compose.yml` is located) and run:
    ```bash
    docker-compose up -d --build
    ```
    This command will:
    *   Build the Docker images for the backend and frontend.
    *   Start the services (application, database).
    *   The `backend/prestart.sh` script will automatically run, which:
        *   Initializes the database schema using `backend/schema.postgresql`.
        *   Populates the database with sample data via `python cli.py populate-full`.
        *   Creates a default admin user.

### How to Interact with Our Web-App
Once the `docker-compose up` command completes successfully:
- The web application will be accessible at [http://localhost:3000](http://localhost:3000).
- The backend API will be accessible at [http://localhost:8000](http://localhost:8000) (with API docs at [http://localhost:8000/docs](http://localhost:8000/docs)).

## Web-app Features

The QuoteWeave web application:

-   **Interacts with the database via SQL**: The backend application uses SQL to perform CRUD (Create, Read, Update, Delete) operations on entities such as Quotes, Collections, Users, Authors, and Tags. These database interactions are managed by custom CRUD functions in `backend/app/crud.py` which use the `psycopg` library to directly execute SQL statements.
-   **Performs regular expression matching**: The application supports regular expression matching for searching collections. (This was a feature recently added to the backend).

## Project Repository
The git repository for this project contains all source code, the E/R diagram, and this README file.
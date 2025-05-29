import logging  # Added for logging
import os  # Added for path joining
from typing import List

import numpy as np  # Added for array operations
import pandas as pd  # Added pandas
from fastembed import TextEmbedding

from app.model import CSVMockQuote  # Import the new model

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variable for the embedding model
embedding_model: TextEmbedding | None = None  # Type hint for clarity

# Global store for quotes and their embeddings from CSV
# Using Dict[int, CSVMockQuote] to store quotes by their original CSV ID if available and unique,
# otherwise, we might need to use a list and rely on index.
# For simplicity, let's assume we'll use a list of CSVMockQuote objects.
CSV_QUOTES_DATA: List[CSVMockQuote] = []
CSV_QUOTE_EMBEDDINGS: np.ndarray | None = (
    None  # Store as a single numpy array for efficient similarity calculation
)

# Path to the CSV file - constructing it relative to this file's directory might be fragile.
# It's often better to use absolute paths derived from a base project directory or environment variables.
# For this example, let's assume it's in backend/data/
# The 'backend' directory is the workspace root for this operation.
CSV_FILE_PATH = os.path.join(
    "data", "quotes_sample.csv"
)  # Relative to 'backend' directory


def load_embedding_model():
    """Loads the FastEmbed TextEmbedding model."""
    global embedding_model
    if embedding_model is None:
        logger.info("Loading FastEmbed model...")
        try:
            embedding_model = TextEmbedding()
            logger.info(
                f"FastEmbed model loaded. Default: {embedding_model.model_name}"
            )
        except Exception as e:
            logger.error(f"Error loading FastEmbed model: {e}")
            raise RuntimeError(f"Failed to initialize FastEmbed model: {e}")


def load_quotes_and_generate_embeddings():
    """Loads quotes from CSV and generates their embeddings."""
    global CSV_QUOTES_DATA, CSV_QUOTE_EMBEDDINGS, embedding_model

    if embedding_model is None:
        load_embedding_model()  # Ensure model is loaded

    if not os.path.exists(CSV_FILE_PATH):
        logger.warning(
            f"Mock data file not found: {CSV_FILE_PATH}. App will run without mock quote data."
        )
        CSV_QUOTES_DATA = []
        CSV_QUOTE_EMBEDDINGS = None
        return

    try:
        logger.info(f"Loading quotes from {CSV_FILE_PATH}...")
        df = pd.read_csv(CSV_FILE_PATH)
        df = df.fillna(
            ""
        )  # Replace NaN with empty strings for Pydantic model compatibility

        # Validate and store quotes
        # Keep track of texts for batch embedding
        quote_texts_for_embedding = []
        valid_quotes_temp = []

        for index, row in df.iterrows():
            try:
                # Ensure 'ID' is int if present, handle potential float from pandas
                row_dict = row.to_dict()
                if "ID" in row_dict and pd.notna(row_dict["ID"]):
                    try:
                        row_dict["ID"] = int(row_dict["ID"])
                    except ValueError:
                        logger.warning(
                            f"Skipping row {index} due to invalid ID: {row_dict['ID']}. Must be integer."
                        )
                        continue  # Skip this row
                else:
                    row_dict["ID"] = None  # or provide a default, e.g., index

                quote_model = CSVMockQuote(**row_dict)
                valid_quotes_temp.append(quote_model)
                quote_texts_for_embedding.append(
                    quote_model.Quote
                )  # Use the 'Quote' field for embedding
            except (
                Exception
            ) as e:  # Catch Pydantic validation errors or others
                logger.warning(
                    f"Skipping row {index} due to data validation error: {e}. Data: {row.to_dict()}"
                )

        CSV_QUOTES_DATA = valid_quotes_temp

        if CSV_QUOTES_DATA and embedding_model:
            logger.info(
                f"Generating embeddings for {len(CSV_QUOTES_DATA)} quotes..."
            )
            # FastEmbed's embed method expects an iterable of documents.
            embeddings_generator = embedding_model.embed(
                quote_texts_for_embedding
            )
            # Convert generator to a list of numpy arrays, then stack into a single 2D numpy array
            embedding_list = [emb for emb in embeddings_generator]
            if embedding_list:
                CSV_QUOTE_EMBEDDINGS = np.array(embedding_list)
                logger.info(
                    f"Embeddings generated and stored. Shape: {CSV_QUOTE_EMBEDDINGS.shape}"
                )
            else:
                logger.warning("No embeddings were generated.")
                CSV_QUOTE_EMBEDDINGS = None
        else:
            logger.info(
                "No quotes loaded or embedding model not available, skipping embedding generation."
            )
            CSV_QUOTE_EMBEDDINGS = None

    except FileNotFoundError:
        logger.warning(
            f"Mock data file not found at {CSV_FILE_PATH}. No mock quotes will be loaded."
        )
        CSV_QUOTES_DATA = []
        CSV_QUOTE_EMBEDDINGS = None
    except Exception as e:
        logger.error(
            f"Error processing CSV file or generating embeddings: {e}"
        )
        CSV_QUOTES_DATA = []  # Clear data on error
        CSV_QUOTE_EMBEDDINGS = None
        # Optionally re-raise or handle as a critical startup error


def generate_embedding(text: str) -> List[float] | None:
    """
    Generates an embedding for a single text string using FastEmbed.
    Returns None if embedding generation fails or model is unavailable.
    """
    if embedding_model is None:
        try:
            load_embedding_model()
        except RuntimeError:
            logger.error(
                "Embedding model could not be loaded for generate_embedding."
            )
            return None

    if not text or not isinstance(text, str):
        logger.warning(
            "Empty or invalid text provided for embedding. Returning None."
        )
        return None

    try:
        if embedding_model is None:  # Double check after load attempt
            logger.error(
                "Embedding model is not available after load attempt in generate_embedding."
            )
            return None

        embedding_generator = embedding_model.embed([text])
        embedding_array = next(embedding_generator, None)

        if embedding_array is not None:
            return embedding_array.tolist()
        else:
            logger.warning("FastEmbed returned no embedding for the text.")
            return None
    except Exception as e:
        logger.error(f"Error during FastEmbed embedding generation: {e}")
        return None  # Return None on error instead of raising, to allow graceful failure


def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Generates embeddings for a batch of text strings using FastEmbed.
    Returns empty list if generation fails.
    """
    if embedding_model is None:
        try:
            load_embedding_model()
        except RuntimeError:
            logger.error(
                "Embedding model could not be loaded for generate_embeddings_batch."
            )
            return []

    if not texts or not all(
        isinstance(t, str) and t for t in texts
    ):  # ensure strings are not empty
        logger.warning(
            "Invalid input for batch embedding (empty list or non-string/empty elements). Returning empty list."
        )
        return []

    if embedding_model is None:
        logger.error(
            "Embedding model is not available after load attempt in generate_embeddings_batch."
        )
        return []

    try:
        embeddings_generator = embedding_model.embed(texts)
        # Filter out None embeddings if any happened, though FastEmbed usually yields arrays
        return [
            emb.tolist() for emb in embeddings_generator if emb is not None
        ]
    except Exception as e:
        logger.error(f"Error during FastEmbed batch embedding generation: {e}")
        return []  # Return empty list on error


def search_similar_quotes(
    query_text: str, top_n: int = 10
) -> List[CSVMockQuote]:
    """
    Searches for quotes similar to the query_text using embeddings.
    This version is conceptual and demonstrates how one might structure a query
    for pgvector. It does not execute the query.
    """
    if not CSV_QUOTES_DATA:  # Keep this check for the conceptual structure
        logger.info(
            "No mock quote data available to conceptually search against. "
            "In a real scenario, this check might be different or removed if DB is primary source."
        )
        return []

    query_embedding_list = generate_embedding(query_text)
    if query_embedding_list is None:
        logger.warning(
            "Could not generate embedding for query. Cannot perform search."
        )
        return []

    # Convert list to string format for pgvector query
    query_embedding_str = str(query_embedding_list)

    # Conceptual pgvector query
    # This is NOT executable code as-is. It's a string representing a SQL query.
    # You would use a library like psycopg2 or SQLAlchemy to execute this.
    # Assumes a table named 'items' with an 'embedding' column of type 'vector'.
    pgvector_query = f"SELECT id, quote, author, tags, 1 - (embedding <=> '{query_embedding_str}') AS cosine_similarity FROM items ORDER BY cosine_similarity DESC LIMIT {top_n};"

    logger.info(
        f"Conceptual pgvector query for similarity search: {pgvector_query}"
    )
    logger.info(
        "This function is conceptual and does not execute the database query. "
        "Actual database interaction code is required to fetch results."
    )

    # Since we are not executing the query, we return an empty list.
    # In a real implementation, you would execute the query and process the results.
    # For example, results would be fetched and mapped to CSVMockQuote objects.
    return []


# Ensure model and data are loaded at module import time if not already handled by main.py startup
# However, it's better to trigger this from main.py's startup event for FastAPI apps.
# load_quotes_and_generate_embeddings() # Call this from main.py startup

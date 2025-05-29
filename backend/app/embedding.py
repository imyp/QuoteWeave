from typing import Iterable, List  # Iterable for embed method

from fastembed import TextEmbedding

# Global variable for the embedding model
embedding_model: TextEmbedding | None = None  # Type hint for clarity
# Default model is BAAI/bge-small-en-v1.5, dim 384.
# Fastembed handles model download and caching.
# For GPU, ensure fastembed-gpu is installed and CUDA is available.
# We can specify providers=["CUDAExecutionProvider"] for explicit GPU.


def load_embedding_model():
    """Loads the FastEmbed TextEmbedding model."""
    global embedding_model
    if embedding_model is None:
        print(f"Loading FastEmbed model...")
        try:
            # Initialize with default model. To use GPU explicitly:
            # embedding_model = TextEmbedding(providers=["CUDAExecutionProvider"])
            # For auto-detection with fastembed-gpu, just TextEmbedding() should work.
            embedding_model = TextEmbedding()
            print(
                f"FastEmbed model loaded. Default: {embedding_model.model_name}"
            )
            # You can check available providers: print(embedding_model.model.get_providers())
        except Exception as e:
            print(f"Error loading FastEmbed model: {e}")
            # Potentially fallback to CPU or raise if GPU was intended but failed
            # embedding_model = TextEmbedding(providers=["CPUExecutionProvider"])
            # print(f"Fell back to CPU for FastEmbed: {e}")
            raise RuntimeError(f"Failed to initialize FastEmbed model: {e}")


def generate_embedding(text: str) -> List[float]:
    """
    Generates an embedding for a single text string using FastEmbed.
    Loads the model if it hasn't been loaded yet (lazy loading).
    """
    if embedding_model is None:
        load_embedding_model()

    if not text or not isinstance(text, str):
        print(
            "Warning: Empty or invalid text provided for embedding. Returning zero vector."
        )
        # Assuming BAAI/bge-small-en-v1.5 (dim 384) as default
        return [0.0] * 384

    # FastEmbed's embed method expects an iterable of documents and returns a generator of numpy arrays.
    # We are processing a single document.
    try:
        # The embed method returns a generator. Get the first (and only) item.
        # It yields numpy.ndarray, so convert to list.
        # Make sure to handle the case where embedding_model might still be None if load_model failed silently
        if (
            embedding_model is None
        ):  # Should be caught by load_embedding_model raising error
            raise RuntimeError(
                "Embedding model is not available after load attempt."
            )

        embedding_generator = embedding_model.embed([text])
        embedding_array = next(embedding_generator, None)

        if embedding_array is not None:
            return embedding_array.tolist()
        else:
            print(
                "Warning: FastEmbed returned no embedding for the text. Returning zero vector."
            )
            return [0.0] * 384
    except Exception as e:
        print(f"Error during FastEmbed embedding generation: {e}")
        # Fallback or re-raise
        raise RuntimeError(f"Failed to generate embedding: {e}")


def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Generates embeddings for a batch of text strings using FastEmbed.
    Loads the model if it hasn't been loaded yet.
    """
    if embedding_model is None:
        load_embedding_model()

    if not texts or not all(isinstance(t, str) for t in texts):
        print(
            "Warning: Invalid input for batch embedding. Returning empty list."
        )
        return []

    if embedding_model is None:
        raise RuntimeError(
            "Embedding model is not available after load attempt."
        )

    try:
        embeddings_generator = embedding_model.embed(texts)
        return [emb.tolist() for emb in embeddings_generator]
    except Exception as e:
        print(f"Error during FastEmbed batch embedding generation: {e}")
        raise RuntimeError(f"Failed to generate batch embeddings: {e}")


# Note: If you consistently process one text at a time, generate_embedding is fine.
# If you often process multiple (e.g., in backfill), generate_embeddings_batch would be more efficient.
# The backfill logic in cli.py currently calls generate_embedding for each quote.
# It could be optimized to collect a batch of quotes and use generate_embeddings_batch.

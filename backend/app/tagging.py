import torch
from transformers import (
    AutoTokenizer,
    # BitsAndBytesConfig,
    T5ForConditionalGeneration,
)

REPO_NAME = "fristrup/flan-t5-semantic-tagger-small"
TOKENIZER_NAME = "google/flan-t5-small"
# QUANTIZATION_CONFIG = BitsAndBytesConfig(
#     load_in_4bit=True,
#     bnb_4bit_compute_dtype=torch.float16,
#     bnb_4bit_use_double_quant=True,
#     device_map="cpu",
#     bnb_4bit_quant_type="nf4",
# )

# Global variables for the model and tokenizer.
# Lazy loading is implemented in predict_tags.
tokenizer: AutoTokenizer | None = None
model: T5ForConditionalGeneration | None = None


def load_model():
    """Loads the model and tokenizer."""
    global tokenizer, model
    if tokenizer is None or model is None:
        tokenizer = AutoTokenizer.from_pretrained(
            TOKENIZER_NAME, use_fast=True
        )
        model = T5ForConditionalGeneration.from_pretrained(
            REPO_NAME,
            # quantization_config=QUANTIZATION_CONFIG,
            torch_dtype=torch.float16,
            device_map="cpu",  # Automatically select device (CPU/GPU)
        )
        model.config.no_repeat_ngram_size = 2  # Prevents repeating 2-grams
        model.config.repetition_penalty = 2.0  # Penalizes token repetition
        model.config.diversity_penalty = (
            0.0  # No diversity penalty to trigger beam search
        )
        model.config.num_beam_groups = 1  # Diverse beam groups
        model.config.num_beams = 5  # Beam search for better quality
    # Ensure model is in evaluation mode if not training
    model.eval()


def create_input_text(quote: str, author: str) -> str:
    """Create the input text with descriptive prompt."""
    return f'What tags or categories would best describe this quote: "{quote}" by {author}? Provide comma-separated tags.'


def predict_tags(text: str, max_length: int = 128) -> list[str]:
    """
    Generate tags for a given text using the loaded model and tokenizer.
    Loads the model and tokenizer if they haven't been loaded yet (lazy loading).
    """
    if model is None or tokenizer is None:
        # Lazy load the model if it's not already loaded.
        print("Lazy loading ML model...")
        load_model()
        print("ML model loaded.")
        # load_model() will raise an error if it fails, so no need to re-check here.

    # Prepare the input
    inputs = tokenizer(
        text, return_tensors="pt", truncation=True, max_length=512
    )
    input_ids = inputs.input_ids

    # Move to the same device as model
    device = model.device
    input_ids = input_ids.to(device)

    # Generate tags
    with torch.no_grad():
        outputs = model.generate(
            input_ids=input_ids,
            max_length=max_length,
            early_stopping=True,
        )

    # Decode the generated tokens
    predicted_tags_str = tokenizer.decode(outputs[0], skip_special_tokens=True)

    # Clean up tags - split by comma and strip whitespace
    tags = [
        tag.strip() for tag in predicted_tags_str.split(",") if tag.strip()
    ]

    # Remove duplicates while preserving order
    unique_tags = []
    for tag in tags:
        if tag not in unique_tags:
            unique_tags.append(tag)

    return unique_tags


# Model and tokenizer are now lazy-loaded by the `predict_tags` function
# when the tagging functionality is first used.

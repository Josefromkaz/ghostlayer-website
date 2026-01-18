# GhostLayer MVP - Anonymization Pipeline Contract

**Purpose**: This document defines the internal contract for the core anonymization pipeline. As a monolithic application, this is not a network API but a key internal function signature.

## Function: `anonymize_text`

This function serves as the single entry point for the entire three-stage anonymization process.

### Signature
```python
from typing import List, Dict, Any

def anonymize_text(original_text: str) -> Dict[str, Any]:
    """
    Processes the original text through the full anonymization pipeline.

    Args:
        original_text: The raw text content from the user's document.

    Returns:
        A dictionary containing the results of the anonymization,
        structured as follows:
        {
            "anonymized_text": str,  # The fully masked text.
            "entities": List[Dict[str, Any]], # List of all entities found.
            "stats": Dict[str, int] # Statistics about the process.
        }
    """
    pass
```

### Return Value Details

#### `anonymized_text`
- A string where all identified sensitive data has been replaced with placeholder "chips" (e.g., `[PERSON_1]`, `[ORG_1]`).

#### `entities`
A list of dictionaries, where each dictionary represents a single identified entity.
```python
[
    {
        "id": "PERSON_1",       # The placeholder chip used in the text.
        "original_text": "John Doe",  # The text that was masked.
        "category": "Person",       # e.g., "Person", "Organization", "Phone", "Email"
        "source_stage": "NLP",      # "Regex", "NLP", or "Memory"
        "is_masked": True         # Boolean indicating if it's currently masked.
    },
    # ... more entities
]
```
This structure provides the "Inspector" panel with all the information it needs to display the list of found entities and allow the user to toggle their `is_masked` state.

#### `stats`
A dictionary containing simple statistics about the run.
```python
{
    "total_words": 1024,
    "entities_found": 15,
    "processing_time_ms": 1245
}
```
This can be used for debugging or displaying performance information.

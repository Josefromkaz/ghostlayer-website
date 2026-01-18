# Quickstart: GhostLayer MVP

**Purpose**: This guide provides instructions for setting up the development environment and running the GhostLayer application.

## 1. Prerequisites
- Python 3.11+
- `pip` (Python package installer)

## 2. Environment Setup

It is highly recommended to use a virtual environment to manage project dependencies.

```bash
# 1. Create a virtual environment
python -m venv .venv

# 2. Activate the virtual environment
# On Windows (PowerShell/CMD)
.venv\Scripts\activate
# On macOS/Linux
source .venv/bin/activate
```

## 3. Install Dependencies

Install all required packages using the `requirements.txt` file (which will be created in a later step). For now, the dependencies as defined by the constitution and plan are:

```bash
pip install flet natasha spacy pymupdf pyperclip pytest
```

Additionally, the `spacy` models need to be downloaded:
```bash
python -m spacy download en_core_web_sm
```
*Note: The Natasha model does not require a separate download as its components are included in the library.*

## 4. Database Setup

The application uses a local SQLite database (`ghostlayer.db`). No setup is required. The database file will be created automatically in the root directory on the first run, and the necessary tables (`learning_rules`, `prompts`) will be initialized by the application logic.

## 5. Running the Application

The main entry point for the application will be in `src/main.py`.

```bash
python src/main.py
```

## 6. Running Tests

Tests are located in the `tests/` directory and are run using `pytest`.

```bash
pytest
```
This command will automatically discover and run all test files in the `tests/` directory.

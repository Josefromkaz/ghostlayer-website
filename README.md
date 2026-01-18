# GhostLayer v1.0

[![License](https://img.shields.io/badge/license-Proprietary-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-blue.svg)](https://www.microsoft.com/windows)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![Tests](https://img.shields.io/badge/tests-154%2F157%20passing-green.svg)](tests/)

GhostLayer is a desktop application for Windows designed for the **secure anonymization of confidential documents** before they are sent to public AI services like ChatGPT or Claude. It works **completely offline**, allowing lawyers, analysts, and other professionals to hide PII, commercial secrets, and other sensitive data while preserving the document's context.

**Key Feature:** The "Learning System" — a user can manually hide any word or phrase, and the program will remember this rule for all future documents (PRO feature).

**Security First:** 100% offline, zero telemetry, documents processed in memory only (never saved to disk).

## Features

### Core Functionality
- **Simple File Import**: Process PDF, TXT, and DOCX files via the "Open File" button
- **Side-by-Side View**: Instantly compare the original document with the anonymized version with synchronized scrolling
- **Multi-stage Anonymization Pipeline**:
  1. **Regex** — Hard patterns (emails, phones, bank cards, crypto addresses, etc.)
  2. **NLP** — Named entity recognition (Natasha for Russian, SpaCy for English)
  3. **Memory Rules** — User-defined learning rules (PRO feature)

### Interactive Tools
- **Interactive Learning (PRO)**: Click on any text in the original to add it to the "Remember Forever" list
- **Entity Inspector**: View all detected entities, toggle visibility, temporarily unmask for current session
- **Prompt Library**: Create and manage custom prompts for different AI services
- **Re-identification Panel**: Restore masked entities in AI-generated responses

### Security & Privacy
- **100% Offline**: No network communication, all processing is local
- **Zero Data Policy**: Documents processed in memory only, never persisted to disk
- **AES-256-GCM Encryption**: User rules encrypted with machine-bound keys
- **No Telemetry**: No analytics, no crash reporting, no data collection

### Supported Data Types
- Personal: Names, Organizations
- Contact: Emails, Phone numbers (international + Kazakhstan)
- Financial: Bank cards, IBANs, Bitcoin/Ethereum addresses
- Legal: IINs (Kazakhstan), Passport numbers, Legal case numbers
- Medical: OSMS policy numbers
- Real Estate: Cadastral numbers
- Other: Dates, Addresses

See [RELEASE_NOTES_v1.0.0.md](RELEASE_NOTES_v1.0.0.md) for full feature list.

## Tech Stack

- **GUI Framework**: [Flet](https://flet.dev/) (based on Flutter)
- **Language**: Python 3.11+
- **NLP**: [Natasha](https://github.com/natasha/natasha) (for Russian), [SpaCy](https://spacy.io/) (for English)
- **Document Parsing**: [PyMuPDF](https://github.com/pymupdf/PyMuPDF)
- **Database**: SQLite
- **Testing**: `pytest`

## Getting Started

### 1. Prerequisites
- Python 3.11+
- `pip` (Python package installer)

### 2. Installation

It is highly recommended to use a virtual environment.

```bash
# Clone the repository
git clone <repository_url>
cd <repository_name>

# Create and activate a virtual environment
python -m venv .venv
# On Windows
.venv\Scripts\activate
# On macOS/Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download the SpaCy language model
python -m spacy download en_core_web_sm
```

### 3. Running the Application

```bash
python src/main.py
```

### 4. Running Tests

```bash
python -m pytest tests/ -v
```

Expected result: 154/157 tests passing (3 failures are related to PRO license-gated features)

---

## For End Users (Binary Distribution)

### Download & Install

1. Download `GhostLayer_v1.0.0_Windows_x64.zip` from [releases page]
2. Extract to any folder
3. Run `GhostLayer_Final_v2.exe`
4. If Windows SmartScreen warning appears: Click "More info" → "Run anyway"

**System Requirements:**
- Windows 10/11 (64-bit)
- 4 GB RAM (8 GB recommended)
- 1 GB free disk space

### Quick Start Guide

1. Launch the application
2. Click "Open File" and select a PDF/TXT/DOCX document
3. Wait for anonymization (1-5 seconds typically)
4. Review the anonymized text in the right panel
5. Click "Copy to Clipboard" to copy the result
6. Paste into ChatGPT/Claude or your AI service of choice

See [RELEASE_NOTES_v1.0.0.md](RELEASE_NOTES_v1.0.0.md) for detailed usage instructions.

---

## Documentation

- [Production Checklist](PRODUCTION_CHECKLIST.md) — Pre-release checklist
- [Build Instructions](BUILD_INSTRUCTIONS.md) — How to build exe from source
- [Cleanup Instructions](CLEANUP_INSTRUCTIONS.md) — Repository cleanup guide
- [Release Notes](RELEASE_NOTES_v1.0.0.md) — Full release notes for v1.0.0
- [Changelog](CHANGELOG.md) — Version history
- [Security Whitepaper](docs/SECURITY_WHITEPAPER.md) — Security architecture details
- [Privacy Policy](docs/PRIVACY_POLICY.md) — Privacy and data handling

---

## License

GhostLayer is proprietary software. See [LICENSE](LICENSE) for details.

**License Modes:**
- **FREE**: Basic anonymization (Regex + NLP), unlimited documents
- **PRO**: All features + Memory Rules (learning system)
- **TRIAL**: 14-day trial of PRO features

---

## Support & Feedback

- **Bug Reports**: [GitHub Issues](https://github.com/[your-repo]/issues)
- **Email**: support@ghostlayer.app (TBD)
- **Documentation**: See `docs/` folder

---

## Contributing

This is a proprietary project. For development instructions, see:
- [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md)
- [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)

---

## Security

Found a security vulnerability? Please contact security@ghostlayer.app (TBD) instead of opening a public issue.

---

**Made with focus on security and privacy. Your data stays yours. Always.**

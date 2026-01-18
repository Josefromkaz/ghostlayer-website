# Changelog — GhostLayer

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - TBD (Release Candidate)

### Added
- **Core Anonymization Pipeline**: Multi-stage anonymization using Regex, NLP (Natasha for Russian, SpaCy for English), and user-defined memory rules
- **Simple File Import**: Process PDF, TXT, and DOCX files via the "Open File" button
- **Side-by-Side View**: Real-time synchronized comparison of original and anonymized text
- **Interactive Learning System**: Click any text in the original to add it to the "Remember Forever" list (PRO feature)
- **Entity Inspector**: View, toggle, and temporarily unmask detected entities
- **Prompt Library**: Create, edit, and manage custom prompts for different AI services
- **Re-identification Panel**: Restore masked entities in AI-generated responses
- **Offline-First**: 100% offline operation — no network communication
- **Encryption**: AES-256-GCM encryption for user rules with machine-bound keys
- **Dark Mode**: Full dark theme support with smooth transitions
- **Session Logging**: Export session logs for debugging (in-memory only, zero data on disk)
- **Anti-Backdating**: License validation with system clock tampering detection
- **Splash Screen**: Professional loading screen during app startup

### Security
- **Zero Data Policy**: Documents processed in memory only, never persisted to disk
- **Machine-Bound Encryption**: User rules encrypted with device-specific keys
- **No Telemetry**: No analytics, no crash reporting, no data collection
- **License Validation**: Offline-first license system with anti-tampering measures

### Supported File Formats
- PDF (via PyMuPDF)
- TXT (UTF-8)
- DOCX (via python-docx)

### Supported Languages
- **Russian**: Full support with Natasha NLP
- **English**: Full support with SpaCy NLP
- **Mixed Content**: Auto-detection and processing

### Detected Entity Types
- **Personal Data**: Names (PERSON), Organizations (ORG)
- **Contact Info**: Emails, phone numbers (international and Kazakhstan formats)
- **Financial**: Bank cards, IBANs, cryptocurrency addresses (Bitcoin, Ethereum)
- **Legal**: IINs (Kazakhstan ID), passport numbers, legal case numbers
- **Medical**: OSMS policy numbers
- **Real Estate**: Cadastral numbers
- **Dates**: Various date formats
- **Addresses**: Full address parsing (street, city, etc.)

### License Modes
- **FREE**: Basic anonymization (Regex + NLP), unlimited documents
- **PRO**: All features + Memory Rules (learning system)
- **TRIAL**: 14-day trial of PRO features
- **TEAM**: Multi-seat licenses (future)

### Known Limitations
- Windows only (current build)
- Requires Python 3.11+ for development
- SpaCy model must be downloaded separately (`python -m spacy download en_core_web_sm`)
- No auto-update mechanism (manual installation required)

---

## [Unreleased]

### Planned for v1.1
- [ ] Custom placeholder names (e.g., rename `[PERSON_1]` to `[DIRECTOR]`)
- [ ] Export/import anonymization maps for session persistence
- [ ] Regex pattern caching for better performance
- [ ] macOS and Linux builds
- [ ] Auto-update mechanism (with user consent)
- [ ] Code signing for Windows exe

### Under Consideration
- [ ] Anonymous crash reporting (opt-in only)
- [ ] Cloud sync for Memory Rules (encrypted, opt-in)
- [ ] Batch processing mode
- [ ] API for integration with other tools

---

## Development Changelog (Pre-Release)

### [MVP] - 2024-12-XX
- Initial MVP implementation
- Core features implemented according to spec
- 154/157 tests passing (3 failures related to license-gated features)

---

## Notes

- Version 1.0.0 is the first public release
- All PRE-1.0 changes are considered internal development

---

**For detailed technical changes, see `PLAN_POST_MVP.md` and Git commit history.**

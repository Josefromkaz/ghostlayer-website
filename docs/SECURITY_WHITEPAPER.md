# Security Whitepaper — GhostLayer

**Version:** 1.0
**Date:** December 2024
**Classification:** Public

---

## Executive Summary

GhostLayer is a desktop application for document anonymization that prioritizes security and privacy through a **zero-trust, offline-first architecture**. This document details the security measures implemented to protect user data.

**Key Security Properties:**
- 100% offline operation — no network communication
- Documents processed in memory only — never persisted
- User rules encrypted with AES-256-GCM
- Machine-bound encryption keys

---

## 1. Threat Model

### 1.1 What We Protect Against

| Threat | Mitigation |
|--------|------------|
| Data exfiltration to external servers | No network access; fully offline |
| Unauthorized access to saved rules | AES-256-GCM encryption |
| Cross-device rule theft | Machine-specific key derivation |
| Memory forensics after session | Document data not persisted; garbage collection on close |
| Malicious file input | Input validation; sandboxed parsing |

### 1.2 What Is Out of Scope

| Threat | Reason |
|--------|--------|
| Compromised operating system | OS-level security is user's responsibility |
| Physical access to unlocked device | Standard endpoint security applies |
| Screen capture/shoulder surfing | User environment responsibility |
| Clipboard interception | OS-level concern |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     GhostLayer Application                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   UI Layer  │  │  Processing │  │   Database Layer    │  │
│  │   (Flet)    │  │   Pipeline  │  │   (SQLite + AES)    │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         ▼                ▼                     ▼             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Memory Only                          ││
│  │         (Documents never touch disk)                    ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Local Encrypted Storage                    ││
│  │   %APPDATA%\GhostLayer\ghostlayer.db                   ││
│  │   %APPDATA%\GhostLayer\.encryption_key                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
          │
          ▼
    ┌───────────┐
    │  NETWORK  │  ← NO CONNECTION (offline only)
    └───────────┘
```

---

## 3. Data Flow Security

### 3.1 Document Processing

```
User drops file
       │
       ▼
┌──────────────────┐
│ File Validation  │ ← Extension check, size limit (50MB)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Content Parsing  │ ← PyMuPDF (PDF) or UTF-8/CP1251 (TXT)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  RAM Processing  │ ← Text stored in memory ONLY
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Anonymization    │ ← Three-stage pipeline
│ Pipeline         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Display in UI    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ User closes doc  │ ← gc.collect() called
└────────┬─────────┘
         │
         ▼
   Memory released
```

**Security guarantees:**
- Original document content is **never** written to disk
- No temporary files are created
- Memory is explicitly released via `gc.collect()` on document close

### 3.2 Data Classification

| Data Type | Storage | Encryption | Persistence |
|-----------|---------|------------|-------------|
| Document content | RAM only | N/A | Session only |
| Anonymization rules | SQLite | AES-256-GCM | Permanent |
| Prompts | SQLite | None (not sensitive) | Permanent |
| Encryption key | File | Protected by machine ID | Permanent |

---

## 4. Encryption Implementation

### 4.1 Algorithm Selection

| Component | Algorithm | Key Size | Rationale |
|-----------|-----------|----------|-----------|
| Rule encryption | AES-256-GCM | 256 bits | Industry standard, authenticated encryption |
| Key derivation | PBKDF2-HMAC-SHA256 | 256 bits | 100,000 iterations, resistant to brute force |
| Nonce generation | CSPRNG | 96 bits | Unique per encryption operation |

### 4.2 Key Management

#### Key Generation
```python
# Simplified representation of key generation process

def generate_master_key():
    return secrets.token_bytes(32)  # 256 bits from CSPRNG

def derive_protection_key(machine_id, salt):
    return pbkdf2_hmac(
        hash_name='sha256',
        password=machine_id,
        salt=salt,
        iterations=100000,
        dklen=32
    )
```

#### Machine ID Composition
The machine identifier is derived from:
```
SHA256(
    platform.node() +        # Computer name
    platform.system() +      # OS (Windows/Linux/Mac)
    platform.machine() +     # Architecture
    getpass.getuser() +      # Username
    Path.home()              # Home directory path
)
```

This binding ensures:
- Keys are **not portable** between machines
- Database theft without the original machine is useless
- No external key server required

#### Key Storage
```
Location: %APPDATA%\GhostLayer\.encryption_key

Format: [16-byte salt] + [32-byte XOR-protected key]

Protection:
- File permissions: 0600 (Unix) / Owner-only (Windows)
- Key XORed with PBKDF2-derived protection key
```

### 4.3 Encryption Process

```
Plaintext rule
      │
      ▼
┌─────────────────┐
│ Generate nonce  │ ← 12 random bytes (CSPRNG)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AES-256-GCM     │ ← Authenticated encryption
│ Encrypt         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Base64 encode   │ ← nonce + ciphertext + tag
└────────┬────────┘
         │
         ▼
  Store in SQLite
```

### 4.4 Fallback Mode

If the `cryptography` library is unavailable:
- System falls back to XOR + Base64 obfuscation
- Warning is logged
- User is notified that full encryption is not available

---

## 5. Anonymization Pipeline Security

### 5.1 Three-Stage Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                  PRIORITY ORDER                          │
│                                                          │
│  1. MEMORY RULES (Highest)                              │
│     └─ User-defined patterns from encrypted DB          │
│                    │                                     │
│                    ▼                                     │
│  2. REGEX PATTERNS (Medium)                             │
│     └─ 58 built-in patterns for PII detection           │
│                    │                                     │
│                    ▼                                     │
│  3. NLP MODELS (Lowest)                                 │
│     └─ Natasha (RU) + SpaCy (EN) entity recognition    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Pattern Categories

| Category | Examples | Count |
|----------|----------|-------|
| Contact info | Email, phone numbers | 4 |
| Financial | Credit cards, IBAN, bank accounts | 3 |
| Government IDs | Passport (RF/KZ), SNILS, INN, IIN/BIN | 6 |
| Addresses | Streets, postal codes | 2 |
| Dates | Birth dates, document dates | 1 |
| Organizations | Company names, government bodies | 3 |
| Internet | URLs | 1 |

### 5.3 Overlap Resolution

When multiple patterns match the same text region:
1. Longer matches take priority
2. Memory rules override automatic detection
3. No double-masking occurs

---

## 6. Input Validation

### 6.1 File Validation

| Check | Limit | Rationale |
|-------|-------|-----------|
| File extension | `.pdf`, `.txt` only | Prevent arbitrary file parsing |
| File size | 50 MB maximum | Prevent memory exhaustion |
| File existence | Must exist | Prevent path traversal |

### 6.2 Content Validation

- PDF parsing via PyMuPDF (sandboxed, well-tested library)
- Text encoding detection with fallback (UTF-8 → CP1251)
- No execution of embedded content (macros, scripts)

---

## 7. Network Security

### 7.1 Zero Network Policy

GhostLayer makes **zero network connections**:

- No update checks
- No telemetry
- No license validation
- No cloud sync
- No analytics

### 7.2 Verification

Users can verify this by:
1. Running the application with network disabled
2. Monitoring with tools like Wireshark or Little Snitch
3. Reviewing the open-source code (if published)

---

## 8. Build and Distribution Security

### 8.1 Build Process

```
Source Code
     │
     ▼
┌─────────────────┐
│   PyInstaller   │ ← Single-file executable
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Code Signing   │ ← EV/OV Certificate (recommended)
└────────┬────────┘
         │
         ▼
  Distribution
```

### 8.2 Recommendations for Distribution

- [ ] Sign executable with EV Code Signing Certificate
- [ ] Publish SHA-256 checksums
- [ ] Distribute via official website only
- [ ] Consider open-sourcing for transparency

---

## 9. Known Limitations

| Limitation | Description | Mitigation |
|------------|-------------|------------|
| Clipboard exposure | Copied text goes to OS clipboard | User responsibility; clear clipboard after use |
| Screen capture | UI content can be captured | Use in secure environment |
| Memory dump | RAM can be dumped by privileged process | OS-level security |
| Regex false positives | Some patterns may over-match | Manual review in UI |

---

## 10. Compliance Mapping

### GDPR (EU)

| Article | Requirement | GhostLayer Compliance |
|---------|-------------|----------------------|
| 5(1)(f) | Integrity and confidentiality | AES-256-GCM encryption |
| 25 | Data protection by design | Offline-only, no collection |
| 32 | Security of processing | Encryption, access controls |
| 35 | DPIA requirement | Not required (no high-risk processing) |

### 152-FZ (Russia)

| Requirement | GhostLayer Compliance |
|-------------|----------------------|
| Data localization | All processing on user's device in RF |
| Consent | No data collection = no consent needed |
| Security measures | Encryption implemented |

---

## 11. Security Contact

To report security vulnerabilities:

- **Email:** [security@your-domain.com]
- **PGP Key:** [link to PGP key]
- **Response time:** 48 hours for initial acknowledgment

We follow responsible disclosure practices.

---

## 12. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | December 2024 | Initial release |

---

## Appendix A: Cryptographic Parameters

```
Algorithm:          AES-256-GCM
Key size:           256 bits
Nonce size:         96 bits (12 bytes)
Tag size:           128 bits (16 bytes)
KDF:                PBKDF2-HMAC-SHA256
KDF iterations:     100,000
Salt size:          128 bits (16 bytes)
```

## Appendix B: File Locations

| Platform | Database | Key File |
|----------|----------|----------|
| Windows | `%APPDATA%\GhostLayer\ghostlayer.db` | `%APPDATA%\GhostLayer\.encryption_key` |
| Linux | `~/.local/share/GhostLayer/ghostlayer.db` | `~/.local/share/GhostLayer/.encryption_key` |
| macOS | `~/Library/Application Support/GhostLayer/ghostlayer.db` | `~/Library/Application Support/GhostLayer/.encryption_key` |

---

*This document is provided for informational purposes. Security is a shared responsibility between the application and the user's environment.*

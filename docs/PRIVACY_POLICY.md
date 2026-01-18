# Privacy Policy — GhostLayer

**Effective Date:** December 2024
**Last Updated:** December 2024

## 1. Introduction

GhostLayer ("the Application", "we", "our") is a desktop application designed to anonymize sensitive information in documents before sharing them with third-party AI services. This Privacy Policy explains how we handle your data.

**Key Principle: Your data never leaves your device.**

## 2. Data We DO NOT Collect

GhostLayer is designed with privacy as a core principle. We do **not**:

- Collect, transmit, or store your documents on any external server
- Send any data over the internet
- Track your usage or behavior
- Collect analytics or telemetry
- Access your contacts, location, or other personal information
- Require user registration or accounts

## 3. Data Processed Locally

The following data is processed **exclusively on your local device**:

### 3.1 Documents
- Documents you load into the application (PDF, TXT) are processed in memory
- Document content is **never** written to disk or any database
- When you close a document or the application, all document data is permanently erased from memory

### 3.2 User-Defined Anonymization Rules
- Custom rules you create (words/phrases to always anonymize) are stored locally
- Storage location: `%APPDATA%\GhostLayer\ghostlayer.db` (Windows)
- Rules are encrypted using AES-256-GCM encryption
- Encryption keys are derived from your machine's unique identifiers and never transmitted

### 3.3 Prompt Library
- Custom prompts you save are stored in the same local database
- Prompts are not encrypted as they do not contain sensitive personal data

## 4. Data Security

### 4.1 Encryption
- User-defined rules are encrypted with AES-256-GCM
- Encryption keys are machine-specific and stored locally with restricted file permissions
- See our [Security Whitepaper](SECURITY_WHITEPAPER.md) for technical details

### 4.2 No Network Access
- GhostLayer does not require an internet connection
- The application makes **zero** network requests
- No data is ever transmitted to us or any third party

## 5. Third-Party Services

GhostLayer does **not** integrate with or send data to any third-party services. The application is fully self-contained and operates entirely offline.

## 6. Data Retention

| Data Type | Retention Period |
|-----------|------------------|
| Loaded documents | Until document is closed or app exits |
| Anonymization rules | Until you manually delete them |
| Prompt library | Until you manually delete them |

## 7. Your Rights

You have complete control over your data:

- **Access**: All your data is stored locally on your device
- **Deletion**: Use the in-app memory management to delete rules, or delete the database file directly
- **Portability**: Your database file can be backed up (note: encrypted rules are machine-specific)

### GDPR Compliance (EU Users)
Since no personal data is collected or transmitted by us, GDPR data subject rights (access, rectification, erasure, portability) are satisfied by your direct control over local files.

### 152-FZ Compliance (Russian Federation)
The application processes personal data exclusively on the user's device without transmission to third parties, satisfying localization requirements.

## 8. Children's Privacy

GhostLayer does not knowingly collect any data from children under 13 years of age. Since no data is collected at all, this concern does not apply.

## 9. Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be reflected in the "Last Updated" date. Continued use of the application after changes constitutes acceptance.

## 10. Contact Us

If you have questions about this Privacy Policy:

- **Email:** [your-email@example.com]
- **GitHub:** [your-github-repo]
- **Website:** [your-website.com]

---

## Summary

| Question | Answer |
|----------|--------|
| Do you collect my data? | **No** |
| Do you send data to servers? | **No** |
| Are my documents stored? | **No** (memory only) |
| Can I use it offline? | **Yes** (fully offline) |
| Is my data encrypted? | **Yes** (AES-256-GCM for rules) |

---

*This Privacy Policy is provided in good faith. GhostLayer is designed to protect your privacy by keeping all data processing local to your device.*

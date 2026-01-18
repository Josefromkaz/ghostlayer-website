# GhostLayer Desktop v2.0

![License](https://img.shields.io/badge/license-Proprietary-red.svg)
![Status](https://img.shields.io/badge/status-Alpha-orange.svg)

**GhostLayer Desktop** is an offline-first, privacy-centric redaction tool designed for legal and corporate environments. It uses advanced NLP and regex pattern matching to automatically identifying and remove PII (Personally Identifiable Information) from documents.

## 🚀 Key Features

*   **Offline-First:** All processing happens locally on your device. No data ever leaves your computer.
*   **Smart Redaction:** Automatically detects names, emails, phones, SSN, EIN, and more.
*   **Entity Consistency:** Ensures "Michael J. Fox" and "Michael Fox" are treated as the same person throughout the document.
*   **Custom Rules:** Add your own Regex patterns with built-in ReDoS protection.
*   **PDF Support:** Native PDF text extraction and processing.

## 🛠️ Installation & Development

### Prerequisites
*   Node.js 18+
*   npm 9+

### Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd ghostlayer-desktop

# Install dependencies
npm install
```

### Development Commands

```bash
# Run in development mode (Vite + Electron)
npm run dev:electron

# Run tests
npm test

# Run type checking
npx tsc --noEmit
```

### Building for Production

```bash
# Build for your current OS
npm run build
```

## 🏗️ Architecture

*   **Frontend:** React, TypeScript, Tailwind CSS, Zustand
*   **Backend:** Electron (Main Process), Node.js
*   **Engine:** Custom Redaction Engine (`src/services/redactionEngine.ts`) with zero external NLP dependencies for maximum speed.

## 🔒 Security

*   **Memory Hygiene:** Sensitive data is cleared from RAM on window close.
*   **ReDoS Protection:** Custom regexes are validated before execution.
*   **File Limits:** 10MB (Text) / 50MB (PDF) hard limits.

## 📄 License

Proprietary software. Unauthorized copying or distribution is strictly prohibited.

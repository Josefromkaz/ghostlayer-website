# GhostLayer Desktop v2.0.1 - DOCX Support & Polish

## 🚀 New Features

### DOCX Support
- Added native support for **Microsoft Word (.docx)** files.
- Drag & Drop or use the "Open File" button to redact Word documents directly.
- Uses `mammoth.js` for clean text extraction.

### UI Improvements
- **Default Font:** Changed to **Lora** (Serif) for better readability of legal documents.
- **Context Menus:** Improved positioning logic to prevent menus from clipping off-screen.
- **Selection Popover:** Smarter positioning (flips up/down and aligns left/right/center) to stay within the viewport.

## 🐛 Bug Fixes & Improvements

- **Whitelist Logic:** Improved suppression logic. Whitelisted phrases now strictly prevent System and Custom patterns from triggering overlaps in that range.
- **Memory Rules:** User Memory rules now correctly bypass whitelist suppression (User intent > System safety).
- **Conflict Resolution:** Fixed a UI issue where the conflict resolution modal (Whitelist vs Memory) could appear off-center.

## 📦 Installation

**Requirements:**
- Windows 10/11 (64-bit)

**Install:**
1. Download `GhostLayer_Setup_2.0.1.exe`
2. Run installer
3. Enjoy the new features!

---

## 🔒 Security Reminder
- All processing remains **100% offline**.
- No data leaves your device.

# Feature Specification: GhostLayer MVP 1.0

**Feature Branch**: `001-ghostlayer-mvp`  
**Created**: 2025-12-06  
**Status**: Draft  
**Input**: User description: "# Project: GhostLayer (MVP 1.0) ## 1. Overview Настольное приложение (Windows) для безопасной анонимизации конфиденциальных документов..."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Core Anonymization Workflow (Priority: P1)
As a user, I want to drag and drop a document into the app, see the original and anonymized versions side-by-side with synchronized scrolling, and have the ability to save a missed sensitive word as a permanent rule for future documents.

**Why this priority**: This is the fundamental value proposition of the application. Without this core workflow, the product has no purpose.

**Independent Test**: A user can successfully drop a PDF file, see both original and masked text, scroll both views in sync, and add a new word to the anonymization memory. The result can be copied or downloaded.

**Acceptance Scenarios**:
1. **Given** the application is open, **When** a user drags a `.pdf` or `.txt` file onto the window, **Then** the system processes the document and displays the original and anonymized text in a split view.
2. **Given** a document is loaded, **When** the user scrolls the original text view, **Then** the anonymized text view scrolls proportionally and in real-time.
3. **Given** a sensitive word was missed by automatic detection, **When** the user clicks the word in the original text and selects "Remember Forever", **Then** the word is added to the user's permanent anonymization rules and is masked in the current and all future documents.

---

### User Story 2 - Data and Prompt Management (Priority: P2)
As a user, I want to manage the list of automatically detected entities, allowing me to selectively un-mask some of them. I also want to manage a personal library of prompts that can be quickly copied with the anonymized text.

**Why this priority**: This gives the user fine-grained control, increasing accuracy and adapting the tool to their specific needs, which is a key feature.

**Independent Test**: A user can view a list of all entities found in a document, uncheck one, see it reappear in the result view, add a new prompt to their library, and use it.

**Acceptance Scenarios**:
1. **Given** a document is processed, **When** the user views the list of found entities (e.g., People, Organizations), **Then** they can uncheck a specific entity (e.g., "John Doe"). The corresponding mask (`[PERSON_1]`) in the result view is then replaced with the original text ("John Doe").
2. **Given** the prompt library is visible, **When** the user adds a new custom prompt, **Then** it is saved and appears in their library for all future sessions.
3. **Given** a document is anonymized, **When** the user selects a prompt and clicks the "Copy" button, **Then** the prompt text and the anonymized document text are copied to the clipboard together.

---

### User Story 3 - Application State Management (Priority: P3)
As a user, I want to be able to clear the current document and start fresh, ensuring the application remains fast and responsive without needing a restart.

**Why this priority**: This ensures a smooth user experience for power users processing multiple documents in a single session, preventing memory leaks or slowdowns.

**Independent Test**: A user can load and anonymize a large document, then click the "New Document" button, and the interface returns to its initial state, ready for a new file, with memory usage returning to baseline.

**Acceptance Scenarios**:
1. **Given** a document is currently loaded and displayed, **When** the user clicks the "New Document" button, **Then** all text views are cleared, and the application returns to its initial drag-and-drop screen.
2. **Given** a large document was processed, **When** the user clicks "New Document", **Then** the memory allocated for the previous document and its analysis is released.

---

### Edge Cases
- **What happens when** an encrypted or password-protected PDF is dropped? The system should display a user-friendly error message stating the file cannot be processed.
- **How does the system handle** extremely large files (e.g., >100MB or >1 million words)? The system should display a progress indicator and remain responsive. If it's too large to handle, it should fail gracefully with a message.
- **What happens if** a document is in a completely unsupported language? The system should still perform the Regex and Memory-based rule matching, even if the NLP models do not apply.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: The system MUST accept `.pdf` and `.txt` files via drag-and-drop.
- **FR-002**: The system MUST display the original and anonymized document text in a side-by-side, synchronously scrolling view.
- **FR-003**: The system MUST apply anonymization rules in a strict, three-stage pipeline: 1. Pattern-based rules (Regex), 2. Language models (NLP), 3. User-defined rules (Memory).
- **FR-004**: User-defined rules MUST have the highest priority, overriding any conflicting results from the other two stages.
- **FR-005**: The system MUST be able to identify and mask common sensitive patterns, including phone numbers, emails, and national identification numbers for РФ/РК.
- **FR-006**: The system MUST be able to identify and mask person (PER) and organization (ORG) names in both Russian and English text.
- **FR-007**: The system MUST allow a user to add a word from the original text to a persistent, user-specific database of anonymization rules.
- **FR-008**: The system MUST provide a list of all identified entities for the current document.
- **FR-009**: The system MUST allow the user to selectively revert anonymization for any entity in the list for the current session.
- **FR-010**: If a conflict occurs between a permanent "Remember Forever" rule and a session-only "un-mask" action for the same text, the session-only action MUST win. The text shall be revealed for the current session only.
- **FR-011**: The system MUST allow users to save and manage a library of custom text prompts.
- **FR-012**: The system MUST allow users to copy the final anonymized text, optionally combined with a selected prompt, to the clipboard.
- **FR-013**: The system MUST allow users to download the final anonymized text as a Markdown (`.md`) file.
- **FR-014**: The application MUST be fully functional without an internet connection.
- **FR-015**: The application MUST defer the loading of resource-intensive components (e.g., language models) until they are first needed to ensure a fast initial startup.
- **FR-016**: The application's user interface MUST be built using native controls of the chosen framework, avoiding embedded web technologies.
- **FR-017**: The system MUST provide a function to clear the current document and reset the interface to its initial state.
- **FR-018**: The system MUST NOT store any part of the processed documents in any persistent database.

### Key Entities
- **Anonymization Rule**: A user-defined rule for masking specific text. Consists of the exact text string to be masked. These are stored permanently and have the highest priority.
- **Prompt**: A user-saved text block that can be quickly appended to anonymized text before copying or exporting.

## Success Criteria *(mandatory)*

### Measurable Outcomes
- **SC-001**: Application cold startup time MUST be under 2 seconds.
- **SC-002**: 99% of common PII patterns (phone numbers, emails) are correctly identified and masked by the pattern-based rules.
- **SC-003**: In side-by-side view, the scroll position of the two text panels MUST remain synchronized with less than 50ms of perceived lag.
- **SC-004**: The "New Document" function MUST release at least 95% of the memory allocated to the previously processed document within 5 seconds.
- **SC-005**: First-time users must be able to successfully anonymize a document and save a new rule with a task completion rate of 90% without requiring instructions.
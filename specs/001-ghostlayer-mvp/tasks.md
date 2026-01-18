# Tasks: GhostLayer MVP 1.0

**Input**: Design documents from `D:\222\specs\001-ghostlayer-mvp\`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/pipeline.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: Maps to user story (US1, US2, US3)

## Path Conventions
- Project Root: `D:\222\`
- Source: `src/`
- Tests: `tests/`

---
## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure.

- [X] T001 Create root project directories per plan.md: `src/`, `tests/`
- [X] T002 [P] Create subdirectories: `src/ui/`, `src/processing/`, `src/database/`, `src/services/`
- [X] T003 [P] Create test subdirectories: `tests/processing/`, `tests/database/`, `tests/services/`
- [X] T004 [P] Create `requirements.txt` file and add dependencies: `flet`, `natasha`, `spacy`, `pymupdf`, `pyperclip`, `pytest`
- [X] T005 [P] Create initial `.gitignore` file for Python projects.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that must exist before user stories can be implemented.

- [X] T006 Create the main application entry point in `src/main.py` with a basic Flet window.
- [X] T007 [P] Implement the database manager in `src/database/db_manager.py` to connect to `ghostlayer.db` and create the `learning_rules` and `prompts` tables if they don't exist.
- [X] T008 [P] Write unit tests for the database manager in `tests/database/test_db_manager.py` to verify table creation and connection.
- [X] T009 Implement the main window layout in `src/ui/main_window.py` with placeholders for the Toolbar, Split View, and Inspector panel, according to the "Studio View" layout.
- [X] T010 Create the file handling service in `src/services/file_service.py` with functions to read text from `.pdf` and `.txt` files.

---

## Phase 3: User Story 1 - Core Anonymization Workflow (Priority: P1) 🎯 MVP

**Goal**: A user can drop a file, see the anonymized result, and save new rules.
**Independent Test**: Drop a PDF, see original/masked text, scroll in sync, add a new word to the memory, and copy/download the result.

### Tests for User Story 1
> **Note**: It is best practice to write tests before or alongside the implementation to ensure correctness.

- [X] T011 [P] [US1] Write unit tests in `tests/processing/test_pipeline.py` for the three-stage anonymization pipeline contract defined in `contracts/pipeline.md`. Test each stage (Regex, NLP, Memory) independently.

### Implementation for User Story 1

- [X] T012 [P] [US1] Implement the Regex stage of the pipeline in `src/processing/regex_rules.py`.
- [X] T013 [P] [US1] Implement the NLP stage of the pipeline in `src/processing/nlp_models.py`, including lazy-loading for models.
- [X] T014 [US1] Implement the Memory stage of the pipeline in `src/processing/memory_rules.py` that reads from `learning_rules` table.
- [X] T015 [US1] Integrate the three stages into the `anonymize_text` function in `src/processing/pipeline.py`.
- [X] T016 [US1] Implement the drag-and-drop functionality in `src/ui/main_window.py` that calls the file service and the anonymization pipeline.
- [X] T017 [US1] Implement the split-view UI component in `src/ui/split_view.py` to display original and anonymized text with synchronized scrolling.
- [X] T018 [US1] Implement the "Remember Forever" context menu/button in the UI that calls the database manager to save a new rule to the `learning_rules` table.
- [X] T019 [US1] Implement the "Copy" and "Download" buttons for the anonymized text.

---

## Phase 4: User Story 2 - Data and Prompt Management (Priority: P2)

**Goal**: Allow users to manage detected entities and a library of prompts.
**Independent Test**: Uncheck an entity in the inspector to un-mask it. Add a new prompt to the library and use it.

### Tests for User Story 2
- [X] T020 [P] [US2] Write tests for the prompt management logic in `tests/database/test_db_manager.py`.

### Implementation for User Story 2

- [X] T021 [US2] Implement the Inspector UI panel in `src/ui/inspector_panel.py` to display the list of entities returned by the pipeline.
- [X] T022 [US2] Implement the logic to handle un-checking an entity in the Inspector. This should re-render the anonymized text with the chosen entity revealed (session-only override).
- [X] T023 [P] [US2] Implement the UI for managing the prompt library (add, view, delete).
- [X] T024 [US2] Implement the backend logic in `src/database/db_manager.py` for adding, viewing, and deleting prompts from the `prompts` table.
- [X] T025 [US2] Integrate the prompt library with the "Copy" button functionality.

---

## Phase 5: User Story 3 - Application State Management (Priority: P3)

**Goal**: Allow the user to reset the application state without a restart.
**Independent Test**: Load a large file, then click "New Document" and confirm the UI is reset and memory is released.

### Implementation for User Story 3

- [X] T026 [US3] Implement the "New Document" button in the toolbar UI.
- [X] T027 [US3] Implement the state-clearing logic that resets all variables holding document text, entities, and UI components to their initial state.
- [X] T028 [US3] Add explicit garbage collection calls if needed to ensure memory is released effectively.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories.

- [X] T029 [P] Implement the full color-coding scheme for entity highlighting as defined in the Design Vibe.
- [X] T030 [P] Implement graceful error handling for file I/O and processing, showing user-friendly Snackbars/Dialogs.
- [X] T031 Review and refine UI element padding and animations to match the Design Vibe.
- [X] T032 [P] Write the final `README.md` for the project.
- [X] T033 Prepare the application for packaging with PyInstaller by creating a `.spec` file.

---

## Dependencies & Execution Order

- **Setup (Phase 1)** must complete before all other phases.
- **Foundational (Phase 2)** must complete before any User Story phases.
- Once Phase 2 is complete, User Stories can be developed. For the MVP, the recommended order is sequential:
  1.  **Phase 3 (User Story 1)**: Core functionality.
  2.  **Phase 4 (User Story 2)**: Control and customization.
  3.  **Phase 5 (User Story 3)**: Stability and UX.
- **Polish (Phase N)** is last.

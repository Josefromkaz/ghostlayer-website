# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Python 3.11+
**Primary Dependencies**: Flet (GUI), Natasha/SpaCy (NLP), PyMuPDF (PDF), Pyperclip (Clipboard)
**Storage**: SQLite (pure SQL, no ORM)
**Testing**: [NEEDS CLARIFICATION: No testing framework specified in constitution]
**Target Platform**: Packaged Monolithic Desktop App (via PyInstaller)
**Project Type**: Modular Monolith
**Performance Goals**: Fast and smooth animations (0.2s), responsive UI
**Constraints**: Must work offline from a single `.exe`. Critical sections must be crash-proof.
**Scale/Scope**: [NEEDS CLARIFICATION: To be defined per feature in `spec.md`]

## Constitution Check

*GATE: Must pass before any code is written. All checks must be verified.*

- [ ] **I. NO CODE WITHOUT PLAN**: Does this plan accurately reflect the work to be done?
- [ ] **II. Spec is Law**: Is the scope of this plan fully covered by an approved `spec.md`?
- [ ] **III. Monolith Structure**: Does the proposed file structure fit within the modular monolith design?
- [ ] **IV. Safety First**: Have potential crash points been identified and error handling (try/except) been planned?
- [ ] **V. Memory First**: Does the plan consider the impact on the "User Learning" (`learning_rules`) feature?

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

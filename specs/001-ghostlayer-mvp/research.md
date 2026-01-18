# Research: GhostLayer MVP

**Purpose**: This document resolves the open questions from the initial `plan.md` technical context section before proceeding with detailed design.

## 1. Testing Framework

### Decision
We will use **`pytest`** as the primary testing framework.

### Rationale
- **Industry Standard**: `pytest` is the de-facto standard for testing in the Python ecosystem. It has a rich plugin ecosystem and is widely supported.
- **Simplicity**: Its fixture model and use of plain `assert` statements make writing tests simple and readable, which aligns with the project's "simplicity" and "cleanliness" ethos.
- **Flet Compatibility**: While Flet is a GUI framework, the underlying business logic is pure Python. `pytest` is perfectly suited to write unit tests for the entire backend logic, including the processing pipeline, database interactions, and file handling. UI testing can be handled separately with manual testing for this MVP.

### Alternatives Considered
- **`unittest`**: Python's built-in testing library. It is more verbose and less flexible than `pytest`, requiring test classes to inherit from `unittest.TestCase`. `pytest` can run `unittest`-based tests, but the reverse is not true. `pytest` is a superior choice for a new project.

## 2. Scale and Scope

### Decision
The scale and scope for the MVP are defined as follows:
- **Users**: Single-user, single-session desktop application.
- **Document Size**: The application should handle typical legal and business documents smoothly, with a soft target of files up to **50MB** and/or **500,000 words**.
- **Performance**: The UI must remain responsive during the processing of a document. A progress indicator will be shown for operations that take longer than 1 second.
- **Data**: The user-specific database (`learning_rules`, prompts) is expected to grow to a maximum of a few thousand entries. Performance should not degrade with this amount of data.

### Rationale
This scope is based on the feature specification which describes a desktop tool for individual lawyers and analysts. The defined limits are generous enough to cover the vast majority of use cases without requiring premature optimization for extreme edge cases. This aligns with the "MVP" nature of the project.

### Alternatives Considered
- **Handling unlimited scale**: This would require significant architectural complexity (e.g., streaming parsers, out-of-core processing) that is not justified for an MVP and would violate the "Simplicity" principle.

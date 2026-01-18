# GhostLayer MVP - Data Model

**Purpose**: This document defines the structure of data entities managed by the GhostLayer application, as stored in the local `ghostlayer.db` SQLite database.

## Schema
The database contains two primary tables: `learning_rules` and `prompts`.

---

### Table: `learning_rules`
Stores the custom anonymization rules created by the user.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique identifier for the rule. |
| `pattern` | `TEXT` | `NOT NULL, UNIQUE` | The text pattern to be masked. |
| `match_type` | `TEXT` | `DEFAULT 'ignore_case'` | Matching strategy: `ignore_case` (default), `exact`, or `regex`. |
| `created_at` | `TEXT` | `NOT NULL` | Timestamp (ISO 8601 format) of when the rule was created. |

**Example**:
| id | pattern | match_type | created_at |
|---|---|---|---|
| 1 | "Project Chimera" | "ignore_case" | "2025-12-06T10:00:00Z" |

---

### Table: `prompts`
Stores prompts library. Includes system (pre-defined) and user-created prompts.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique identifier for the prompt. |
| `title` | `TEXT` | `NOT NULL, UNIQUE` | A short, user-friendly name for the prompt (e.g., "Проверка договора"). |
| `body` | `TEXT` | `NOT NULL` | The full text of the prompt. |
| `is_system` | `INTEGER` | `DEFAULT 0` | Flag: 1 = system prompt (read-only), 0 = user prompt. |
| `created_at` | `TEXT` | `NOT NULL` | Timestamp (ISO 8601 format) of when the prompt was created. |

**System prompts** (pre-seeded):
- "Проверка договора" - анализ договора и ключевых рисков
- "Найти риски" - список потенциальных рисков
- "Краткое содержание" - резюме в 5-7 пунктах
- "Перевести на EN" - перевод на английский

**Example**:
| id | title | body | is_system | created_at |
|---|---|---|---|---|
| 1 | "Проверка договора" | "Проанализируй этот договор..." | 1 | "2025-12-06T10:00:00Z" |
| 5 | "Risk Analysis" | "Analyze the following document..." | 0 | "2025-12-06T10:05:00Z" |

---

## Relationships
- There are no direct relationships between the tables. They are independent collections of user-defined data.

## Privacy Note (from Constitution)
As per requirement **FR-018**, no content from the user's documents is ever stored in this database. The database is solely for managing user-created rules and prompts.

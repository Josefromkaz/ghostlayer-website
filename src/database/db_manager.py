"""
Менеджер базы данных GhostLayer.
"""
import sqlite3
import logging
import os
import platform
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from src.database.encryption import encrypt, decrypt, is_crypto_available
from src.licensing.license_manager import get_license_manager

logger = logging.getLogger(__name__)

def get_db_path() -> str:
    """
    Возвращает полный путь к файлу базы данных в системной папке пользователя.
    Windows: %APPDATA%\GhostLayer\ghostlayer.db
    Linux/Mac: ~/.local/share/GhostLayer/ghostlayer.db
    """
    app_name = "GhostLayer"
    
    if platform.system() == "Windows":
        base_dir = os.getenv("APPDATA")
        if not base_dir:
            base_dir = os.path.expanduser(r"~\AppData\Roaming")
    else:
        # Linux / MacOS
        base_dir = os.path.expanduser("~/.local/share")

    app_dir = os.path.join(base_dir, app_name)
    
    # Создаем папку, если нет
    if not os.path.exists(app_dir):
        try:
            os.makedirs(app_dir)
            logger.info(f"Создана директория данных: {app_dir}")
        except OSError as e:
            logger.error(f"Не удалось создать директорию {app_dir}: {e}")
            # Fallback на текущую директорию, если нет прав
            return "ghostlayer.db"

    return os.path.join(app_dir, "ghostlayer.db")

# Получаем путь при импорте модуля
DB_FILE = get_db_path()

# Системные промпты по умолчанию
DEFAULT_PROMPTS = [
    # 1. Детектор юридических мин
    {
        "title": "Детектор рисков",
        "body": """Ты — старший юридический консультант (Senior Legal Counsel) с 20-летним опытом в контрактном праве. Твоя задача — провести глубокий анализ рисков (Risk Assessment) следующего текста договора.

Проанализируй текст и выведи результат в виде таблицы с колонками:
1. **Клаузула/Раздел:** Цитата или ссылка на пункт.
2. **Тип риска:** (например, Финансовый, Операционный, Репутационный, Правовой).
3. **Суть риска:** Краткое объяснение, почему это опасно для нашей стороны.
4. **Уровень угрозы:** (Низкий, Средний, Критический).
5. **Рекомендация:** Как изменить формулировку, чтобы снизить риск.

Сосредоточься на пунктах об ответственности, штрафах, одностороннем расторжении, автоматической пролонгации и форс-мажоре.""",
        "is_system": 1
    },
    # 2. Сжатие смысла 80/20
    {
        "title": "Резюме документа",
        "body": """Ты — эксперт-аналитик McKinsey. Твоя задача — создать Executive Summary (Резюме для руководства) на основе предоставленного документа.

Структура ответа:
1. **В одном предложении:** О чем этот документ и какова его главная цель?
2. **Ключевые инсайты:** 5-7 маркированных пунктов с самыми важными фактами, цифрами или выводами.
3. **Скрытые сигналы:** Выдели 3 неочевидных момента или тренда, которые можно упустить при беглом чтении.
4. **Action Items:** Какие действия логично предпринять на основе этого текста?

Избегай воды, используй сухой деловой стиль.""",
        "is_system": 1
    },
    # 3. Матрица обязательств
    {
        "title": "Матрица обязательств",
        "body": """Действуй как скрупулезный операционный директор (COO). Проанализируй этот договор и извлеки из него все обязательства, сроки и дедлайны.

Представь ответ в формате таблицы:
| Кто | Что должно быть сделано | Триггер/Условие | Срок | Последствия невыполнения |

Игнорируй общие декларативные фразы, ищи только конкретные "Actionable" пункты.""",
        "is_system": 1
    },
    # 4. Адвокат Дьявола
    {
        "title": "Адвокат дьявола",
        "body": """Ты — агрессивный адвокат противоположной стороны. Твоя цель — найти в этом тексте двусмысленности, логические противоречия («серые зоны») или отсутствующие определения, которые можно использовать в суде, чтобы признать договор (или его часть) недействительным или трактовать его в свою пользу.

Найди топ-5 самых слабых мест в формулировках. Для каждого пункта напиши:
1. **Цитата** — проблемный фрагмент
2. **Почему это двусмысленно** — приведи два разных толкования
3. **Как это можно эксплуатировать** — риск для нашей стороны""",
        "is_system": 1
    },
    # 5. Перевод с юридического на человеческий
    {
        "title": "Упростить текст",
        "body": """Перепиши этот юридический текст простым и понятным языком (Plain Language), чтобы его мог понять человек без юридического образования.

Правила:
• Убери сложные деепричастные обороты
• Замени архаизмы и канцелярит на современные слова
• Разбей длинные абзацы на короткие пункты
• Сохрани юридический смысл, но измени тон на информативный и спокойный""",
        "is_system": 1
    },
    # 6. Перевод на английский
    {
        "title": "Перевести на EN",
        "body": """Translate this text to English. Preserve the original formatting, structure, and all placeholders like [PERSON_1], [COMPANY_1], [EMAIL_1], etc.

Use professional business/legal English. Do not interpret or explain — just translate.""",
        "is_system": 1
    },
]


class DBManager:
    """
    Менеджер для работы с локальной базой данных SQLite.
    """

    def __init__(self, db_file: str = None):
        # Если путь не передан явно, используем системный
        self.db_file = db_file if db_file else DB_FILE
        self.conn = None
        self.cursor = None
        logger.info(f"Используется БД: {self.db_file}")

    def __enter__(self):
        self.conn = sqlite3.connect(self.db_file)
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()
        self._create_tables()
        self._seed_default_prompts()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            self.conn.commit()
            self.conn.close()

    def _encrypt(self, text: str) -> str:
        """
        Шифрует текст с использованием AES-256-GCM.

        Если библиотека cryptography недоступна, использует XOR + Base64.
        """
        if not text:
            return ""
        try:
            return encrypt(text)
        except Exception as e:
            logger.error(f"Ошибка шифрования: {e}")
            return text

    def _decrypt(self, encrypted_text: str) -> str:
        """
        Расшифровывает текст.

        Автоматически определяет формат (AES, XOR+Base64 или чистый Base64)
        для обратной совместимости со старыми данными.
        """
        if not encrypted_text:
            return ""
        try:
            return decrypt(encrypted_text)
        except Exception as e:
            logger.warning(f"Ошибка расшифровки: {e}")
            # Возвращаем как есть для совместимости
            return encrypted_text

    def _create_tables(self):
        """Создаёт таблицы согласно спецификации."""
        # Таблица промптов
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS prompts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL UNIQUE,
                body TEXT NOT NULL,
                is_system INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """)

        # Таблица правил памяти
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS learning_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern TEXT NOT NULL UNIQUE,
                match_type TEXT DEFAULT 'ignore_case',
                rule_type TEXT DEFAULT 'anonymize',
                category TEXT DEFAULT 'LEARNED_RULE',
                created_at TEXT NOT NULL
            )
        """)

        # Таблица настроек приложения
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)

        # Миграция: если старые колонки существуют
        self._migrate_old_schema()
        self._ensure_columns()

    def _ensure_columns(self):
        """Миграция: добавляет новые колонки, если их нет."""
        try:
            self.cursor.execute("PRAGMA table_info(learning_rules)")
            columns = [col[1] for col in self.cursor.fetchall()]
            
            if 'rule_type' not in columns:
                self.cursor.execute("ALTER TABLE learning_rules ADD COLUMN rule_type TEXT DEFAULT 'anonymize'")
                logger.info("Добавлена колонка rule_type в learning_rules")
            
            if 'category' not in columns:
                self.cursor.execute("ALTER TABLE learning_rules ADD COLUMN category TEXT DEFAULT 'LEARNED_RULE'")
                logger.info("Добавлена колонка category в learning_rules")

        except sqlite3.Error as e:
            logger.warning(f"Ошибка проверки колонок: {e}")

    def _migrate_old_schema(self):
        """Мигрирует данные из старой схемы."""
        try:
            # Проверяем наличие старой колонки name в prompts
            self.cursor.execute("PRAGMA table_info(prompts)")
            columns = [col[1] for col in self.cursor.fetchall()]

            if 'name' in columns and 'title' not in columns:
                # Старая схема - нужна миграция
                self.cursor.execute("ALTER TABLE prompts RENAME TO prompts_old")
                self.cursor.execute("""
                    CREATE TABLE prompts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        title TEXT NOT NULL UNIQUE,
                        body TEXT NOT NULL,
                        is_system INTEGER DEFAULT 0,
                        created_at TEXT NOT NULL
                    )
                """)
                self.cursor.execute("""
                    INSERT INTO prompts (title, body, is_system, created_at)
                    SELECT name, content, 0, created_at FROM prompts_old
                """)
                self.cursor.execute("DROP TABLE prompts_old")
                logger.info("Миграция prompts завершена")

            # Проверяем learning_rules
            self.cursor.execute("PRAGMA table_info(learning_rules)")
            columns = [col[1] for col in self.cursor.fetchall()]

            if 'text_to_mask' in columns and 'pattern' not in columns:
                self.cursor.execute("ALTER TABLE learning_rules RENAME TO learning_rules_old")
                self.cursor.execute("""
                    CREATE TABLE learning_rules (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        pattern TEXT NOT NULL UNIQUE,
                        match_type TEXT DEFAULT 'ignore_case',
                        created_at TEXT NOT NULL
                    )
                """)
                self.cursor.execute("""
                    INSERT INTO learning_rules (pattern, match_type, created_at)
                    SELECT text_to_mask, 'ignore_case', created_at FROM learning_rules_old
                """)
                self.cursor.execute("DROP TABLE learning_rules_old")
                logger.info("Миграция learning_rules завершена")

        except sqlite3.Error as e:
            logger.warning(f"Миграция не требуется или ошибка: {e}")

    def _seed_default_prompts(self):
        """Добавляет системные промпты по умолчанию."""
        timestamp = datetime.now().isoformat()
        for prompt in DEFAULT_PROMPTS:
            try:
                self.cursor.execute(
                    "INSERT OR IGNORE INTO prompts (title, body, is_system, created_at) VALUES (?, ?, ?, ?)",
                    (prompt["title"], prompt["body"], prompt["is_system"], timestamp)
                )
            except sqlite3.Error:
                pass

    # === ПРОМПТЫ ===

    def add_prompt(self, title: str, body: str) -> bool:
        """Добавляет пользовательский промпт."""
        if not title or not body:
            return False
        try:
            timestamp = datetime.now().isoformat()
            self.cursor.execute(
                "INSERT OR IGNORE INTO prompts (title, body, is_system, created_at) VALUES (?, ?, 0, ?)",
                (title, body, timestamp)
            )
            return self.cursor.rowcount > 0
        except sqlite3.Error as e:
            logger.error(f"Ошибка добавления промпта: {e}")
            return False

    def get_all_prompts(self) -> List[Dict[str, Any]]:
        """Возвращает все промпты."""
        try:
            self.cursor.execute(
                "SELECT id, title, body, is_system FROM prompts ORDER BY is_system DESC, title"
            )
            return [dict(row) for row in self.cursor.fetchall()]
        except sqlite3.Error as e:
            logger.error(f"Ошибка получения промптов: {e}")
            return []

    def delete_prompt(self, prompt_id: int) -> bool:
        """Удаляет промпт (только пользовательские)."""
        try:
            self.cursor.execute(
                "DELETE FROM prompts WHERE id = ? AND is_system = 0",
                (prompt_id,)
            )
            return self.cursor.rowcount > 0
        except sqlite3.Error as e:
            logger.error(f"Ошибка удаления промпта: {e}")
            return False

    # === ПРАВИЛА ПАМЯТИ ===

    def add_learning_rule(self, pattern: str, match_type: str = 'ignore_case', rule_type: str = 'anonymize', category: str = 'LEARNED_RULE') -> bool:
        """Добавляет правило в память."""
        if not pattern:
            return False

        # Проверка лицензии для функции "Память"
        if not get_license_manager().can_use_feature("memory"):
            logger.warning("Попытка использования функции 'Память' без PRO лицензии")
            return False

        try:
            timestamp = datetime.now().isoformat()
            # Шифруем паттерн перед сохранением
            encrypted_pattern = self._encrypt(pattern)
            
            self.cursor.execute(
                "INSERT OR IGNORE INTO learning_rules (pattern, match_type, rule_type, category, created_at) VALUES (?, ?, ?, ?, ?)",
                (encrypted_pattern, match_type, rule_type, category, timestamp)
            )
            return self.cursor.rowcount > 0
        except sqlite3.Error as e:
            logger.error(f"Ошибка добавления правила: {e}")
            return False

    def get_all_learning_rules(self) -> List[Dict[str, Any]]:
        """Возвращает все правила памяти."""
        try:
            self.cursor.execute(
                "SELECT id, pattern, match_type, rule_type, category FROM learning_rules ORDER BY created_at DESC"
            )
            rows = [dict(row) for row in self.cursor.fetchall()]
            
            # Дешифруем паттерны на лету
            for row in rows:
                row['pattern'] = self._decrypt(row['pattern'])
                
            return rows
        except sqlite3.Error as e:
            logger.error(f"Ошибка получения правил: {e}")
            return []

    def delete_learning_rule(self, rule_id: int) -> bool:
        """Удаляет правило из памяти."""
        try:
            self.cursor.execute("DELETE FROM learning_rules WHERE id = ?", (rule_id,))
            return self.cursor.rowcount > 0
        except sqlite3.Error as e:
            logger.error(f"Ошибка удаления правила: {e}")
            return False

    def update_learning_rule_category(self, rule_id: int, category: str) -> bool:
        """Обновляет категорию правила."""
        try:
            self.cursor.execute(
                "UPDATE learning_rules SET category = ? WHERE id = ?",
                (category, rule_id)
            )
            return self.cursor.rowcount > 0
        except sqlite3.Error as e:
            logger.error(f"Ошибка обновления категории: {e}")
            return False

    def export_learning_rules(self) -> List[Dict[str, Any]]:
        """
        Экспортирует правила памяти в формате для сохранения.
        Возвращает список правил с расшифрованными паттернами.
        """
        rules = self.get_all_learning_rules()
        # Убираем id (он не нужен при импорте на другую машину)
        export_data = []
        for rule in rules:
            export_data.append({
                'pattern': rule['pattern'],
                'match_type': rule.get('match_type', 'ignore_case'),
                'rule_type': rule.get('rule_type', 'anonymize'),
                'category': rule.get('category', 'LEARNED_RULE'),
            })
        return export_data

    def import_learning_rules(self, rules: List[Dict[str, Any]], merge: bool = True) -> Tuple[int, int]:
        """
        Импортирует правила памяти.

        Args:
            rules: Список правил для импорта
            merge: True - добавить к существующим, False - заменить все

        Returns:
            Tuple[int, int]: (добавлено, пропущено)
        """
        if not merge:
            # Очищаем существующие правила
            try:
                self.cursor.execute("DELETE FROM learning_rules")
                logger.info("Все существующие правила удалены перед импортом")
            except sqlite3.Error as e:
                logger.error(f"Ошибка очистки правил: {e}")
                return (0, len(rules))

        added = 0
        skipped = 0

        for rule in rules:
            pattern = rule.get('pattern', '')
            if not pattern:
                skipped += 1
                continue

            match_type = rule.get('match_type', 'ignore_case')
            rule_type = rule.get('rule_type', 'anonymize')
            category = rule.get('category', 'LEARNED_RULE')

            try:
                timestamp = datetime.now().isoformat()
                encrypted_pattern = self._encrypt(pattern)

                self.cursor.execute(
                    "INSERT OR IGNORE INTO learning_rules (pattern, match_type, rule_type, category, created_at) VALUES (?, ?, ?, ?, ?)",
                    (encrypted_pattern, match_type, rule_type, category, timestamp)
                )

                if self.cursor.rowcount > 0:
                    added += 1
                else:
                    skipped += 1  # Дубликат
            except sqlite3.Error as e:
                logger.error(f"Ошибка импорта правила '{pattern[:20]}...': {e}")
                skipped += 1

        logger.info(f"Импорт завершён: добавлено {added}, пропущено {skipped}")
        return (added, skipped)

    def delete_whitelist_by_pattern(self, pattern: str) -> int:
        """
        Удаляет все whitelist правила с указанным паттерном.

        Используется для разрешения конфликтов: когда пользователь
        добавляет слово в память (anonymize), нужно удалить его
        из исключений (whitelist), если оно там было.

        Returns:
            Количество удалённых записей
        """
        try:
            encrypted_pattern = self._encrypt(pattern)
            self.cursor.execute(
                "DELETE FROM learning_rules WHERE pattern = ? AND rule_type = 'whitelist'",
                (encrypted_pattern,)
            )
            deleted = self.cursor.rowcount
            if deleted > 0:
                logger.info(f"Удалено {deleted} whitelist правил при добавлении в память")
            return deleted
        except sqlite3.Error as e:
            logger.error(f"Ошибка удаления whitelist по паттерну: {e}")
            return 0

    # === НАСТРОЙКИ ПРИЛОЖЕНИЯ ===

    def get_setting(self, key: str, default: str = None) -> Optional[str]:
        """Возвращает значение настройки."""
        try:
            self.cursor.execute("SELECT value FROM app_settings WHERE key = ?", (key,))
            row = self.cursor.fetchone()
            return row['value'] if row else default
        except sqlite3.Error as e:
            logger.error(f"Ошибка получения настройки {key}: {e}")
            return default

    def set_setting(self, key: str, value: str) -> bool:
        """Сохраняет значение настройки."""
        try:
            self.cursor.execute(
                "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
                (key, str(value))
            )
            return True
        except sqlite3.Error as e:
            logger.error(f"Ошибка сохранения настройки {key}: {e}")
            return False
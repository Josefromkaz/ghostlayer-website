"""
Сессионный логгер для GhostLayer.

Хранит логи только в памяти (Zero Data принцип).
Логи живут до закрытия приложения.
Поддерживает экспорт в JSON для диагностики.
"""
import json
import logging
import platform
import sys
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field, asdict

from src.config import APP_VERSION, APP_NAME


@dataclass
class LogEntry:
    """Запись лога."""
    timestamp: str
    level: str
    module: str
    event: str
    details: Dict[str, Any] = field(default_factory=dict)


class SessionLogHandler(logging.Handler):
    """
    Кастомный handler для Python logging.
    Перехватывает логи и сохраняет в SessionLogger.
    """

    def __init__(self, session_logger: 'SessionLogger'):
        super().__init__()
        self.session_logger = session_logger

    def emit(self, record: logging.LogRecord) -> None:
        """Обрабатывает запись лога."""
        # Фильтруем служебные логи flet
        if record.name.startswith('flet'):
            return

        # Создаём безопасную запись (без чувствительных данных)
        self.session_logger.add_entry(
            level=record.levelname,
            module=record.name,
            event=record.getMessage(),
        )


class SessionLogger:
    """
    Сессионный логгер.

    Особенности:
    - Хранит логи только в памяти
    - Автоматически очищается при закрытии приложения
    - Не сохраняет чувствительные данные
    - Поддерживает экспорт в JSON
    """

    _instance: Optional['SessionLogger'] = None

    def __new__(cls) -> 'SessionLogger':
        """Singleton pattern."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._initialized = True
        self._entries: List[LogEntry] = []
        self._session_start = datetime.now()
        self._app_version = APP_VERSION
        self._app_name = APP_NAME
        self._max_entries = 10000  # Лимит записей для защиты памяти

        # Записываем старт сессии
        self.add_entry(
            level="INFO",
            module="session",
            event="session_started",
            details={
                "app_version": self._app_version,
                "python_version": sys.version,
                "platform": platform.system(),
                "platform_version": platform.version(),
            }
        )

    def add_entry(
        self,
        level: str,
        module: str,
        event: str,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Добавляет запись в лог.

        Args:
            level: Уровень (INFO, WARNING, ERROR)
            module: Модуль-источник
            event: Описание события
            details: Дополнительные данные (без чувствительной информации!)
        """
        # Проверяем лимит
        if len(self._entries) >= self._max_entries:
            # Удаляем старые записи (FIFO)
            self._entries = self._entries[1000:]

        entry = LogEntry(
            timestamp=datetime.now().isoformat(),
            level=level,
            module=module,
            event=self._sanitize_event(event),
            details=details or {}
        )
        self._entries.append(entry)

    def _sanitize_event(self, event: str) -> str:
        """
        Очищает событие от потенциально чувствительных данных.

        Удаляет:
        - Содержимое в кавычках (могут быть значения сущностей)
        - Пути к файлам (заменяет на <FILE>)
        """
        import re

        # Заменяем содержимое в одинарных кавычках
        event = re.sub(r"'[^']*'", "'<REDACTED>'", event)

        # Заменяем пути к файлам (Windows и Unix)
        event = re.sub(r'[A-Za-z]:\\[^\s]+', '<FILE_PATH>', event)
        event = re.sub(r'/[^\s]+\.[a-zA-Z]+', '<FILE_PATH>', event)

        return event

    def get_entries(self) -> List[LogEntry]:
        """Возвращает все записи."""
        return self._entries.copy()

    def get_entries_count(self) -> int:
        """Возвращает количество записей."""
        return len(self._entries)

    def export_json(self) -> str:
        """
        Экспортирует логи в JSON формат.

        Returns:
            JSON строка с логами сессии
        """
        export_data = {
            "export_timestamp": datetime.now().isoformat(),
            "session_start": self._session_start.isoformat(),
            "app_version": self._app_version,
            "platform": {
                "system": platform.system(),
                "version": platform.version(),
                "python": sys.version,
            },
            "entries_count": len(self._entries),
            "entries": [asdict(entry) for entry in self._entries]
        }

        return json.dumps(export_data, ensure_ascii=False, indent=2)

    def export_jsonl(self) -> str:
        """
        Экспортирует логи в JSONL формат (одна строка = одна запись).
        Более компактный формат.

        Returns:
            JSONL строка с логами
        """
        lines = []

        # Заголовок
        header = {
            "type": "header",
            "session_start": self._session_start.isoformat(),
            "app_version": self._app_version,
            "platform": platform.system(),
        }
        lines.append(json.dumps(header, ensure_ascii=False))

        # Записи
        for entry in self._entries:
            lines.append(json.dumps(asdict(entry), ensure_ascii=False))

        return "\n".join(lines)

    def clear(self) -> None:
        """Очищает все записи."""
        self._entries.clear()

    def log_file_loaded(self, file_ext: str, file_size_kb: int) -> None:
        """Логирует загрузку файла (без имени!)."""
        self.add_entry(
            level="INFO",
            module="file_handler",
            event="file_loaded",
            details={
                "extension": file_ext,
                "size_kb": file_size_kb,
            }
        )

    def log_pipeline_result(
        self,
        total_entities: int,
        active_entities: int,
        by_category: Dict[str, int]
    ) -> None:
        """Логирует результат pipeline."""
        self.add_entry(
            level="INFO",
            module="pipeline",
            event="anonymization_complete",
            details={
                "total_entities": total_entities,
                "active_entities": active_entities,
                "by_category": by_category,
            }
        )

    def log_entity_action(self, action: str, category: str) -> None:
        """Логирует действие с сущностью (без значения!)."""
        self.add_entry(
            level="INFO",
            module="entity",
            event=f"entity_{action}",
            details={"category": category}
        )

    def log_error(self, module: str, error: str) -> None:
        """Логирует ошибку."""
        self.add_entry(
            level="ERROR",
            module=module,
            event="error",
            details={"error": self._sanitize_event(error)}
        )


# Глобальный экземпляр
session_logger = SessionLogger()


def get_session_logger() -> SessionLogger:
    """Возвращает глобальный SessionLogger."""
    return session_logger


def setup_session_logging() -> None:
    """
    Настраивает перехват Python logging в SessionLogger.
    Вызывать при старте приложения.
    """
    handler = SessionLogHandler(session_logger)
    handler.setLevel(logging.INFO)

    # Добавляем handler к корневому логгеру
    root_logger = logging.getLogger()
    root_logger.addHandler(handler)

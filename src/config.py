"""
Конфигурация приложения GhostLayer.

Централизованное хранение всех констант и настроек.
"""
import logging
from pathlib import Path

# ============================================================================
# Лицензирование
# ============================================================================
LICENSE_MODE_FREE = "FREE"
LICENSE_MODE_PRO = "PRO"
LICENSE_MODE_TRIAL = "TRIAL"
LICENSE_MODE_TEAM = "TEAM"
LICENSE_MODE_EXPIRED = "EXPIRED"
LICENSE_MODE_TAMPERED = "TAMPERED"

# URL для проверки обновлений и отзыва лицензий
# Установлено в None для v1.0.0 - функционал онлайн-проверки отключен
# Для включения: настроить Cloudflare Worker и заменить на реальный URL
# Формат: https://ghostlayer-update.<your-subdomain>.workers.dev
UPDATE_SERVER_URL = None  # Disabled for v1.0.0 - fully offline mode

# ============================================================================
# Версия приложения
# ============================================================================
APP_VERSION = "1.0.0"
APP_NAME = "GhostLayer"

# ============================================================================
# Пути
# ============================================================================
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_FILE = "ghostlayer.db"

# ============================================================================
# UI настройки
# ============================================================================
APP_TITLE = f"{APP_NAME} MVP {APP_VERSION}"
WINDOW_WIDTH = 1200
WINDOW_HEIGHT = 800
WINDOW_MIN_WIDTH = 800
WINDOW_MIN_HEIGHT = 600

# Цвета
BACKGROUND_COLOR = "#F5F5F7"

# ============================================================================
# Поддерживаемые форматы файлов
# ============================================================================
SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".docx"}

# ============================================================================
# NLP настройки
# ============================================================================
SPACY_MODEL_EN = "en_core_web_sm"

# Категории сущностей, которые распознаём
NLP_ENTITY_TYPES = {
    "natasha": ["PER", "ORG"],
    "spacy": ["PERSON", "ORG"]
}

# Маппинг типов Natasha -> наши категории
NATASHA_TYPE_MAP = {
    "PER": "PERSON",
    "ORG": "ORGANIZATION"
}

# ============================================================================
# Logging настройки
# ============================================================================
LOG_LEVEL = logging.INFO
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging(level: int = LOG_LEVEL) -> None:
    """
    Настраивает логирование для всего приложения.

    Args:
        level: Уровень логирования (по умолчанию INFO).
    """
    logging.basicConfig(
        level=level,
        format=LOG_FORMAT,
        datefmt=LOG_DATE_FORMAT,
        handlers=[
            logging.StreamHandler()
        ]
    )

    # Уменьшаем уровень логирования для шумных библиотек
    logging.getLogger("flet").setLevel(logging.WARNING)
    logging.getLogger("flet_core").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)

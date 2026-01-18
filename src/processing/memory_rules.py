"""
Memory-стадия анонимизации: пользовательские правила из БД.
"""
import re
import logging
from typing import List, Dict, Any, Tuple

from src.database.db_manager import DBManager
from src.processing.utils import is_overlapping
from src.licensing.license_manager import get_license_manager

logger = logging.getLogger(__name__)


def _load_rules_from_db() -> Dict[str, str]:
    """
    Загружает правила из базы данных.

    Требует активную PRO-лицензию. Для FREE-пользователей
    возвращает пустой словарь (memory-правила не применяются).

    Returns:
        Dict[pattern, category]
    """
    # Проверка лицензии: memory-правила доступны только для PRO
    if not get_license_manager().can_use_feature("memory"):
        logger.debug("Memory-правила недоступны: требуется PRO-лицензия")
        return {}

    try:
        with DBManager() as db:
            # Используем метод менеджера, который возвращает уже расшифрованные правила
            rules_dicts = db.get_all_learning_rules()
            # Фильтруем только правила для анонимизации (исключая whitelist)
            # Возвращаем словарь {pattern: category}
            rules = {
                r['pattern']: r.get('category', 'LEARNED_RULE')
                for r in rules_dicts 
                if r.get('rule_type', 'anonymize') == 'anonymize'
            }
            logger.debug(f"Загружено {len(rules)} правил анонимизации из БД")
            return rules
    except Exception as e:
        logger.error(f"Ошибка при чтении правил из БД: {e}")
        return {}


def find_memory_matches(text: str, existing_spans: List[Tuple[int, int]] = None) -> List[Dict[str, Any]]:
    """
    Находит совпадения по пользовательским правилам из БД БЕЗ замены текста.

    Args:
        text: Текст для поиска (ОРИГИНАЛЬНЫЙ, без масок).
        existing_spans: Уже занятые диапазоны (для исключения пересечений).

    Returns:
        Список словарей с информацией о найденных совпадениях.
    """
    rules_map = _load_rules_from_db()
    if not rules_map:
        return []

    if existing_spans is None:
        existing_spans = []

    rules = list(rules_map.keys())

    # Сортируем правила по длине (длинные сначала) для правильного приоритета
    rules.sort(key=len, reverse=True)

    # Экранируем правила, но заменяем пробелы на \s+ для гибкости
    escaped_rules = []
    for rule in rules:
        escaped = re.escape(rule)
        escaped = escaped.replace(r'\ ', r'\s+')
        escaped_rules.append(escaped)

    if not escaped_rules:
        return []

    pattern = re.compile("|".join(escaped_rules), re.IGNORECASE)

    matches = []
    for match in pattern.finditer(text):
        if not is_overlapping(match.start(), match.end(), existing_spans):
            # Поиск категории
            found_text = match.group(0).lower()
            category = "LEARNED_RULE"

            for rule in rules:
                if rule.lower() == found_text:
                    category = rules_map[rule]
                    break

            matches.append({
                "start": match.start(),
                "end": match.end(),
                "original_text": match.group(0),
                "category": category
            })

    return matches

"""
Общие утилиты для модуля обработки текста.
"""
from typing import List, Tuple, Dict, Any

from src.processing.types import Entity


def is_overlapping(start: int, end: int, existing_spans: List[Tuple[int, int]]) -> bool:
    """
    Проверяет, пересекается ли новый спан с уже существующими.

    Args:
        start: Начальная позиция нового спана.
        end: Конечная позиция нового спана.
        existing_spans: Список существующих спанов (start, end).

    Returns:
        True, если есть пересечение, иначе False.
    """
    for ex_start, ex_end in existing_spans:
        if start < ex_end and end > ex_start:
            return True
    return False


def mask_entities(
    text: str,
    matches: List[Dict[str, Any]],
    existing_entities: List[Entity],
    source_stage: str
) -> Tuple[str, List[Entity]]:
    """
    Маскирует найденные сущности в тексте.

    Общая функция для всех стадий pipeline (Regex, NLP, Memory).

    Args:
        text: Текст для маскирования.
        matches: Список найденных совпадений с ключами:
            - start: int - начальная позиция
            - end: int - конечная позиция
            - original_text: str - оригинальный текст
            - category: str - категория сущности
        existing_entities: Уже существующие сущности (для подсчёта номеров).
        source_stage: Название стадии (Regex, NLP, Memory).

    Returns:
        Кортеж (замаскированный текст, список новых Entity).
    """
    if not matches:
        return text, []

    # Сортируем с конца, чтобы замены не сбивали индексы
    matches.sort(key=lambda x: x['start'], reverse=True)

    new_entities = []
    category_counters: Dict[str, int] = {}

    for match in matches:
        category = match["category"]

        # Считаем существующие сущности этой категории
        if category not in category_counters:
            category_counters[category] = sum(
                1 for e in existing_entities if e.category == category
            )
        category_counters[category] += 1

        mask_id = f"[{category}_{category_counters[category]}]"
        text = text[:match['start']] + mask_id + text[match['end']:]

        new_entities.append(Entity(
            id=mask_id,
            original_text=match["original_text"],
            category=category,
            source_stage=source_stage,
            original_start=match["start"],
            original_end=match["end"]
        ))

    # Разворачиваем, чтобы порядок соответствовал позициям в тексте
    new_entities.reverse()
    return text, new_entities

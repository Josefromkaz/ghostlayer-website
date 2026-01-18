from dataclasses import dataclass
from typing import List, Dict

@dataclass
class Entity:
    """
    Представляет найденную в тексте сущность.

    Attributes:
        id: Уникальный идентификатор маски (например, [PERSON_1])
        original_text: Исходный текст, который был замаскирован
        category: Категория сущности (PERSON, ORGANIZATION, etc.)
        source_stage: Стадия, на которой была найдена (Regex, NLP, Memory)
        original_start: Позиция начала в ОРИГИНАЛЬНОМ тексте
        original_end: Позиция конца в ОРИГИНАЛЬНОМ тексте
    """
    id: str
    original_text: str
    category: str
    source_stage: str
    original_start: int = -1
    original_end: int = -1

@dataclass
class AnonymizationResult:
    """
    Результат работы пайплайна анонимизации.
    """
    anonymized_text: str
    entities: List[Entity]
    stats: Dict[str, int]

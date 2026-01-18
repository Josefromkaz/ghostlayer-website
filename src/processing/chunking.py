"""
Чанкинг для обработки больших текстов.

Разбивает текст на части для:
1. Параллельной обработки
2. Прогресса (показывать % выполнения)
3. Снижения пикового потребления памяти

Стратегия разбивки:
- Разбиваем по границам абзацев (\n\n)
- Если абзац слишком большой — по предложениям
- Минимальный размер чанка: 1KB
- Максимальный размер чанка: 50KB
"""
import re
import logging
from typing import List, Tuple, Callable, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Константы размеров (в символах)
MIN_CHUNK_SIZE = 1024  # 1KB
MAX_CHUNK_SIZE = 50 * 1024  # 50KB
DEFAULT_CHUNK_SIZE = 20 * 1024  # 20KB - оптимальный размер для NLP


@dataclass
class Chunk:
    """Один чанк текста с метаданными."""
    text: str
    start_offset: int  # Позиция начала в оригинальном тексте
    end_offset: int    # Позиция конца в оригинальном тексте
    index: int         # Порядковый номер чанка


def split_into_chunks(
    text: str,
    max_chunk_size: int = DEFAULT_CHUNK_SIZE,
    on_progress: Optional[Callable[[int, int], None]] = None
) -> List[Chunk]:
    """
    Разбивает текст на чанки.

    Args:
        text: Исходный текст
        max_chunk_size: Максимальный размер чанка в символах
        on_progress: Callback для прогресса (current, total)

    Returns:
        Список чанков
    """
    if not text:
        return []

    # Если текст маленький — возвращаем как есть
    if len(text) <= max_chunk_size:
        return [Chunk(text=text, start_offset=0, end_offset=len(text), index=0)]

    chunks = []
    current_pos = 0
    chunk_index = 0

    while current_pos < len(text):
        # Определяем конец чанка
        chunk_end = min(current_pos + max_chunk_size, len(text))

        # Если не конец текста — ищем хорошую границу
        if chunk_end < len(text):
            chunk_end = _find_chunk_boundary(text, current_pos, chunk_end)

        chunk_text = text[current_pos:chunk_end]
        chunks.append(Chunk(
            text=chunk_text,
            start_offset=current_pos,
            end_offset=chunk_end,
            index=chunk_index
        ))

        if on_progress:
            on_progress(chunk_end, len(text))

        current_pos = chunk_end
        chunk_index += 1

    logger.info(f"Текст разбит на {len(chunks)} чанков")
    return chunks


def _find_chunk_boundary(text: str, start: int, ideal_end: int) -> int:
    """
    Находит хорошую границу для чанка (не разрывая слова/предложения).

    Приоритет:
    1. Двойной перенос строки (абзац)
    2. Одинарный перенос строки
    3. Точка + пробел (конец предложения)
    4. Пробел (между словами)
    """
    search_start = max(start, ideal_end - 500)  # Ищем в последних 500 символах
    search_text = text[search_start:ideal_end]

    # Ищем с конца к началу
    # 1. Двойной перенос (абзац)
    last_para = search_text.rfind('\n\n')
    if last_para != -1:
        return search_start + last_para + 2

    # 2. Одинарный перенос
    last_newline = search_text.rfind('\n')
    if last_newline != -1:
        return search_start + last_newline + 1

    # 3. Точка + пробел
    last_sentence = search_text.rfind('. ')
    if last_sentence != -1:
        return search_start + last_sentence + 2

    # 4. Пробел
    last_space = search_text.rfind(' ')
    if last_space != -1:
        return search_start + last_space + 1

    # Не нашли хорошую границу — режем как есть
    return ideal_end


def adjust_entity_offsets(
    entities: List[dict],
    chunk: Chunk
) -> List[dict]:
    """
    Корректирует позиции сущностей с учётом смещения чанка.

    Args:
        entities: Список сущностей с позициями относительно чанка
        chunk: Чанк, в котором найдены сущности

    Returns:
        Список сущностей с глобальными позициями
    """
    adjusted = []
    for entity in entities:
        adjusted_entity = entity.copy()
        adjusted_entity['start'] = entity['start'] + chunk.start_offset
        adjusted_entity['end'] = entity['end'] + chunk.start_offset
        adjusted.append(adjusted_entity)
    return adjusted


def estimate_processing_time(text_length: int) -> float:
    """
    Оценивает время обработки в секундах.

    Эмпирическая оценка:
    - Regex: ~0.1 сек на 100KB
    - NLP: ~1 сек на 10KB (bottleneck)
    """
    # NLP — основной bottleneck
    nlp_time = (text_length / 10000) * 1.0  # 1 сек на 10KB
    regex_time = (text_length / 100000) * 0.1  # 0.1 сек на 100KB

    return nlp_time + regex_time


def should_use_chunking(text_length: int, threshold: int = 100 * 1024) -> bool:
    """
    Определяет, нужно ли использовать чанкинг.

    Args:
        text_length: Длина текста в символах
        threshold: Порог в символах (по умолчанию 100KB)

    Returns:
        True если текст достаточно большой
    """
    return text_length > threshold

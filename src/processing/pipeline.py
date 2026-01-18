"""
Pipeline для анонимизации текста.

Трёхстадийная обработка:
1. Memory — пользовательские правила из БД (ВЫСШИЙ ПРИОРИТЕТ)
2. Regex — паттерны (email, телефоны, карты)
3. NLP — именованные сущности (имена, организации)

ВАЖНО: Все стадии работают на ОРИГИНАЛЬНОМ тексте, чтобы позиции
сущностей соответствовали исходному документу для корректной подсветки в UI.

Поддержка чанкинга:
- Большие тексты (>100KB) обрабатываются по частям
- Прогресс-callback для UI
"""
from typing import Dict, Any, List, Tuple, Optional, Callable
import logging

from src.processing.regex_rules import find_regex_matches
from src.processing.nlp_models import find_nlp_matches
from src.processing.memory_rules import find_memory_matches
from src.processing.types import Entity, AnonymizationResult
from src.processing.chunking import (
    split_into_chunks, adjust_entity_offsets,
    should_use_chunking, Chunk
)

logger = logging.getLogger(__name__)


def anonymize_text(
    original_text: str,
    on_progress: Optional[Callable[[int, int, str], None]] = None
) -> AnonymizationResult:
    """
    Основная функция анонимизации текста.

    Новая архитектура:
    1. Сначала ВСЕ стадии находят сущности на ОРИГИНАЛЬНОМ тексте
    2. Потом делаем замены один раз
    3. Позиции в Entity соответствуют оригинальному тексту (для UI)

    Поддержка чанкинга:
    - Для больших текстов (>100KB) используется разбивка на чанки
    - Прогресс передаётся через callback

    Args:
        original_text: Исходный текст для анонимизации.
        on_progress: Callback (processed_chars, total_chars, stage_name)

    Returns:
        AnonymizationResult с анонимизированным текстом, списком сущностей и статистикой.
    """
    if not original_text or not original_text.strip():
        logger.warning("Получен пустой текст для анонимизации")
        return AnonymizationResult(
            anonymized_text="",
            entities=[],
            stats={}
        )

    text_len = len(original_text)
    logger.info(f"Начинаю анонимизацию текста ({text_len} символов)")

    # Решаем, нужен ли чанкинг
    if should_use_chunking(text_len):
        logger.info("Используем чанкинг для большого текста")
        return _anonymize_with_chunking(original_text, on_progress)

    # Стандартная обработка для небольших текстов
    return _anonymize_single(original_text, on_progress)


def _anonymize_single(
    original_text: str,
    on_progress: Optional[Callable[[int, int, str], None]] = None
) -> AnonymizationResult:
    """Обрабатывает текст целиком (без чанкинга)."""
    text_len = len(original_text)

    # Собираем все совпадения на ОРИГИНАЛЬНОМ тексте
    all_matches: List[Dict[str, Any]] = []
    used_spans: List[Tuple[int, int]] = []

    # Стадия 1: Memory (пользовательские правила) - ВЫСШИЙ ПРИОРИТЕТ
    if on_progress:
        on_progress(0, text_len, "Memory")
    try:
        memory_matches = find_memory_matches(original_text, used_spans)
        for m in memory_matches:
            m['source_stage'] = 'Memory'
            used_spans.append((m['start'], m['end']))
        all_matches.extend(memory_matches)
        logger.debug(f"Memory стадия: найдено {len(memory_matches)} сущностей")
    except Exception as e:
        logger.error(f"Ошибка в memory стадии: {e}")

    # Стадия 2: Regex (жесткие паттерны)
    if on_progress:
        on_progress(text_len // 3, text_len, "Regex")
    try:
        regex_matches = find_regex_matches(original_text, used_spans)
        for m in regex_matches:
            m['source_stage'] = 'Regex'
            used_spans.append((m['start'], m['end']))
        all_matches.extend(regex_matches)
        logger.debug(f"Regex стадия: найдено {len(regex_matches)} сущностей")
    except Exception as e:
        logger.error(f"Ошибка в regex стадии: {e}")

    # Стадия 3: NLP (именованные сущности)
    if on_progress:
        on_progress(text_len * 2 // 3, text_len, "NLP")
    try:
        nlp_matches = find_nlp_matches(original_text, used_spans)
        for m in nlp_matches:
            m['source_stage'] = 'NLP'
            used_spans.append((m['start'], m['end']))
        all_matches.extend(nlp_matches)
        logger.debug(f"NLP стадия: найдено {len(nlp_matches)} сущностей")
    except Exception as e:
        logger.error(f"Ошибка в NLP стадии: {e}")

    # Применяем маски к тексту
    if on_progress:
        on_progress(text_len, text_len, "Завершение")
    anonymized_text, entities = _apply_masks(original_text, all_matches)

    # Собираем статистику
    stats = _calculate_stats(entities)
    logger.info(f"Анонимизация завершена: {len(entities)} сущностей")

    return AnonymizationResult(
        anonymized_text=anonymized_text,
        entities=entities,
        stats=stats
    )


def _anonymize_with_chunking(
    original_text: str,
    on_progress: Optional[Callable[[int, int, str], None]] = None
) -> AnonymizationResult:
    """
    Обрабатывает большой текст по чанкам.

    Стратегия:
    1. Memory и Regex работают на всём тексте (они быстрые)
    2. NLP работает по чанкам (она медленная)
    """
    text_len = len(original_text)
    all_matches: List[Dict[str, Any]] = []
    used_spans: List[Tuple[int, int]] = []

    # Стадия 1: Memory (быстрая, работает на всём тексте)
    if on_progress:
        on_progress(0, text_len, "Memory")
    try:
        memory_matches = find_memory_matches(original_text, used_spans)
        for m in memory_matches:
            m['source_stage'] = 'Memory'
            used_spans.append((m['start'], m['end']))
        all_matches.extend(memory_matches)
        logger.debug(f"Memory стадия: найдено {len(memory_matches)} сущностей")
    except Exception as e:
        logger.error(f"Ошибка в memory стадии: {e}")

    # Стадия 2: Regex (быстрая, работает на всём тексте)
    if on_progress:
        on_progress(text_len // 10, text_len, "Regex")
    try:
        regex_matches = find_regex_matches(original_text, used_spans)
        for m in regex_matches:
            m['source_stage'] = 'Regex'
            used_spans.append((m['start'], m['end']))
        all_matches.extend(regex_matches)
        logger.debug(f"Regex стадия: найдено {len(regex_matches)} сущностей")
    except Exception as e:
        logger.error(f"Ошибка в regex стадии: {e}")

    # Стадия 3: NLP по чанкам
    chunks = split_into_chunks(original_text)
    total_chunks = len(chunks)
    processed_chars = text_len // 10  # Уже обработано 10% (Memory + Regex)

    for i, chunk in enumerate(chunks):
        if on_progress:
            # Прогресс: 10% (Memory+Regex) + 90% распределено по чанкам
            chunk_progress = processed_chars + int((i / total_chunks) * (text_len * 0.9))
            on_progress(chunk_progress, text_len, f"NLP ({i+1}/{total_chunks})")

        try:
            # Получаем спаны, которые попадают в этот чанк
            chunk_spans = [
                (s - chunk.start_offset, e - chunk.start_offset)
                for s, e in used_spans
                if s >= chunk.start_offset and e <= chunk.end_offset
            ]

            nlp_matches = find_nlp_matches(chunk.text, chunk_spans)

            # Корректируем позиции с учётом смещения чанка
            adjusted = adjust_entity_offsets(nlp_matches, chunk)

            for m in adjusted:
                m['source_stage'] = 'NLP'
                used_spans.append((m['start'], m['end']))
            all_matches.extend(adjusted)

        except Exception as e:
            logger.error(f"Ошибка в NLP стадии для чанка {i}: {e}")

    logger.debug(f"NLP стадия (чанкинг): найдено {len([m for m in all_matches if m.get('source_stage') == 'NLP'])} сущностей")

    # Применяем маски к тексту
    if on_progress:
        on_progress(text_len, text_len, "Завершение")
    anonymized_text, entities = _apply_masks(original_text, all_matches)

    # Собираем статистику
    stats = _calculate_stats(entities)
    logger.info(f"Анонимизация с чанкингом завершена: {len(entities)} сущностей")

    return AnonymizationResult(
        anonymized_text=anonymized_text,
        entities=entities,
        stats=stats
    )


def _apply_masks(
    original_text: str,
    matches: List[Dict[str, Any]]
) -> Tuple[str, List[Entity]]:
    """
    Применяет маски к тексту и создаёт список Entity.

    Args:
        original_text: Оригинальный текст.
        matches: Список найденных совпадений с позициями в оригинальном тексте.

    Returns:
        Кортеж (анонимизированный текст, список Entity).
    """
    if not matches:
        return original_text, []

    # Сортируем по позиции (с конца), чтобы замены не сбивали индексы
    matches.sort(key=lambda x: x['start'], reverse=True)

    entities = []
    category_counters: Dict[str, int] = {}
    text = original_text

    for match in matches:
        category = match['category']
        source_stage = match.get('source_stage', 'Unknown')

        # Генерируем уникальный ID маски
        if category not in category_counters:
            category_counters[category] = 0
        category_counters[category] += 1

        mask_id = f"[{category}_{category_counters[category]}]"

        # Заменяем в тексте
        text = text[:match['start']] + mask_id + text[match['end']:]

        # Создаём Entity с ОРИГИНАЛЬНЫМИ позициями (для подсветки в UI)
        entities.append(Entity(
            id=mask_id,
            original_text=match['original_text'],
            category=category,
            source_stage=source_stage,
            original_start=match['start'],
            original_end=match['end']
        ))

    # Разворачиваем, чтобы порядок соответствовал позициям в тексте
    entities.reverse()

    return text, entities


def _calculate_stats(entities: List[Entity]) -> Dict[str, int]:
    """Подсчитывает статистику по категориям сущностей."""
    stats: Dict[str, int] = {}
    for entity in entities:
        category = entity.category
        stats[category] = stats.get(category, 0) + 1
    return stats


def sync_entities_from_llm_result(
    original_text: str,
    llm_result: str,
    existing_entities: List[Entity]
) -> Tuple[List[Entity], str]:
    """
    Синхронизирует сущности между оригинальным текстом и результатом LLM.

    Находит новые плейсхолдеры в ответе LLM (например [ORGANIZATION_25]),
    которых нет в existing_entities, и определяет их позиции в оригинале
    путём сравнения текстов.

    Args:
        original_text: Оригинальный текст до анонимизации
        llm_result: Результат от LLM с плейсхолдерами
        existing_entities: Уже известные сущности

    Returns:
        Tuple[List[Entity], str]: Обновлённый список сущностей и анонимизированный текст
    """
    import re

    # Собираем ID существующих сущностей (без скобок)
    existing_ids = {e.id.strip('[]') for e in existing_entities}

    # Ищем все плейсхолдеры в ответе LLM
    placeholder_pattern = r'\[([A-Z_]+_\d+)\]'
    found_placeholders = re.findall(placeholder_pattern, llm_result)

    # Находим новые плейсхолдеры
    new_placeholder_ids = set(found_placeholders) - existing_ids

    if not new_placeholder_ids:
        # Нет новых сущностей
        return existing_entities, llm_result

    logger.info(f"Найдено {len(new_placeholder_ids)} новых сущностей от LLM: {new_placeholder_ids}")

    # Для каждого нового плейсхолдера пытаемся найти оригинальный текст
    new_entities = []

    # Стратегия: сравниваем позиции текста до и после плейсхолдера
    # чтобы определить, какой текст был заменён

    for placeholder_id in new_placeholder_ids:
        placeholder = f'[{placeholder_id}]'

        # Извлекаем категорию из ID
        parts = placeholder_id.rsplit('_', 1)
        if len(parts) == 2:
            category = parts[0]
        else:
            category = 'UNKNOWN'

        # Находим позицию плейсхолдера в результате LLM
        llm_pos = llm_result.find(placeholder)
        if llm_pos == -1:
            continue

        # Получаем контекст вокруг плейсхолдера
        context_before = llm_result[max(0, llm_pos - 50):llm_pos]
        context_after = llm_result[llm_pos + len(placeholder):llm_pos + len(placeholder) + 50]

        # Ищем этот контекст в оригинале
        original_value = _find_original_value(
            original_text,
            context_before,
            context_after,
            existing_entities
        )

        if original_value:
            # Находим позицию в оригинале
            orig_start = original_text.find(original_value)
            if orig_start >= 0:
                orig_end = orig_start + len(original_value)

                new_entity = Entity(
                    id=placeholder,
                    original_text=original_value,
                    category=category,
                    source_stage='LLM',
                    original_start=orig_start,
                    original_end=orig_end
                )
                new_entities.append(new_entity)
                logger.info(f"Найдена новая сущность от LLM: {placeholder} -> '{original_value}'")

    # Объединяем существующие и новые сущности
    all_entities = list(existing_entities) + new_entities

    # Сортируем по позиции в оригинале
    all_entities.sort(key=lambda e: e.original_start if e.original_start >= 0 else float('inf'))

    return all_entities, llm_result


def _find_original_value(
    original_text: str,
    context_before: str,
    context_after: str,
    existing_entities: List[Entity]
) -> str:
    """
    Находит оригинальное значение по контексту.

    Ищет место в оригинальном тексте, где контекст до и после совпадает,
    и возвращает текст между ними.
    """
    import re

    # Очищаем контекст от других плейсхолдеров для поиска
    placeholder_pattern = r'\[[A-Z_]+_\d+\]'

    # Заменяем плейсхолдеры в контексте на их оригинальные значения
    clean_before = context_before
    clean_after = context_after

    for entity in existing_entities:
        clean_before = clean_before.replace(entity.id, entity.original_text)
        clean_after = clean_after.replace(entity.id, entity.original_text)

    # Убираем оставшиеся плейсхолдеры (новые, которые мы ещё не знаем)
    clean_before = re.sub(placeholder_pattern, '.*?', clean_before)
    clean_after = re.sub(placeholder_pattern, '.*?', clean_after)

    # Экранируем спецсимволы regex, кроме .*?
    def escape_except_wildcard(s):
        result = ''
        i = 0
        while i < len(s):
            if s[i:i+3] == '.*?':
                result += '.*?'
                i += 3
            elif s[i] in r'\.^$*+?{}[]|()':
                result += '\\' + s[i]
                i += 1
            else:
                result += s[i]
                i += 1
        return result

    escaped_before = escape_except_wildcard(clean_before)
    escaped_after = escape_except_wildcard(clean_after)

    # Берём последние 20 символов контекста до и первые 20 после
    # для более точного поиска
    short_before = escaped_before[-20:] if len(escaped_before) > 20 else escaped_before
    short_after = escaped_after[:20] if len(escaped_after) > 20 else escaped_after

    if not short_before and not short_after:
        return None

    # Строим паттерн для поиска: контекст_до + (захват) + контекст_после
    try:
        pattern = f'{short_before}(.+?){short_after}'
        match = re.search(pattern, original_text, re.DOTALL)

        if match:
            found_value = match.group(1).strip()
            # Проверяем, что найденное значение разумной длины (не весь текст)
            if 1 <= len(found_value) <= 200:
                return found_value
    except re.error as e:
        logger.warning(f"Ошибка regex при поиске оригинального значения: {e}")

    return None

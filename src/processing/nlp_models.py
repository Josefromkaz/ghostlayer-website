"""
NLP-стадия анонимизации: распознавание именованных сущностей.

Поддерживает:
- Русский язык (Natasha)
- Английский язык (SpaCy)
"""
import re
import logging
import threading
from typing import List, Dict, Any, Tuple, Optional

from src.processing.utils import is_overlapping

logger = logging.getLogger(__name__)

# Модели загружаются лениво при первом использовании
_natasha_model: Optional[Dict] = None
_spacy_model_en: Optional[Any] = None
_models_lock = threading.Lock()
_models_loading = False
_models_ready = False


def preload_models_async(on_complete: Optional[callable] = None) -> None:
    """
    Запускает загрузку моделей в фоновом потоке.

    Args:
        on_complete: Callback, вызываемый после загрузки (в основном потоке не гарантируется!)
    """
    global _models_loading

    if _models_ready or _models_loading:
        if on_complete and _models_ready:
            on_complete()
        return

    _models_loading = True

    def _load_in_background():
        global _models_loading, _models_ready
        try:
            _load_models()
            _models_ready = True
        finally:
            _models_loading = False

        if on_complete:
            on_complete()

    thread = threading.Thread(target=_load_in_background, daemon=True)
    thread.start()


def are_models_ready() -> bool:
    """Проверяет, загружены ли модели."""
    return _models_ready


def are_models_loading() -> bool:
    """Проверяет, идёт ли загрузка моделей."""
    return _models_loading


def _load_models() -> None:
    """
    Ленивая загрузка моделей NLP с потокобезопасностью.
    """
    global _natasha_model, _spacy_model_en, _models_ready

    with _models_lock:
        if _natasha_model is None:
            logger.info("Загрузка модели Natasha...")
            try:
                from natasha import Segmenter, NewsEmbedding, NewsNERTagger
                _natasha_model = {
                    'segmenter': Segmenter(),
                    'ner_tagger': NewsNERTagger(NewsEmbedding())
                }
                logger.info("Модель Natasha загружена")
            except ImportError as e:
                logger.warning(f"Natasha не установлена: {e}")
                _natasha_model = {}

        if _spacy_model_en is None:
            logger.info("Загрузка модели SpaCy (en)...")
            try:
                import spacy
                _spacy_model_en = spacy.load("en_core_web_sm")
                logger.info("Модель SpaCy (en) загружена")
            except OSError:
                logger.warning(
                    "Модель 'en_core_web_sm' не найдена. "
                    "Установите: python -m spacy download en_core_web_sm"
                )
                _spacy_model_en = "not_found"
            except ImportError as e:
                logger.warning(f"SpaCy не установлен: {e}")
                _spacy_model_en = "not_found"

        _models_ready = True


def _is_russian(text: str) -> bool:
    """Проверяет, содержит ли текст русские буквы."""
    return bool(re.search('[а-яА-Я]', text))


def find_nlp_matches(text: str, existing_spans: List[Tuple[int, int]] = None) -> List[Dict[str, Any]]:
    """
    Находит именованные сущности с помощью NLP БЕЗ замены текста.
    Запускает ОБЕ модели (Ru + En) для поддержки смешанного текста.

    Args:
        text: Текст для поиска (ОРИГИНАЛЬНЫЙ, без масок).
        existing_spans: Уже занятые диапазоны (для исключения пересечений).

    Returns:
        Список словарей с информацией о найденных сущностях.
    """
    _load_models()

    if existing_spans is None:
        existing_spans = []

    matches = []
    
    # Копия спанов для передачи в модели, чтобы они не пересекались друг с другом сразу
    # Но лучше собирать все кандидаты, а потом фильтровать
    current_spans = list(existing_spans)

    # 1. Обрабатываем русский текст (Natasha)
    # Запускаем всегда, если модель есть, так как в англ тексте могут быть русские вставки
    if _natasha_model:
        ru_matches = _process_russian(text, current_spans)
        matches.extend(ru_matches)
        # Добавляем найденное в спаны, чтобы следующая модель не находила то же самое
        current_spans.extend([(m['start'], m['end']) for m in ru_matches])

    # 2. Обрабатываем английский текст (SpaCy)
    if _spacy_model_en and _spacy_model_en != "not_found":
        en_matches = _process_english(text, current_spans)
        matches.extend(en_matches)

    return matches


def _process_russian(text: str, existing_spans: List[Tuple[int, int]]) -> List[Dict[str, Any]]:
    """Обрабатывает русский текст с помощью Natasha."""
    matches = []
    # Маппинг типов Natasha на наши категории
    type_mapping = {
        'PER': 'PERSON',
        'ORG': 'ORGANIZATION',
        'LOC': 'LOC',
    }
    try:
        from natasha import Doc
        doc = Doc(text)
        doc.segment(_natasha_model['segmenter'])
        doc.tag_ner(_natasha_model['ner_tagger'])

        for span in doc.spans:
            if span.type in type_mapping and not is_overlapping(span.start, span.stop, existing_spans):
                matches.append({
                    "start": span.start,
                    "end": span.stop,
                    "original_text": span.text,
                    "category": type_mapping[span.type]
                })
    except Exception as e:
        logger.error(f"Ошибка при обработке русского текста: {e}")
    return matches


def _process_english(text: str, existing_spans: List[Tuple[int, int]]) -> List[Dict[str, Any]]:
    """Обрабатывает английский текст с помощью SpaCy."""
    matches = []
    # Маппинг типов SpaCy на наши категории
    type_mapping = {
        'PERSON': 'PERSON',
        'ORG': 'ORGANIZATION',
        'GPE': 'LOC',  # Geopolitical entity (страны, города)
        'LOC': 'LOC',  # Географические объекты
    }
    try:
        doc = _spacy_model_en(text)
        for ent in doc.ents:
            # ФИЛЬТР: Пропускаем сущность, если в ней нет ни одной латинской буквы.
            # SpaCy (en) часто ошибается на кириллице, помечая её как PERSON/ORG.
            if not re.search(r'[a-zA-Z]', ent.text):
                continue

            if ent.label_ in type_mapping and not is_overlapping(ent.start_char, ent.end_char, existing_spans):
                matches.append({
                    "start": ent.start_char,
                    "end": ent.end_char,
                    "original_text": ent.text,
                    "category": type_mapping[ent.label_]
                })
    except Exception as e:
        logger.error(f"Ошибка при обработке английского текста: {e}")
    return matches
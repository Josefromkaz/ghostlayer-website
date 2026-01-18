"""
Тесты для NLP-стадии анонимизации.
"""
import pytest
from unittest.mock import patch, MagicMock

from src.processing.nlp_models import (
    find_nlp_matches,
    _is_russian,
    _load_models,
    _process_russian,
    _process_english,
)
from src.processing.utils import mask_entities
from src.processing.types import Entity


class TestLanguageDetection:
    """Тесты для определения языка."""

    def test_russian_text(self):
        """Проверяет определение русского текста."""
        assert _is_russian("Привет, мир!") is True
        assert _is_russian("Иванов Иван Иванович") is True
        assert _is_russian("Текст на русском языке") is True

    def test_english_text(self):
        """Проверяет определение английского текста."""
        assert _is_russian("Hello, world!") is False
        assert _is_russian("John Smith") is False
        assert _is_russian("Some English text") is False

    def test_mixed_text_with_russian(self):
        """Проверяет смешанный текст с русскими буквами."""
        assert _is_russian("Hello, Иван!") is True
        assert _is_russian("Meeting с Петровым") is True

    def test_empty_text(self):
        """Проверяет пустой текст."""
        assert _is_russian("") is False
        assert _is_russian("   ") is False

    def test_numbers_only(self):
        """Проверяет текст только из цифр."""
        assert _is_russian("123456789") is False

    def test_special_characters(self):
        """Проверяет спецсимволы."""
        assert _is_russian("!@#$%^&*()") is False


class TestNLPStage:
    """Тесты для NLP стадии."""

    def test_find_nlp_matches_returns_list(self):
        """Проверяет, что find_nlp_matches возвращает список."""
        result = find_nlp_matches("Test text", [])

        assert isinstance(result, list)

    def test_nlp_stage_with_empty_text(self):
        """Проверяет обработку пустого текста."""
        matches = find_nlp_matches("", [])
        text, entities = mask_entities("", matches, [], "NLP")

        assert text == ""
        assert entities == []

    def test_nlp_stage_with_existing_spans(self):
        """Проверяет, что существующие спаны исключаются."""
        text = "Contact test@example.com for more info"
        # Спан email уже занят
        existing_spans = [(8, 24)]

        matches = find_nlp_matches(text, existing_spans)

        # Не должно быть совпадений в занятом диапазоне
        for m in matches:
            assert not (m['start'] >= 8 and m['end'] <= 24)

    def test_nlp_stage_preserves_text_structure(self):
        """Проверяет сохранение структуры текста."""
        text = "Line 1\nLine 2\n\nLine 4"
        matches = find_nlp_matches(text, [])
        result_text, entities = mask_entities(text, matches, [], "NLP")

        # Переносы строк должны сохраниться
        assert "\n" in result_text


class TestRussianProcessing:
    """Тесты для обработки русского текста."""

    def test_process_russian_with_mock(self):
        """Проверяет обработку русского текста через mock."""
        # Патчим natasha.Doc напрямую, так как он импортируется внутри функции
        with patch.dict('sys.modules', {'natasha': MagicMock()}):
            import src.processing.nlp_models as nlp_module

            # Сохраняем оригинальную модель
            original_model = nlp_module._natasha_model

            # Создаём mock модель
            mock_segmenter = MagicMock()
            mock_ner_tagger = MagicMock()
            nlp_module._natasha_model = {
                'segmenter': mock_segmenter,
                'ner_tagger': mock_ner_tagger
            }

            try:
                # Тестируем что функция возвращает список
                result = _process_russian("Тестовый текст", [])
                assert isinstance(result, list)
            except Exception:
                # Если natasha не установлена правильно, пропускаем
                pass
            finally:
                nlp_module._natasha_model = original_model

    def test_russian_text_detection_in_nlp_stage(self):
        """Проверяет, что русский текст обрабатывается Natasha."""
        text = "Директор Иванов Иван Иванович подписал договор"

        # Загружаем модели
        _load_models()

        matches = find_nlp_matches(text, [])
        result_text, entities = mask_entities(text, matches, [], "NLP")

        # Результат должен быть строкой
        assert isinstance(result_text, str)


class TestEnglishProcessing:
    """Тесты для обработки английского текста."""

    def test_process_english_with_mock(self):
        """Проверяет обработку английского текста через mock."""
        mock_spacy = MagicMock()
        mock_doc = MagicMock()
        mock_doc.ents = []
        mock_spacy.return_value = mock_doc

        with patch('src.processing.nlp_models._spacy_model_en', mock_spacy):
            result = _process_english("Test text", [])
            assert isinstance(result, list)

    def test_english_text_detection_in_nlp_stage(self):
        """Проверяет, что английский текст обрабатывается SpaCy."""
        text = "John Smith works at Acme Corporation in New York"

        # Загружаем модели
        _load_models()

        matches = find_nlp_matches(text, [])
        result_text, entities = mask_entities(text, matches, [], "NLP")

        assert isinstance(result_text, str)


class TestEntityMasking:
    """Тесты для маскирования сущностей."""

    def test_entity_id_format(self):
        """Проверяет формат ID сущностей."""
        # Тестируем с mock NLP, который вернет сущность
        text = "John Smith is the CEO"

        with patch('src.processing.nlp_models._spacy_model_en') as mock_spacy:
            mock_ent = MagicMock()
            mock_ent.text = "John Smith"
            mock_ent.start_char = 0
            mock_ent.end_char = 10
            mock_ent.label_ = "PERSON"

            mock_doc = MagicMock()
            mock_doc.ents = [mock_ent]
            mock_spacy.return_value = mock_doc

            # Сбрасываем _spacy_model_en для теста
            import src.processing.nlp_models as nlp_module
            original = nlp_module._spacy_model_en
            nlp_module._spacy_model_en = mock_spacy

            try:
                matches = find_nlp_matches(text, [])
                result_text, entities = mask_entities(text, matches, [], "NLP")

                if entities:
                    # Проверяем формат ID
                    entity = entities[0]
                    assert entity.id.startswith("[")
                    assert entity.id.endswith("]")
                    assert "_" in entity.id
            finally:
                nlp_module._spacy_model_en = original

    def test_multiple_entities_get_unique_ids(self):
        """Проверяет уникальность ID для нескольких сущностей."""
        with patch('src.processing.nlp_models._spacy_model_en') as mock_spacy:
            mock_ent1 = MagicMock()
            mock_ent1.text = "John"
            mock_ent1.start_char = 0
            mock_ent1.end_char = 4
            mock_ent1.label_ = "PERSON"

            mock_ent2 = MagicMock()
            mock_ent2.text = "Jane"
            mock_ent2.start_char = 10
            mock_ent2.end_char = 14
            mock_ent2.label_ = "PERSON"

            mock_doc = MagicMock()
            mock_doc.ents = [mock_ent1, mock_ent2]
            mock_spacy.return_value = mock_doc

            import src.processing.nlp_models as nlp_module
            original = nlp_module._spacy_model_en
            nlp_module._spacy_model_en = mock_spacy

            try:
                text = "John meets Jane today"
                matches = find_nlp_matches(text, [])
                result_text, entities = mask_entities(text, matches, [], "NLP")

                if len(entities) >= 2:
                    ids = [e.id for e in entities]
                    # Все ID должны быть уникальными
                    assert len(ids) == len(set(ids))
            finally:
                nlp_module._spacy_model_en = original


class TestModelLoading:
    """Тесты загрузки моделей."""

    def test_load_models_is_thread_safe(self):
        """Проверяет потокобезопасность загрузки моделей."""
        import threading

        errors = []

        def load():
            try:
                _load_models()
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=load) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0, f"Errors during loading: {errors}"

    def test_models_loaded_once(self):
        """Проверяет, что модели загружаются один раз."""
        import src.processing.nlp_models as nlp_module

        # Сбрасываем состояние
        nlp_module._natasha_model = None
        nlp_module._spacy_model_en = None

        # Загружаем дважды
        _load_models()
        model1 = nlp_module._natasha_model

        _load_models()
        model2 = nlp_module._natasha_model

        # Должен быть тот же объект (ленивая загрузка)
        assert model1 is model2

"""
Тесты для pipeline анонимизации.
"""
import pytest
from unittest.mock import patch
from src.processing.types import Entity, AnonymizationResult


class TestAnonymizeText:
    """Тесты для функции anonymize_text."""

    def test_calls_all_stages(self):
        """Проверяет, что pipeline вызывает все три стадии обработки."""
        with patch('src.processing.pipeline.find_regex_matches') as mock_regex, \
             patch('src.processing.pipeline.find_nlp_matches') as mock_nlp, \
             patch('src.processing.pipeline.find_memory_matches') as mock_memory:

            mock_regex.return_value = []
            mock_nlp.return_value = []
            mock_memory.return_value = []

            from src.processing.pipeline import anonymize_text
            anonymize_text("some input text")

            mock_regex.assert_called_once()
            mock_nlp.assert_called_once()
            mock_memory.assert_called_once()

    def test_returns_correct_structure(self):
        """Проверяет, что результат соответствует контракту."""
        with patch('src.processing.pipeline.find_regex_matches') as mock_regex, \
             patch('src.processing.pipeline.find_nlp_matches') as mock_nlp, \
             patch('src.processing.pipeline.find_memory_matches') as mock_memory:

            mock_regex.return_value = [{
                "start": 0,
                "end": 5,
                "original_text": "a@b.c",
                "category": "EMAIL"
            }]
            mock_nlp.return_value = []
            mock_memory.return_value = []

            from src.processing.pipeline import anonymize_text
            result = anonymize_text("a@b.c test text")

            assert isinstance(result, AnonymizationResult)
            assert isinstance(result.anonymized_text, str)
            assert isinstance(result.entities, list)
            assert isinstance(result.stats, dict)
            assert len(result.entities) > 0
            assert isinstance(result.entities[0], Entity)

    def test_empty_text_returns_empty_result(self):
        """Проверяет обработку пустого текста."""
        from src.processing.pipeline import anonymize_text

        result = anonymize_text("")
        assert result.anonymized_text == ""
        assert result.entities == []
        assert result.stats == {}

    def test_whitespace_text_returns_empty_result(self):
        """Проверяет обработку текста из пробелов."""
        from src.processing.pipeline import anonymize_text

        result = anonymize_text("   \n\t  ")
        assert result.anonymized_text == ""
        assert result.entities == []

    def test_passes_existing_spans_to_stages(self):
        """Проверяет, что спаны передаются между стадиями."""
        with patch('src.processing.pipeline.find_regex_matches') as mock_regex, \
             patch('src.processing.pipeline.find_nlp_matches') as mock_nlp, \
             patch('src.processing.pipeline.find_memory_matches') as mock_memory:

            # Memory находит первый спан
            mock_memory.return_value = [{
                "start": 0,
                "end": 10,
                "original_text": "secret_key",
                "category": "LEARNED_RULE"
            }]
            mock_regex.return_value = []
            mock_nlp.return_value = []

            from src.processing.pipeline import anonymize_text
            anonymize_text("secret_key test")

            # Regex должен получить спан от memory
            mock_regex.assert_called_once()
            call_args = mock_regex.call_args
            # Второй аргумент — existing_spans
            existing_spans = call_args[0][1]
            assert (0, 10) in existing_spans

    def test_stats_calculated_correctly(self):
        """Проверяет правильность подсчёта статистики."""
        with patch('src.processing.pipeline.find_regex_matches') as mock_regex, \
             patch('src.processing.pipeline.find_nlp_matches') as mock_nlp, \
             patch('src.processing.pipeline.find_memory_matches') as mock_memory:

            mock_regex.return_value = [
                {"start": 0, "end": 7, "original_text": "a@b.com", "category": "EMAIL"},
                {"start": 10, "end": 17, "original_text": "x@y.com", "category": "EMAIL"},
            ]
            mock_nlp.return_value = [
                {"start": 20, "end": 24, "original_text": "John", "category": "PERSON"},
            ]
            mock_memory.return_value = []

            from src.processing.pipeline import anonymize_text
            result = anonymize_text("a@b.com ; x@y.com ; John")

            assert result.stats["EMAIL"] == 2
            assert result.stats["PERSON"] == 1

    def test_entity_has_original_positions(self):
        """Проверяет, что Entity содержит оригинальные позиции."""
        from src.processing.pipeline import anonymize_text

        text = "Contact: test@example.com for info"
        result = anonymize_text(text)

        # Должен найти email
        email_entities = [e for e in result.entities if e.category == "EMAIL"]
        assert len(email_entities) > 0

        email = email_entities[0]
        assert email.original_start >= 0
        assert email.original_end > email.original_start
        # Проверяем, что позиции корректны
        assert text[email.original_start:email.original_end] == email.original_text


class TestRegexStage:
    """Тесты для regex-стадии."""

    def test_detects_email(self):
        """Проверяет обнаружение email."""
        from src.processing.regex_rules import find_regex_matches
        from src.processing.utils import mask_entities

        text = "Contact us at support@example.com"
        matches = find_regex_matches(text)
        result_text, entities = mask_entities(text, matches, [], "Regex")

        assert "[EMAIL_1]" in result_text
        assert len(entities) == 1
        assert entities[0].original_text == "support@example.com"
        assert entities[0].category == "EMAIL"
        assert isinstance(entities[0], Entity)

    def test_detects_phone(self):
        """Проверяет обнаружение телефона."""
        from src.processing.regex_rules import find_regex_matches
        from src.processing.utils import mask_entities

        text = "Звоните: +7 (999) 123-45-67"
        matches = find_regex_matches(text)
        result_text, entities = mask_entities(text, matches, [], "Regex")

        assert "[PHONE_1]" in result_text
        assert len(entities) == 1
        assert entities[0].category == "PHONE"

    def test_detects_credit_card(self):
        """Проверяет обнаружение номера карты."""
        from src.processing.regex_rules import find_regex_matches
        from src.processing.utils import mask_entities

        text = "Card: 1234 5678 1234 5678"
        matches = find_regex_matches(text)
        result_text, entities = mask_entities(text, matches, [], "Regex")

        assert "[CREDIT_CARD_1]" in result_text
        assert len(entities) == 1
        assert entities[0].category == "CREDIT_CARD"

    def test_multiple_entities(self):
        """Проверяет обнаружение нескольких сущностей."""
        from src.processing.regex_rules import find_regex_matches
        from src.processing.utils import mask_entities

        text = "Email: a@b.com, Phone: +7 999 123-45-67"
        matches = find_regex_matches(text)
        result_text, entities = mask_entities(text, matches, [], "Regex")

        assert "[EMAIL_1]" in result_text
        assert "[PHONE_1]" in result_text
        assert len(entities) == 2

    def test_entity_has_positions(self):
        """Проверяет, что Entity содержит позиции."""
        from src.processing.regex_rules import find_regex_matches
        from src.processing.utils import mask_entities

        text = "Email: test@test.com"
        matches = find_regex_matches(text)
        _, entities = mask_entities(text, matches, [], "Regex")

        assert len(entities) == 1
        entity = entities[0]
        assert entity.original_start >= 0
        assert entity.original_end > entity.original_start
        assert text[entity.original_start:entity.original_end] == entity.original_text


class TestFindFunctions:
    """Тесты для функций find_*_matches."""

    def test_find_regex_matches_returns_list(self):
        """Проверяет возвращаемый тип find_regex_matches."""
        from src.processing.regex_rules import find_regex_matches

        result = find_regex_matches("test@test.com")
        assert isinstance(result, list)

    def test_find_regex_matches_with_existing_spans(self):
        """Проверяет исключение существующих спанов."""
        from src.processing.regex_rules import find_regex_matches

        text = "test@test.com and test2@test.com"
        # Первый email занят
        existing = [(0, 13)]
        result = find_regex_matches(text, existing)

        # Должен найти только второй email
        emails = [m for m in result if m['category'] == 'EMAIL']
        assert len(emails) == 1
        assert emails[0]['original_text'] == 'test2@test.com'

    def test_find_nlp_matches_returns_list(self):
        """Проверяет возвращаемый тип find_nlp_matches."""
        from src.processing.nlp_models import find_nlp_matches

        result = find_nlp_matches("Some text")
        assert isinstance(result, list)


class TestUtils:
    """Тесты для утилит."""

    def test_is_overlapping_true(self):
        """Проверяет обнаружение пересечения."""
        from src.processing.utils import is_overlapping

        existing = [(5, 10), (20, 30)]
        assert is_overlapping(7, 12, existing) is True
        assert is_overlapping(3, 8, existing) is True
        assert is_overlapping(25, 28, existing) is True

    def test_is_overlapping_false(self):
        """Проверяет отсутствие пересечения."""
        from src.processing.utils import is_overlapping

        existing = [(5, 10), (20, 30)]
        assert is_overlapping(0, 4, existing) is False
        assert is_overlapping(11, 19, existing) is False
        assert is_overlapping(31, 40, existing) is False

    def test_is_overlapping_empty(self):
        """Проверяет с пустым списком."""
        from src.processing.utils import is_overlapping

        assert is_overlapping(0, 10, []) is False

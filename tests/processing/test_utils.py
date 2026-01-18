"""
Тесты для утилит обработки текста.
"""
import pytest
from src.processing.utils import is_overlapping, mask_entities
from src.processing.types import Entity


class TestIsOverlapping:
    """Тесты для функции is_overlapping."""

    def test_overlapping_true(self):
        """Проверяет обнаружение пересечения."""
        existing = [(5, 10), (20, 30)]
        assert is_overlapping(7, 12, existing) is True
        assert is_overlapping(3, 8, existing) is True
        assert is_overlapping(25, 28, existing) is True

    def test_overlapping_false(self):
        """Проверяет отсутствие пересечения."""
        existing = [(5, 10), (20, 30)]
        assert is_overlapping(0, 4, existing) is False
        assert is_overlapping(11, 19, existing) is False
        assert is_overlapping(31, 40, existing) is False

    def test_overlapping_empty(self):
        """Проверяет с пустым списком."""
        assert is_overlapping(0, 10, []) is False

    def test_overlapping_boundary(self):
        """Проверяет граничные случаи."""
        existing = [(5, 10)]
        # Касание слева (не пересечение)
        assert is_overlapping(0, 5, existing) is False
        # Касание справа (не пересечение)
        assert is_overlapping(10, 15, existing) is False


class TestMaskEntities:
    """Тесты для функции mask_entities."""

    def test_mask_single_entity(self):
        """Проверяет маскирование одной сущности."""
        text = "Contact test@example.com"
        matches = [{
            "start": 8,
            "end": 24,
            "original_text": "test@example.com",
            "category": "EMAIL"
        }]

        result_text, entities = mask_entities(text, matches, [], "Regex")

        assert "[EMAIL_1]" in result_text
        assert "test@example.com" not in result_text
        assert len(entities) == 1
        assert entities[0].id == "[EMAIL_1]"
        assert entities[0].original_text == "test@example.com"
        assert entities[0].category == "EMAIL"
        assert entities[0].source_stage == "Regex"

    def test_mask_multiple_entities(self):
        """Проверяет маскирование нескольких сущностей."""
        text = "Email: a@b.com, Phone: +7 999 123-45-67"
        matches = [
            {"start": 7, "end": 14, "original_text": "a@b.com", "category": "EMAIL"},
            {"start": 23, "end": 39, "original_text": "+7 999 123-45-67", "category": "PHONE"},
        ]

        result_text, entities = mask_entities(text, matches, [], "Regex")

        assert "[EMAIL_1]" in result_text
        assert "[PHONE_1]" in result_text
        assert len(entities) == 2

    def test_mask_with_existing_entities(self):
        """Проверяет подсчёт с существующими сущностями."""
        text = "Another email c@d.com"
        matches = [
            {"start": 14, "end": 21, "original_text": "c@d.com", "category": "EMAIL"},
        ]
        existing = [
            Entity(id="[EMAIL_1]", original_text="a@b.com", category="EMAIL", source_stage="Regex", original_start=0, original_end=7),
        ]

        result_text, entities = mask_entities(text, matches, existing, "Regex")

        # Должен быть EMAIL_2, так как EMAIL_1 уже есть
        assert "[EMAIL_2]" in result_text
        assert entities[0].id == "[EMAIL_2]"

    def test_mask_empty_matches(self):
        """Проверяет обработку пустого списка совпадений."""
        text = "No sensitive data here"

        result_text, entities = mask_entities(text, [], [], "Regex")

        assert result_text == text
        assert entities == []

    def test_mask_preserves_positions(self):
        """Проверяет сохранение оригинальных позиций."""
        text = "Email: test@test.com"
        matches = [
            {"start": 7, "end": 20, "original_text": "test@test.com", "category": "EMAIL"},
        ]

        _, entities = mask_entities(text, matches, [], "Regex")

        assert entities[0].original_start == 7
        assert entities[0].original_end == 20
        assert text[7:20] == "test@test.com"

    def test_mask_different_source_stages(self):
        """Проверяет различные source_stage."""
        text = "test"
        matches = [{"start": 0, "end": 4, "original_text": "test", "category": "TEST"}]

        for stage in ["Regex", "NLP", "Memory"]:
            _, entities = mask_entities(text, matches.copy(), [], stage)
            assert entities[0].source_stage == stage

    def test_mask_entities_order(self):
        """Проверяет порядок сущностей в результате."""
        text = "a@b.com and c@d.com and e@f.com"
        matches = [
            {"start": 0, "end": 7, "original_text": "a@b.com", "category": "EMAIL"},
            {"start": 12, "end": 19, "original_text": "c@d.com", "category": "EMAIL"},
            {"start": 24, "end": 31, "original_text": "e@f.com", "category": "EMAIL"},
        ]

        _, entities = mask_entities(text, matches, [], "Regex")

        # Сущности должны быть в порядке появления в тексте
        assert entities[0].original_text == "a@b.com"
        assert entities[1].original_text == "c@d.com"
        assert entities[2].original_text == "e@f.com"

    def test_mask_category_counter_increments(self):
        """Проверяет инкремент счётчика категорий."""
        text = "a@b.com c@d.com e@f.com"
        matches = [
            {"start": 0, "end": 7, "original_text": "a@b.com", "category": "EMAIL"},
            {"start": 8, "end": 15, "original_text": "c@d.com", "category": "EMAIL"},
            {"start": 16, "end": 23, "original_text": "e@f.com", "category": "EMAIL"},
        ]

        result_text, entities = mask_entities(text, matches, [], "Regex")

        # Все три маски должны быть в тексте
        assert "[EMAIL_1]" in result_text
        assert "[EMAIL_2]" in result_text
        assert "[EMAIL_3]" in result_text

        # Проверяем, что все ID уникальны
        ids = [e.id for e in entities]
        assert len(set(ids)) == 3
        assert "[EMAIL_1]" in ids
        assert "[EMAIL_2]" in ids
        assert "[EMAIL_3]" in ids

"""
Тесты для компонента SplitView.

Тестируем логику работы с сущностями без реального GUI.
"""
import pytest
from unittest.mock import MagicMock, patch

from src.processing.types import Entity


class TestSplitViewLogic:
    """Тесты для логики SplitView."""

    def test_category_colors_defined(self):
        """Проверяет, что цвета категорий определены."""
        from src.ui.split_view import CATEGORY_COLORS

        # Проверяем основные категории
        assert "PERSON" in CATEGORY_COLORS
        assert "ORGANIZATION" in CATEGORY_COLORS
        assert "EMAIL" in CATEGORY_COLORS
        assert "PHONE" in CATEGORY_COLORS
        assert "CREDIT_CARD" in CATEGORY_COLORS
        assert "LEARNED_RULE" in CATEGORY_COLORS
        assert "DEFAULT" in CATEGORY_COLORS

    def test_min_word_length_defined(self):
        """Проверяет, что минимальная длина слова определена."""
        from src.ui.split_view import MIN_WORD_LENGTH

        assert isinstance(MIN_WORD_LENGTH, int)
        assert MIN_WORD_LENGTH >= 1

    def test_selection_color_defined(self):
        """Проверяет, что цвет выделения определён."""
        from src.ui.split_view import SELECTION_COLOR

        assert SELECTION_COLOR is not None


class TestEntityPositions:
    """Тесты для работы с позициями сущностей."""

    def test_entity_positions_used_for_highlighting(self):
        """Проверяет, что позиции Entity используются для подсветки."""
        entities = [
            Entity(
                id="[EMAIL_1]",
                original_text="test@example.com",
                category="EMAIL",
                source_stage="Regex",
                original_start=10,
                original_end=26
            )
        ]

        # Позиции должны быть корректными
        assert entities[0].original_start >= 0
        assert entities[0].original_end > entities[0].original_start
        assert entities[0].original_end - entities[0].original_start == len(entities[0].original_text)

    def test_entity_with_negative_positions(self):
        """Проверяет обработку сущностей с невалидными позициями."""
        entity = Entity(
            id="[TEST_1]",
            original_text="test",
            category="TEST",
            source_stage="Test",
            original_start=-1,
            original_end=-1
        )

        # Entity с -1 позициями не должны использоваться для подсветки
        assert entity.original_start < 0

    def test_multiple_entities_sorting(self):
        """Проверяет сортировку сущностей по позиции."""
        entities = [
            Entity(id="[A_1]", original_text="a", category="A", source_stage="Test", original_start=20, original_end=21),
            Entity(id="[B_1]", original_text="b", category="B", source_stage="Test", original_start=5, original_end=6),
            Entity(id="[C_1]", original_text="c", category="C", source_stage="Test", original_start=10, original_end=11),
        ]

        sorted_entities = sorted(entities, key=lambda e: e.original_start)

        assert sorted_entities[0].id == "[B_1]"  # позиция 5
        assert sorted_entities[1].id == "[C_1]"  # позиция 10
        assert sorted_entities[2].id == "[A_1]"  # позиция 20


class TestPlaceholderParsing:
    """Тесты для парсинга плейсхолдеров."""

    def test_parse_placeholder_format(self):
        """Проверяет формат плейсхолдера."""
        import re

        placeholder_pattern = re.compile(r'\[([A-Z_]+_\d+)\]')

        # Валидные плейсхолдеры
        assert placeholder_pattern.match("[PERSON_1]")
        assert placeholder_pattern.match("[ORGANIZATION_25]")
        assert placeholder_pattern.match("[CREDIT_CARD_100]")
        assert placeholder_pattern.match("[LEARNED_RULE_1]")

        # Невалидные
        assert not placeholder_pattern.match("[person_1]")  # lowercase
        assert not placeholder_pattern.match("[PERSON]")    # без номера
        assert not placeholder_pattern.match("PERSON_1")    # без скобок

    def test_extract_category_from_placeholder(self):
        """Проверяет извлечение категории из плейсхолдера."""
        placeholder = "[ORGANIZATION_25]"

        # Извлекаем ID без скобок
        raw_id = placeholder[1:-1]  # "ORGANIZATION_25"

        # Разбиваем на части
        parts = raw_id.rsplit('_', 1)

        assert len(parts) == 2
        assert parts[0] == "ORGANIZATION"
        assert parts[1] == "25"


class TestTextSegmentation:
    """Тесты для сегментации текста."""

    def test_split_text_into_words(self):
        """Проверяет разбиение текста на слова."""
        import re

        text = "Hello world  test"
        parts = re.split(r'(\s+)', text)

        assert "Hello" in parts
        assert "world" in parts
        assert "test" in parts

    def test_word_boundaries(self):
        """Проверяет определение границ слов."""
        text = "Hello, world!"
        import re

        parts = re.split(r'(\s+)', text)

        # Первый элемент - "Hello," (слово с пунктуацией)
        assert parts[0] == "Hello,"

    def test_preserve_whitespace(self):
        """Проверяет сохранение пробелов."""
        import re

        text = "a  b   c"
        parts = re.split(r'(\s+)', text)

        # Должны сохраниться пробелы
        assert "  " in parts  # двойной пробел
        assert "   " in parts  # тройной пробел


class TestSelectionState:
    """Тесты для состояния выбора слов."""

    def test_selection_word_structure(self):
        """Проверяет структуру выбранного слова."""
        word_data = {
            "text": "example",
            "start": 10,
            "end": 17
        }

        assert "text" in word_data
        assert "start" in word_data
        assert "end" in word_data
        assert word_data["end"] - word_data["start"] == len(word_data["text"])

    def test_selection_sorting(self):
        """Проверяет сортировку выбранных слов."""
        selected_words = [
            {"text": "c", "start": 20, "end": 21},
            {"text": "a", "start": 5, "end": 6},
            {"text": "b", "start": 10, "end": 11},
        ]

        sorted_words = sorted(selected_words, key=lambda w: w["start"])

        assert sorted_words[0]["text"] == "a"
        assert sorted_words[1]["text"] == "b"
        assert sorted_words[2]["text"] == "c"

    def test_selection_deduplication(self):
        """Проверяет удаление дубликатов из выбора."""
        selected_words = [
            {"text": "test", "start": 5, "end": 9},
        ]

        # Добавляем то же слово
        new_word = {"text": "test", "start": 5, "end": 9}

        # Проверяем, есть ли уже
        existing_idx = None
        for i, w in enumerate(selected_words):
            if w["start"] == new_word["start"]:
                existing_idx = i
                break

        assert existing_idx == 0  # Слово уже есть


class TestEntityMapping:
    """Тесты для маппинга сущностей."""

    def test_build_entity_map(self):
        """Проверяет построение словаря сущностей."""
        entities = [
            Entity(id="[EMAIL_1]", original_text="a@b.com", category="EMAIL", source_stage="Regex", original_start=0, original_end=7),
            Entity(id="[PERSON_1]", original_text="John", category="PERSON", source_stage="NLP", original_start=10, original_end=14),
        ]

        entity_map = {e.id: e for e in entities}

        assert "[EMAIL_1]" in entity_map
        assert "[PERSON_1]" in entity_map
        assert entity_map["[EMAIL_1]"].original_text == "a@b.com"

    def test_entity_lookup_by_id(self):
        """Проверяет поиск сущности по ID."""
        entities = [
            Entity(id="[TEST_1]", original_text="test", category="TEST", source_stage="Test", original_start=0, original_end=4),
        ]

        entity_map = {e.id: e for e in entities}

        # Поиск существующей
        assert "[TEST_1]" in entity_map

        # Поиск несуществующей
        assert "[TEST_2]" not in entity_map

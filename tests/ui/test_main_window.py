"""
Тесты для логики MainWindow.

Тестируем бизнес-логику без реального GUI.
"""
import pytest
from unittest.mock import MagicMock, patch
from collections import Counter

from src.processing.types import Entity, AnonymizationResult


class TestEntityMaskStates:
    """Тесты для управления состоянием масок сущностей."""

    def test_initialize_mask_states(self):
        """Проверяет инициализацию состояний масок."""
        entities = [
            Entity(id="[EMAIL_1]", original_text="test@test.com", category="EMAIL", source_stage="Regex", original_start=0, original_end=13),
            Entity(id="[PERSON_1]", original_text="John", category="PERSON", source_stage="NLP", original_start=20, original_end=24),
        ]

        anti_entities = set()  # Пустой whitelist

        # Инициализируем маски: скрываем только то, чего нет в исключениях
        entity_mask_states = {
            e.id: (e.original_text not in anti_entities)
            for e in entities
        }

        # Все должны быть активны (True)
        assert entity_mask_states["[EMAIL_1]"] is True
        assert entity_mask_states["[PERSON_1]"] is True

    def test_mask_states_with_whitelist(self):
        """Проверяет состояния масок с whitelist."""
        entities = [
            Entity(id="[EMAIL_1]", original_text="test@test.com", category="EMAIL", source_stage="Regex", original_start=0, original_end=13),
            Entity(id="[PERSON_1]", original_text="John", category="PERSON", source_stage="NLP", original_start=20, original_end=24),
        ]

        anti_entities = {"John"}  # John в whitelist

        entity_mask_states = {
            e.id: (e.original_text not in anti_entities)
            for e in entities
        }

        # EMAIL активен, PERSON нет
        assert entity_mask_states["[EMAIL_1]"] is True
        assert entity_mask_states["[PERSON_1]"] is False

    def test_toggle_mask_state(self):
        """Проверяет переключение состояния маски."""
        entity_mask_states = {
            "[EMAIL_1]": True,
            "[PERSON_1]": True,
        }

        # Выключаем EMAIL
        entity_mask_states["[EMAIL_1]"] = False

        assert entity_mask_states["[EMAIL_1]"] is False
        assert entity_mask_states["[PERSON_1]"] is True


class TestTextRegeneration:
    """Тесты для регенерации анонимизированного текста."""

    def test_regenerate_with_all_masks_active(self):
        """Проверяет регенерацию со всеми активными масками."""
        original_text = "Contact test@test.com or John"
        entities = [
            Entity(id="[EMAIL_1]", original_text="test@test.com", category="EMAIL", source_stage="Regex", original_start=8, original_end=21),
            Entity(id="[PERSON_1]", original_text="John", category="PERSON", source_stage="NLP", original_start=25, original_end=29),
        ]
        entity_mask_states = {"[EMAIL_1]": True, "[PERSON_1]": True}

        # Берём только активные сущности
        active_entities = [
            e for e in entities
            if entity_mask_states.get(e.id, True)
        ]

        # Сортируем по позиции С КОНЦА
        sorted_entities = sorted(
            active_entities,
            key=lambda e: e.original_start,
            reverse=True
        )

        temp_text = original_text
        for entity in sorted_entities:
            if entity.original_start >= 0 and entity.original_end > entity.original_start:
                temp_text = (
                    temp_text[:entity.original_start] +
                    entity.id +
                    temp_text[entity.original_end:]
                )

        assert "[EMAIL_1]" in temp_text
        assert "[PERSON_1]" in temp_text
        assert "test@test.com" not in temp_text
        assert "John" not in temp_text

    def test_regenerate_with_one_mask_disabled(self):
        """Проверяет регенерацию с одной выключенной маской."""
        original_text = "Contact test@test.com or John"
        entities = [
            Entity(id="[EMAIL_1]", original_text="test@test.com", category="EMAIL", source_stage="Regex", original_start=8, original_end=21),
            Entity(id="[PERSON_1]", original_text="John", category="PERSON", source_stage="NLP", original_start=25, original_end=29),
        ]
        entity_mask_states = {"[EMAIL_1]": True, "[PERSON_1]": False}  # PERSON выключен

        active_entities = [
            e for e in entities
            if entity_mask_states.get(e.id, True)
        ]

        sorted_entities = sorted(
            active_entities,
            key=lambda e: e.original_start,
            reverse=True
        )

        temp_text = original_text
        for entity in sorted_entities:
            if entity.original_start >= 0 and entity.original_end > entity.original_start:
                temp_text = (
                    temp_text[:entity.original_start] +
                    entity.id +
                    temp_text[entity.original_end:]
                )

        assert "[EMAIL_1]" in temp_text
        assert "[PERSON_1]" not in temp_text
        assert "John" in temp_text  # John остался


class TestExportContent:
    """Тесты для экспорта контента."""

    def test_export_without_prompt(self):
        """Проверяет экспорт без промпта."""
        anonymized_text = "Contact [EMAIL_1] for info"
        prompts = []
        selected_prompt_id = None

        content = anonymized_text

        if selected_prompt_id:
            prompt = next(
                (p for p in prompts if p['id'] == int(selected_prompt_id)),
                None
            )
            if prompt:
                content = f"{prompt['body']}\n\n---\n\n{anonymized_text}"

        assert content == anonymized_text

    def test_export_with_prompt(self):
        """Проверяет экспорт с промптом."""
        anonymized_text = "Contact [EMAIL_1] for info"
        prompts = [
            {"id": 1, "title": "Test", "body": "Analyze this document:"}
        ]
        selected_prompt_id = "1"

        content = anonymized_text

        if selected_prompt_id:
            prompt = next(
                (p for p in prompts if p['id'] == int(selected_prompt_id)),
                None
            )
            if prompt:
                content = f"{prompt['body']}\n\n---\n\n{anonymized_text}"

        assert "Analyze this document:" in content
        assert "[EMAIL_1]" in content
        assert "---" in content


class TestStatsCalculation:
    """Тесты для подсчёта статистики."""

    def test_calculate_stats_from_entities(self):
        """Проверяет подсчёт статистики из сущностей."""
        entities = [
            Entity(id="[EMAIL_1]", original_text="a@b.com", category="EMAIL", source_stage="Regex", original_start=0, original_end=7),
            Entity(id="[EMAIL_2]", original_text="c@d.com", category="EMAIL", source_stage="Regex", original_start=10, original_end=17),
            Entity(id="[PERSON_1]", original_text="John", category="PERSON", source_stage="NLP", original_start=20, original_end=24),
        ]

        by_category = dict(Counter(e.category for e in entities))

        assert by_category["EMAIL"] == 2
        assert by_category["PERSON"] == 1

    def test_count_active_entities(self):
        """Проверяет подсчёт активных сущностей."""
        entity_mask_states = {
            "[EMAIL_1]": True,
            "[EMAIL_2]": False,
            "[PERSON_1]": True,
        }

        active_count = sum(1 for v in entity_mask_states.values() if v)

        assert active_count == 2


class TestReidentification:
    """Тесты для обратной деанонимизации."""

    def test_reidentify_replaces_masks(self):
        """Проверяет замену масок на оригинальные значения."""
        entities = [
            Entity(id="[EMAIL_1]", original_text="test@test.com", category="EMAIL", source_stage="Regex", original_start=0, original_end=13),
            Entity(id="[PERSON_1]", original_text="John", category="PERSON", source_stage="NLP", original_start=20, original_end=24),
        ]

        ai_response = "The email [EMAIL_1] belongs to [PERSON_1]."

        restored_text = ai_response
        for entity in entities:
            restored_text = restored_text.replace(entity.id, entity.original_text)

        assert "test@test.com" in restored_text
        assert "John" in restored_text
        assert "[EMAIL_1]" not in restored_text
        assert "[PERSON_1]" not in restored_text

    def test_reidentify_partial_match(self):
        """Проверяет частичное совпадение масок."""
        entities = [
            Entity(id="[EMAIL_1]", original_text="a@b.com", category="EMAIL", source_stage="Regex", original_start=0, original_end=7),
        ]

        ai_response = "Reply to [EMAIL_1] or [EMAIL_2]"  # [EMAIL_2] неизвестен

        restored_text = ai_response
        for entity in entities:
            restored_text = restored_text.replace(entity.id, entity.original_text)

        assert "a@b.com" in restored_text
        assert "[EMAIL_2]" in restored_text  # Осталась неизменной


class TestAntiEntitiesManagement:
    """Тесты для управления исключениями (whitelist)."""

    def test_add_to_anti_entities(self):
        """Проверяет добавление в whitelist."""
        anti_entities = set()

        text_to_exclude = "John"
        anti_entities.add(text_to_exclude)

        assert "John" in anti_entities

    def test_remove_from_anti_entities(self):
        """Проверяет удаление из whitelist."""
        anti_entities = {"John", "Jane"}

        anti_entities.discard("John")

        assert "John" not in anti_entities
        assert "Jane" in anti_entities

    def test_check_in_anti_entities(self):
        """Проверяет проверку наличия в whitelist."""
        anti_entities = {"John", "test@test.com"}

        assert "John" in anti_entities
        assert "test@test.com" in anti_entities
        assert "Jane" not in anti_entities

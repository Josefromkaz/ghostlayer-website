"""
Интеграционные тесты полного pipeline анонимизации.

Эти тесты проверяют работу всей системы целиком, включая:
- Чтение файлов
- Применение всех стадий анонимизации
- Корректность результатов
"""
import os
import tempfile
import pytest
from unittest.mock import patch, MagicMock

from src.services.file_service import FileService
from src.processing.pipeline import anonymize_text
from src.database.db_manager import DBManager


class TestFullPipelineIntegration:
    """Интеграционные тесты полного pipeline."""

    def test_anonymize_russian_contract(self):
        """Тест анонимизации типичного российского договора."""
        text = """
        ДОГОВОР № 123/2024

        г. Москва                                    01.01.2024

        ООО "Ромашка" в лице генерального директора Иванова Ивана Ивановича,
        действующего на основании Устава, именуемое в дальнейшем "Заказчик",
        и ИП Петров Петр Петрович (ИНН: 1234567890, ОГРНИП: 123456789012345),
        именуемый в дальнейшем "Исполнитель",

        Контактные данные:
        Телефон: +7 (999) 123-45-67
        Email: ivanov@romashka.ru

        Реквизиты: р/с 40702810123456789012 в ПАО Сбербанк
        """

        result = anonymize_text(text)

        # Проверяем, что текст был обработан
        assert result.anonymized_text != text
        assert len(result.entities) > 0

        # Проверяем основные категории
        categories = {e.category for e in result.entities}

        # Должны быть найдены: телефон, email
        # (дата в формате 01.01.2024 может перекрываться с другими паттернами)
        assert "PHONE" in categories
        assert "EMAIL" in categories

        # Проверяем, что оригинальные данные скрыты
        assert "ivanov@romashka.ru" not in result.anonymized_text
        assert "+7 (999) 123-45-67" not in result.anonymized_text

        # Проверяем статистику
        assert len(result.stats) > 0

    def test_anonymize_english_document(self):
        """Тест анонимизации английского документа."""
        text = """
        CONFIDENTIAL AGREEMENT

        Date: 01/15/2024

        Between: John Smith (john.smith@example.com)
        And: Acme Corporation

        Contact: +1-555-123-4567
        Credit Card: 4111 1111 1111 1111
        """

        result = anonymize_text(text)

        assert result.anonymized_text != text
        assert len(result.entities) > 0

        # Проверяем, что email замаскирован
        assert "john.smith@example.com" not in result.anonymized_text

        # Проверяем наличие сущностей
        categories = {e.category for e in result.entities}
        assert "EMAIL" in categories
        assert "CREDIT_CARD" in categories

    def test_anonymize_mixed_content(self):
        """Тест анонимизации смешанного контента."""
        text = """
        Клиент: Иванов Иван
        Client: John Doe

        Телефон РФ: +7 999 123-45-67
        US Phone: +1-555-999-8888

        Email: test@example.com
        Сайт: https://www.example.com
        """

        result = anonymize_text(text)

        assert len(result.entities) >= 3  # Минимум email, телефоны, URL

        # Проверяем маскировку
        assert "test@example.com" not in result.anonymized_text
        assert "https://www.example.com" not in result.anonymized_text

    def test_anonymize_empty_text(self):
        """Тест анонимизации пустого текста."""
        result = anonymize_text("")

        assert result.anonymized_text == ""
        assert result.entities == []
        assert result.stats == {}

    def test_anonymize_text_without_pii(self):
        """Тест текста без персональных данных."""
        text = "Это обычный текст без персональных данных."

        result = anonymize_text(text)

        # Текст должен остаться практически без изменений
        # (кроме возможного NLP распознавания)
        assert len(result.entities) == 0 or result.anonymized_text == text

    def test_pipeline_preserves_structure(self):
        """Тест сохранения структуры документа."""
        text = """Параграф 1

        Параграф 2

        Параграф 3"""

        result = anonymize_text(text)

        # Структура (переносы строк) должна сохраниться
        assert "\n" in result.anonymized_text
        lines = result.anonymized_text.strip().split("\n")
        assert len(lines) >= 3


class TestFileToAnonymizationIntegration:
    """Тесты интеграции чтения файла и анонимизации."""

    def test_read_and_anonymize_txt_file(self):
        """Тест чтения и анонимизации TXT файла."""
        content = """
        Контракт с Петровым Петром
        Телефон: +7 900 111-22-33
        Email: petrov@mail.ru
        """

        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.txt', delete=False, encoding='utf-8'
        ) as f:
            f.write(content)
            temp_path = f.name

        try:
            # Читаем файл
            text = FileService.read_file(temp_path)

            # Анонимизируем
            result = anonymize_text(text)

            # Проверяем результат
            assert "petrov@mail.ru" not in result.anonymized_text
            assert "+7 900 111-22-33" not in result.anonymized_text
            assert len(result.entities) >= 2
        finally:
            os.unlink(temp_path)


class TestDatabaseIntegration:
    """Тесты интеграции с базой данных."""

    @pytest.fixture
    def temp_db(self):
        """Фикстура для временной базы данных."""
        db_path = tempfile.mktemp(suffix='.db')
        yield db_path
        if os.path.exists(db_path):
            os.unlink(db_path)

    @patch("src.database.db_manager.get_license_manager")
    def test_learning_rule_affects_pipeline(self, mock_get_lm, temp_db):
        """Тест влияния правил памяти на pipeline."""
        # Mock PRO license
        mock_lm = MagicMock()
        mock_lm.can_use_feature.return_value = True
        mock_get_lm.return_value = mock_lm

        # Добавляем правило в БД
        with DBManager(db_file=temp_db) as db:
            # We also need to patch get_license_manager inside DBManager execution if it's called there
            # Since we patched the import in db_manager module via "src.database.db_manager.get_license_manager", it should work.
            db.add_learning_rule("СекретноеСлово")

        # Проверяем, что правило сохранено
        with DBManager(db_file=temp_db) as db:
            rules = db.get_all_learning_rules()
            assert len(rules) >= 1
            patterns = [r['pattern'] for r in rules]
            assert "СекретноеСлово" in patterns

    def test_prompt_crud_operations(self, temp_db):
        """Тест CRUD операций с промптами."""
        with DBManager(db_file=temp_db) as db:
            # Create
            success = db.add_prompt("Тестовый промпт", "Содержимое промпта")
            assert success

            # Read
            prompts = db.get_all_prompts()
            user_prompts = [p for p in prompts if p['is_system'] == 0]
            assert len(user_prompts) == 1
            assert user_prompts[0]['title'] == "Тестовый промпт"

            # Delete
            prompt_id = user_prompts[0]['id']
            success = db.delete_prompt(prompt_id)
            assert success

            # Verify deletion
            prompts = db.get_all_prompts()
            user_prompts = [p for p in prompts if p['is_system'] == 0]
            assert len(user_prompts) == 0

    def test_system_prompts_cannot_be_deleted(self, temp_db):
        """Тест защиты системных промптов от удаления."""
        with DBManager(db_file=temp_db) as db:
            prompts = db.get_all_prompts()
            system_prompts = [p for p in prompts if p['is_system'] == 1]

            if system_prompts:
                system_id = system_prompts[0]['id']
                success = db.delete_prompt(system_id)
                assert success is False  # Системные промпты не удаляются


class TestEdgeCases:
    """Тесты граничных случаев."""

    def test_very_long_text(self):
        """Тест обработки очень длинного текста."""
        # Генерируем текст 100KB с email адресами
        base = "Текст с email test{}@example.com и телефоном +7 999 {}. "
        text = "".join(base.format(i, f"{i:07d}") for i in range(1000))

        result = anonymize_text(text)

        # Должен обработаться без ошибок
        assert len(result.entities) > 0
        assert "test0@example.com" not in result.anonymized_text

    def test_special_characters_in_text(self):
        """Тест текста со спецсимволами."""
        text = """
        Компания: ООО «Рога & Копыта»
        Email: test+tag@example.com
        Сумма: $100,000.00 (сто тысяч долларов)
        """

        result = anonymize_text(text)

        # Не должно падать
        assert result.anonymized_text is not None
        assert "test+tag@example.com" not in result.anonymized_text

    def test_unicode_text(self):
        """Тест текста с различными Unicode символами."""
        text = """
        Клиент: 田中太郎
        Email: tanaka@example.com
        Адрес: 東京都渋谷区
        """

        result = anonymize_text(text)

        assert "tanaka@example.com" not in result.anonymized_text

    def test_overlapping_patterns(self):
        """Тест перекрывающихся паттернов."""
        # Номер, который может быть и телефоном, и ИНН
        text = "Контакт: 12345678901234567890"

        result = anonymize_text(text)

        # Не должно быть дублирующих масок для одного и того же текста
        # Каждая позиция должна быть замаскирована максимум один раз
        mask_count = result.anonymized_text.count("[")
        entity_count = len(result.entities)

        # Количество масок должно соответствовать количеству сущностей
        assert mask_count == entity_count

"""
Тесты для Validator - сервиса валидации.
"""
import os
import tempfile
import pytest

from src.services.validator import Validator, ValidationError


class TestValidatorValidateFile:
    """Тесты для валидации файлов."""

    def test_valid_txt_file(self):
        """Проверяет успешную валидацию TXT файла."""
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.txt', delete=False, encoding='utf-8'
        ) as f:
            f.write("Some content")
            temp_path = f.name

        try:
            # Не должно вызывать исключение
            Validator.validate_file(temp_path, allowed_extensions=['.txt', '.pdf'])
        finally:
            os.unlink(temp_path)

    def test_valid_pdf_file(self):
        """Проверяет успешную валидацию PDF файла."""
        with tempfile.NamedTemporaryFile(
            mode='wb', suffix='.pdf', delete=False
        ) as f:
            f.write(b"%PDF-1.4 fake content")
            temp_path = f.name

        try:
            Validator.validate_file(temp_path, allowed_extensions=['.txt', '.pdf'])
        finally:
            os.unlink(temp_path)

    def test_file_not_found(self):
        """Проверяет исключение для несуществующего файла."""
        with pytest.raises(FileNotFoundError) as exc_info:
            Validator.validate_file("nonexistent_file.txt")
        assert "не найден" in str(exc_info.value)

    def test_file_too_large(self):
        """Проверяет исключение для большого файла."""
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.txt', delete=False
        ) as f:
            # 2 MB файл при лимите 1 MB
            f.write("x" * (2 * 1024 * 1024))
            temp_path = f.name

        try:
            with pytest.raises(ValidationError) as exc_info:
                Validator.validate_file(temp_path, max_size_mb=1)
            assert "слишком большой" in str(exc_info.value)
            assert "1 MB" in str(exc_info.value)
        finally:
            os.unlink(temp_path)

    def test_empty_file(self):
        """Проверяет исключение для пустого файла."""
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.txt', delete=False
        ) as f:
            temp_path = f.name

        try:
            with pytest.raises(ValidationError) as exc_info:
                Validator.validate_file(temp_path)
            assert "пуст" in str(exc_info.value)
        finally:
            os.unlink(temp_path)

    def test_unsupported_extension(self):
        """Проверяет исключение для неподдерживаемого расширения."""
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.docx', delete=False
        ) as f:
            f.write("content")
            temp_path = f.name

        try:
            with pytest.raises(ValidationError) as exc_info:
                Validator.validate_file(temp_path, allowed_extensions=['.txt', '.pdf'])
            assert "не поддерживается" in str(exc_info.value)
            assert ".txt" in str(exc_info.value)
        finally:
            os.unlink(temp_path)

    def test_case_insensitive_extension(self):
        """Проверяет нечувствительность к регистру расширения."""
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.TXT', delete=False
        ) as f:
            f.write("content")
            temp_path = f.name

        try:
            # Не должно вызывать исключение
            Validator.validate_file(temp_path, allowed_extensions=['.txt'])
        finally:
            os.unlink(temp_path)

    def test_no_extension_check_when_none(self):
        """Проверяет пропуск проверки расширения, если None."""
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.xyz', delete=False
        ) as f:
            f.write("content")
            temp_path = f.name

        try:
            # Не должно вызывать исключение
            Validator.validate_file(temp_path, allowed_extensions=None)
        finally:
            os.unlink(temp_path)

    def test_custom_max_size(self):
        """Проверяет кастомный лимит размера."""
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.txt', delete=False
        ) as f:
            f.write("x" * (100 * 1024 * 1024))  # 100 MB
            temp_path = f.name

        try:
            # Должно пройти с лимитом 200 MB
            Validator.validate_file(temp_path, max_size_mb=200, allowed_extensions=['.txt'])
        finally:
            os.unlink(temp_path)


class TestValidatorValidateMemoryRule:
    """Тесты для валидации правил памяти."""

    def test_valid_rule(self):
        """Проверяет успешную валидацию правила."""
        # Не должно вызывать исключение
        Validator.validate_memory_rule("Секретное слово")

    def test_empty_rule(self):
        """Проверяет исключение для пустого правила."""
        with pytest.raises(ValidationError) as exc_info:
            Validator.validate_memory_rule("")
        assert "пуст" in str(exc_info.value)

    def test_none_rule(self):
        """Проверяет исключение для None."""
        with pytest.raises(ValidationError):
            Validator.validate_memory_rule(None)

    def test_whitespace_only_rule(self):
        """Проверяет исключение для правила из пробелов."""
        with pytest.raises(ValidationError) as exc_info:
            Validator.validate_memory_rule("   \t\n  ")
        assert "пуст" in str(exc_info.value)

    def test_too_short_rule(self):
        """Проверяет исключение для слишком короткого правила."""
        with pytest.raises(ValidationError) as exc_info:
            Validator.validate_memory_rule("ab")
        assert "минимум" in str(exc_info.value)

    def test_custom_min_length(self):
        """Проверяет кастомную минимальную длину."""
        # Должно пройти с min_length=2
        Validator.validate_memory_rule("ab", min_length=2)

        # Должно упасть с min_length=5
        with pytest.raises(ValidationError):
            Validator.validate_memory_rule("abc", min_length=5)

    def test_rule_with_leading_trailing_spaces(self):
        """Проверяет правило с пробелами по краям."""
        # Пробелы должны учитываться при подсчете длины
        Validator.validate_memory_rule("   Секрет   ")

    def test_unicode_rule(self):
        """Проверяет правило с Unicode символами."""
        Validator.validate_memory_rule("日本語テキスト")
        Validator.validate_memory_rule("مرحبا")
        Validator.validate_memory_rule("🔐🔒🔓")

    def test_rule_with_special_characters(self):
        """Проверяет правило со спецсимволами."""
        Validator.validate_memory_rule("ООО «Компания»")
        Validator.validate_memory_rule("email@example.com")
        Validator.validate_memory_rule("+7 (999) 123-45-67")

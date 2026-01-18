"""
Тесты для FileService - сервиса работы с файлами.
"""
import os
import tempfile
import pytest
from unittest.mock import patch, MagicMock

from src.services.file_service import FileService
from src.services.validator import ValidationError


class TestFileServiceReadTxt:
    """Тесты для чтения TXT файлов."""

    def test_read_utf8_file(self):
        """Проверяет чтение UTF-8 файла."""
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.txt', delete=False, encoding='utf-8'
        ) as f:
            f.write("Привет, мир! Hello, World!")
            temp_path = f.name

        try:
            content = FileService.read_txt(temp_path)
            assert content == "Привет, мир! Hello, World!"
        finally:
            os.unlink(temp_path)

    def test_read_cp1251_file(self):
        """Проверяет чтение файла в кодировке CP1251."""
        with tempfile.NamedTemporaryFile(
            mode='wb', suffix='.txt', delete=False
        ) as f:
            f.write("Привет, мир!".encode('cp1251'))
            temp_path = f.name

        try:
            content = FileService.read_txt(temp_path)
            assert content == "Привет, мир!"
        finally:
            os.unlink(temp_path)

    def test_read_empty_file(self):
        """Проверяет чтение пустого файла."""
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.txt', delete=False, encoding='utf-8'
        ) as f:
            temp_path = f.name

        try:
            content = FileService.read_txt(temp_path)
            assert content == ""
        finally:
            os.unlink(temp_path)

    def test_read_multiline_file(self):
        """Проверяет чтение многострочного файла."""
        text = "Строка 1\nСтрока 2\nСтрока 3"
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.txt', delete=False, encoding='utf-8'
        ) as f:
            f.write(text)
            temp_path = f.name

        try:
            content = FileService.read_txt(temp_path)
            assert content == text
        finally:
            os.unlink(temp_path)

    def test_read_nonexistent_file_raises_exception(self):
        """Проверяет исключение при чтении несуществующего файла."""
        with pytest.raises(FileNotFoundError):
            FileService.read_txt("nonexistent_file.txt")


class TestFileServiceReadPdf:
    """Тесты для чтения PDF файлов."""

    def test_read_pdf_with_mock(self):
        """Проверяет чтение PDF через mock."""
        mock_page = MagicMock()
        mock_page.get_text.return_value = "Содержимое PDF"

        mock_doc = MagicMock()
        mock_doc.__enter__ = MagicMock(return_value=mock_doc)
        mock_doc.__exit__ = MagicMock(return_value=False)
        mock_doc.__iter__ = MagicMock(return_value=iter([mock_page]))

        with patch('src.services.file_service.fitz.open', return_value=mock_doc):
            content = FileService.read_pdf("fake.pdf")
            assert content == "Содержимое PDF"

    def test_read_pdf_multiple_pages(self):
        """Проверяет чтение многостраничного PDF."""
        mock_page1 = MagicMock()
        mock_page1.get_text.return_value = "Страница 1\n"
        mock_page2 = MagicMock()
        mock_page2.get_text.return_value = "Страница 2\n"

        mock_doc = MagicMock()
        mock_doc.__enter__ = MagicMock(return_value=mock_doc)
        mock_doc.__exit__ = MagicMock(return_value=False)
        mock_doc.__iter__ = MagicMock(return_value=iter([mock_page1, mock_page2]))

        with patch('src.services.file_service.fitz.open', return_value=mock_doc):
            content = FileService.read_pdf("fake.pdf")
            assert content == "Страница 1\nСтраница 2\n"

    def test_read_pdf_empty(self):
        """Проверяет чтение пустого PDF."""
        mock_doc = MagicMock()
        mock_doc.__enter__ = MagicMock(return_value=mock_doc)
        mock_doc.__exit__ = MagicMock(return_value=False)
        mock_doc.__iter__ = MagicMock(return_value=iter([]))

        with patch('src.services.file_service.fitz.open', return_value=mock_doc):
            content = FileService.read_pdf("fake.pdf")
            assert content == ""


class TestFileServiceReadFile:
    """Тесты для универсального метода read_file."""

    def test_read_txt_file(self):
        """Проверяет чтение TXT через read_file."""
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.txt', delete=False, encoding='utf-8'
        ) as f:
            f.write("Test content")
            temp_path = f.name

        try:
            content = FileService.read_file(temp_path)
            assert content == "Test content"
        finally:
            os.unlink(temp_path)

    def test_unsupported_extension_raises_error(self):
        """Проверяет исключение для неподдерживаемого расширения."""
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.xyz', delete=False
        ) as f:
            f.write("content")
            temp_path = f.name

        try:
            with pytest.raises(ValidationError):
                FileService.read_file(temp_path)
        finally:
            os.unlink(temp_path)

    def test_file_too_large_raises_error(self):
        """Проверяет исключение для слишком большого файла."""
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.txt', delete=False
        ) as f:
            # Создаем файл чуть больше 50 MB (51 MB)
            f.write("x" * (51 * 1024 * 1024))
            temp_path = f.name

        try:
            with pytest.raises(ValidationError) as exc_info:
                FileService.read_file(temp_path)
            assert "слишком большой" in str(exc_info.value)
        finally:
            os.unlink(temp_path)

    def test_empty_file_raises_error(self):
        """Проверяет исключение для пустого файла."""
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.txt', delete=False
        ) as f:
            temp_path = f.name

        try:
            with pytest.raises(ValidationError) as exc_info:
                FileService.read_file(temp_path)
            assert "пуст" in str(exc_info.value)
        finally:
            os.unlink(temp_path)

    def test_nonexistent_file_raises_error(self):
        """Проверяет исключение для несуществующего файла."""
        with pytest.raises(FileNotFoundError):
            FileService.read_file("nonexistent.txt")


class TestFileServiceIntegration:
    """Интеграционные тесты FileService."""

    def test_read_russian_text_preserves_encoding(self):
        """Проверяет сохранение русского текста."""
        russian_text = """
        Договор № 123
        Иванов Иван Иванович
        ИНН: 1234567890
        Телефон: +7 (999) 123-45-67
        """
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.txt', delete=False, encoding='utf-8'
        ) as f:
            f.write(russian_text)
            temp_path = f.name

        try:
            content = FileService.read_file(temp_path)
            assert "Договор" in content
            assert "Иванов" in content
            assert "1234567890" in content
        finally:
            os.unlink(temp_path)

    def test_read_mixed_language_text(self):
        """Проверяет чтение смешанного текста."""
        mixed_text = "Hello Привет 你好 مرحبا"
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.txt', delete=False, encoding='utf-8'
        ) as f:
            f.write(mixed_text)
            temp_path = f.name

        try:
            content = FileService.read_file(temp_path)
            assert content == mixed_text
        finally:
            os.unlink(temp_path)

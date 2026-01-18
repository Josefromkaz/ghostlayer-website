import fitz  # PyMuPDF
import os
import logging
from typing import Union
from src.services.validator import Validator

logger = logging.getLogger(__name__)

class FileService:
    """
    Сервис для работы с файлами.
    Предоставляет статические методы для чтения содержимого
    различных типов файлов.
    """
    @staticmethod
    def read_txt(file_path: str) -> str:
        """
        Читает содержимое текстового файла.
        
        :param file_path: Путь к .txt файлу.
        :return: Содержимое файла в виде строки.
        :raises Exception: При ошибке чтения.
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            # Пробуем другую кодировку если utf-8 не сработал
            with open(file_path, 'r', encoding='cp1251') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Ошибка при чтении TXT файла: {e}")
            raise

    @staticmethod
    def read_pdf(file_path: str) -> str:
        """
        Читает текстовое содержимое PDF файла.
        
        :param file_path: Путь к .pdf файлу.
        :return: Содержимое файла в виде строки.
        :raises Exception: При ошибке чтения.
        """
        try:
            with fitz.open(file_path) as doc:
                text = ""
                for page in doc:
                    text += page.get_text()
                return text
        except Exception as e:
            logger.error(f"Ошибка при чтении PDF файла: {e}")
            raise

    @staticmethod
    def read_docx(file_path: str) -> str:
        """
        Читает текстовое содержимое DOCX файла.
        
        :param file_path: Путь к .docx файлу.
        :return: Содержимое файла в виде строки.
        :raises Exception: При ошибке чтения.
        """
        try:
            import docx
            from docx.opc.exceptions import PackageNotFoundError
            
            try:
                doc = docx.Document(file_path)
            except PackageNotFoundError:
                raise ValueError("Файл поврежден или имеет неверный формат DOCX")
                
            full_text = []
            for para in doc.paragraphs:
                full_text.append(para.text)
            return '\n'.join(full_text)
        except Exception as e:
            logger.error(f"Ошибка при чтении DOCX файла: {e}")
            raise

    @staticmethod
    def read_file(file_path: str) -> str:
        """
        Универсальный метод для чтения поддерживаемых файлов.
        Определяет тип файла по расширению.
        
        :param file_path: Путь к файлу.
        :return: Содержимое файла.
        :raises ValidationError: Если файл не прошел валидацию.
        :raises FileNotFoundError: Если файл отсутствует.
        :raises ValueError: Если тип файла не поддерживается.
        """
        # Валидация (размер до 50МБ)
        Validator.validate_file(file_path, max_size_mb=50, allowed_extensions=['.txt', '.pdf', '.docx'])

        _, extension = os.path.splitext(file_path)
        extension = extension.lower()

        if extension == '.txt':
            return FileService.read_txt(file_path)
        elif extension == '.pdf':
            return FileService.read_pdf(file_path)
        elif extension == '.docx':
            return FileService.read_docx(file_path)
        else:
            raise ValueError(f"Неподдерживаемый тип файла: {extension}")

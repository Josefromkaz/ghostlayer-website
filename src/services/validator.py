import os
from typing import List

class ValidationError(Exception):
    """Базовый класс для ошибок валидации."""
    pass

class Validator:
    """
    Централизованный сервис валидации данных.
    """
    
    @staticmethod
    def validate_file(file_path: str, max_size_mb: int = 50, allowed_extensions: List[str] = None) -> None:
        """
        Проверяет файл на существование, размер и расширение.
        
        :param file_path: Путь к файлу.
        :param max_size_mb: Максимальный размер в мегабайтах.
        :param allowed_extensions: Список разрешенных расширений (например, ['.txt', '.pdf']).
        :raises FileNotFoundError: Если файл не найден.
        :raises ValidationError: Если файл не прошел валидацию.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Файл не найден: {file_path}")
            
        # Проверка размера
        size_bytes = os.path.getsize(file_path)
        max_bytes = max_size_mb * 1024 * 1024
        if size_bytes > max_bytes:
            raise ValidationError(f"Файл слишком большой ({size_bytes / 1024 / 1024:.1f} MB). Максимум: {max_size_mb} MB")
            
        # Проверка пустого файла
        if size_bytes == 0:
            raise ValidationError("Файл пуст")
            
        # Проверка расширения
        if allowed_extensions:
            _, ext = os.path.splitext(file_path)
            if ext.lower() not in [e.lower() for e in allowed_extensions]:
                raise ValidationError(f"Формат {ext} не поддерживается. Разрешены: {', '.join(allowed_extensions)}")

    @staticmethod
    def validate_memory_rule(text: str, min_length: int = 3) -> None:
        """
        Проверяет текст правила для памяти.
        
        :param text: Текст правила.
        :param min_length: Минимальная длина.
        :raises ValidationError: Если правило некорректно.
        """
        if not text or not text.strip():
            raise ValidationError("Текст правила пуст")
            
        if len(text.strip()) < min_length:
            raise ValidationError(f"Слишком короткое слово (минимум {min_length} символа)")

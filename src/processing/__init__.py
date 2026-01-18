"""
Модуль обработки текста для анонимизации.

Содержит pipeline и отдельные стадии обработки:
- regex_rules: Паттерны для email, телефонов, карт
- nlp_models: NLP-распознавание сущностей
- memory_rules: Пользовательские правила из БД
"""
from src.processing.pipeline import anonymize_text

__all__ = ["anonymize_text"]

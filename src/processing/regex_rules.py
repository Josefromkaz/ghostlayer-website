import re
import logging
from typing import List, Dict, Any, Tuple

from src.processing.utils import is_overlapping

logger = logging.getLogger(__name__)

# Список регулярных выражений для поиска конфиденциальных данных.
# Храним как (category, pattern_string) для читаемости.
_REGEX_RULES_RAW = [
    # === ДАТЫ ===
    # ДД.ММ.ГГГГ или ДД/ММ/ГГГГ (часто дата рождения или выдачи)
    ("DATE", r"\b(?:0[1-9]|[12][0-9]|3[01])[./-](?:0[1-9]|1[0-2])[./-](?:19|20)\d{2}\b"),

    # === ИНТЕРНЕТ ===
    # URL сайты (http, https, www)
    ("URL", r"\b(?:https?://|www\.)\S+\.[a-z]{2,}\b"),
    ("EMAIL", r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"),

    # === КОНТАКТЫ ===
    # Телефоны РФ/РК: +7, 8, международные
    ("PHONE", r"\+?[78][-\s(]*\d{3}[-\s)]*\d{3}[-\s]*\d{2}[-\s]*\d{2}"),
    ("PHONE", r"\+7\s*7\d{2}[-\s]*\d{3}[-\s]*\d{2}[-\s]*\d{2}"),

    # === ФИНАНСЫ ===
    ("CREDIT_CARD", r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b"),
    ("BANK_ACCOUNT", r"\b[34]\d{4}\s?\d{3}\s?\d{1}\s?\d{4}\s?\d{7}\b"),
    # Международный IBAN (2 буквы страны + 2 цифры + от 12 до 30 букв/цифр)
    ("IBAN", r"\b[A-Z]{2}\d{2}[A-Z0-9]{12,30}\b"),

    # === ГОСОРГАНЫ И ОРГАНИЗАЦИИ (Контекстный поиск) ===
    # "Министерство ... ... ..." (захватываем до 3 слов после названия)
    ("GOV_BODY", r"(?i)\b(?:Министерств[оауе]|Управлени[ея]|Департамент[а-я]?|Комитет[а-я]?)\s+(?:[А-Яа-я0-9\-]+\s*){1,4}"),
    # "Орган выдачи ..."
    ("GOV_BODY", r"(?i)\b(?:Орган|Кем)\s+выдан(?:ы)?\s*[:\.]?\s*(?:[А-Яа-я0-9\-]+\s*){1,5}"),

    # === ДОКУМЕНТЫ РК (Казахстан) ===
    # ИИН / БИН (12 цифр) - ВАЖНО: должен быть выше INN, так как оба 12 цифр
    ("IIN_BIN", r"\b\d{12}\b"),

    # === ДОКУМЕНТЫ РФ ===
    ("PASSPORT_RF", r"\b\d{2}\s?\d{2}\s?\d{6}\b"),
    ("SNILS", r"\b\d{3}[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{2}\b"),
    ("INN", r"\b\d{10,12}\b"),

    # === ДОКУМЕНТЫ РК (Казахстан) продолжение ===
    # Удостоверение личности РК (9 цифр)
    ("ID_CARD_KZ", r"\b0\d{8}\b"),  # Обычно начинаются с 0
    # Номер паспорта РК (N + 8 цифр)
    ("PASSPORT_KZ", r"\b[Nn]\d{8}\b"),

    # === ФИНАНСЫ КЗ ===
    # IBAN Казахстана (KZ + 2 цифры + 16 символов)
    ("IBAN_KZ", r"\bKZ\d{2}[A-Z0-9]{16}\b"),
    # БИК банков Казахстана (8 букв, обычно заканчивается на KZ)
    ("BIK_KZ", r"\b[A-Z]{4}KZ[A-Z0-9]{2}\b"),

    # === ТЕЛЕФОНЫ КЗ ===
    # Казахстанские мобильные: +7 7XX XXX XX XX
    ("PHONE_KZ", r"\+7\s*7[0-9]{2}[-\s]*\d{3}[-\s]*\d{2}[-\s]*\d{2}"),

    # === ТРАНСПОРТ КЗ ===
    # Госномера Казахстана: 123ABC01, A123ABC, 123 ABC 01
    ("VEHICLE_REG_KZ", r"\b\d{3}\s?[A-ZА-Я]{3}\s?\d{2}\b"),
    ("VEHICLE_REG_KZ", r"\b[A-ZА-Я]\d{3}[A-ZА-Я]{3}\b"),

    # === АДРЕСА КЗ ===
    # Казахские слова для адресов: мкр, ж/м, көше (улица на казахском), ауыл (село)
    ("ADDRESS_KZ", r"(?i)\b(?:мкр\.?|микрорайон|ж/м|көше|көшесі|ауыл|ауылы|қала|қаласы)\s+(?:[А-Яа-яӘәҒғҚқҢңӨөҰұҮүІі\w\-]+\s*){1,4}"),

    # === ЮРИДИЧЕСКИЕ ДОКУМЕНТЫ КЗ ===
    # Номера судебных дел: формат 1234-56-78/2024
    ("LEGAL_CASE_KZ", r"\b\d{4}[-/]\d{2}[-/]\d{2}[-/]\d{4}\b"),
    # Альтернативный формат: № 2-1234/2024
    ("LEGAL_CASE_KZ", r"№\s*\d[-\d/]+\d{4}"),

    # === ОБРАЗОВАНИЕ КЗ ===
    # Номера дипломов/аттестатов (обычно серия + номер)
    ("EDU_DOC_KZ", r"\b[А-ЯA-Z]{2,3}\s*№?\s*\d{7,8}\b"),

    # === МЕДИЦИНА КЗ ===
    # Полис ОСМС (обычно ИИН + дата)
    ("MED_POLICY_KZ", r"(?i)(?:полис|ОСМС)\s*[№:]*\s*\d{12}"),

    # === НЕДВИЖИМОСТЬ КЗ ===
    # Кадастровый номер (формат: 01:234:567:890)
    ("CADASTRE_KZ", r"\b\d{2}:\d{3}:\d{3}:\d{3}\b"),

    # === АДРЕСА И ГЕОГРАФИЯ ===
    # Почтовые индексы (6 цифр для РФ/РК, 5 для США/Европы)
    ("POSTAL_CODE", r"\b\d{5,6}\b"),
    # Адреса (ул., пр., д., кв. и английские аналоги)
    ("ADDRESS", r"(?i)\b(?:ул\.|улица|пр\.|проспект|пер\.|переулок|мкр\.|микрорайон|г\.|город|обл\.|область|str\.|street|ave\.|avenue|lane|blvd)\s+(?:[А-Яа-яA-Za-z0-9\-]+\s*){1,4}(?:д\.|дом|house|bldg)?\s*\d+"),

    # === КОМПАНИИ (Юридические формы) ===
    # ТОО, ООО, ИП, АО + название в кавычках или без
    ("COMPANY", r"(?i)\b(?:ТОО|ООО|ИП|АО|ЗАО|ПАО|LLC|LLP|Ltd\.?|Inc\.?|GmbH|Corp\.?)\s+[\"«]?[А-Яа-яA-Za-z0-9\-\s]+[\"»]?"),

    # === ТРАНСПОРТ ===
    ("LICENSE_PLATE", r"\b[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}\b"),
]

# Прекомпилированные регулярные выражения (компиляция один раз при импорте модуля)
REGEX_RULES: List[Tuple[str, re.Pattern]] = []

for category, pattern in _REGEX_RULES_RAW:
    try:
        compiled = re.compile(pattern)
        REGEX_RULES.append((category, compiled))
    except re.error as e:
        logger.error(f"Ошибка компиляции regex для {category}: {e}")

def find_regex_matches(text: str, existing_spans: List[Tuple[int, int]] = None) -> List[Dict[str, Any]]:
    """
    Находит все совпадения по регулярным выражениям БЕЗ замены текста.

    Args:
        text: Текст для поиска.
        existing_spans: Уже занятые диапазоны (для исключения пересечений).

    Returns:
        Список словарей с информацией о найденных совпадениях.
    """
    if existing_spans is None:
        existing_spans = []

    matches = []

    # 1. Находим все совпадения (используем прекомпилированные паттерны)
    for category, compiled_pattern in REGEX_RULES:
        try:
            for match in compiled_pattern.finditer(text):
                # Пропускаем пустые или слишком короткие совпадения
                if len(match.group(0).strip()) < 3:
                    continue

                # Пропускаем пересечения с существующими
                if is_overlapping(match.start(), match.end(), existing_spans):
                    continue

                matches.append({
                    "start": match.start(),
                    "end": match.end(),
                    "original_text": match.group(0),
                    "category": category
                })
        except Exception as e:
            logger.error(f"Ошибка при поиске {category}: {e}")
            continue

    # 2. Убираем пересечения между найденными (оставляем самое длинное)
    matches.sort(key=lambda x: len(x['original_text']), reverse=True)

    unique_matches = []
    used_ranges = list(existing_spans)  # Копируем существующие

    for m in matches:
        overlap = False
        for start, end in used_ranges:
            if max(m['start'], start) < min(m['end'], end):
                overlap = True
                break

        if not overlap:
            used_ranges.append((m['start'], m['end']))
            unique_matches.append(m)

    return unique_matches

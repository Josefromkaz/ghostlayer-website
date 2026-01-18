"""
Split View - два окна с синхронным скроллингом.
Левое: Оригинал с подсветкой сущностей.
Правое: Результат с подсветкой.

Поддерживает:
- Обычный клик по слову - добавить одно слово в память
- Режим выбора (кнопка) - выбрать несколько слов для объединения
- Клик по выделенной сущности - убрать выделение
- Поиск по тексту с подсветкой результатов
"""
import re
import logging
import flet as ft

logger = logging.getLogger(__name__)
from typing import List, Dict, Any, Callable, Optional, Set, Tuple
from src.processing.types import Entity

# Цвет подсветки результатов поиска
SEARCH_HIGHLIGHT_COLOR = ft.Colors.LIME_300

# Цвета для разных категорий сущностей
CATEGORY_COLORS = {
    "PERSON": ft.Colors.BLUE_200,
    "ORGANIZATION": ft.Colors.GREEN_200,
    "EMAIL": ft.Colors.ORANGE_200,
    "PHONE": ft.Colors.PURPLE_200,
    "CREDIT_CARD": ft.Colors.RED_200,
    "LEARNED_RULE": ft.Colors.TEAL_200,
    "LOC": ft.Colors.AMBER_200,
    "ADDRESS": ft.Colors.AMBER_300,
    "POSTAL_CODE": ft.Colors.AMBER_100,
    "COMPANY": ft.Colors.GREEN_300,
    # Документы РФ
    "PASSPORT_RF": ft.Colors.PINK_200,
    "SNILS": ft.Colors.CYAN_200,
    "INN": ft.Colors.LIME_200,
    # Документы КЗ
    "IIN_KZ": ft.Colors.INDIGO_200,
    "IIN_BIN": ft.Colors.INDIGO_200,
    "ID_CARD_KZ": ft.Colors.INDIGO_100,
    "PASSPORT_KZ": ft.Colors.INDIGO_300,
    # Финансы КЗ
    "IBAN_KZ": ft.Colors.DEEP_ORANGE_100,
    "BIK_KZ": ft.Colors.DEEP_ORANGE_200,
    "BANK_ACCOUNT": ft.Colors.DEEP_ORANGE_200,
    # Транспорт
    "LICENSE_PLATE": ft.Colors.BROWN_200,
    "VEHICLE_REG_KZ": ft.Colors.BROWN_300,
    # Телефоны КЗ
    "PHONE_KZ": ft.Colors.PURPLE_300,
    # Адреса КЗ
    "ADDRESS_KZ": ft.Colors.AMBER_400,
    # Юридические документы КЗ
    "LEGAL_CASE_KZ": ft.Colors.BLUE_GREY_200,
    # Образование КЗ
    "EDU_DOC_KZ": ft.Colors.LIGHT_BLUE_200,
    # Медицина КЗ
    "MED_POLICY_KZ": ft.Colors.RED_100,
    # Недвижимость КЗ
    "CADASTRE_KZ": ft.Colors.GREEN_100,
    "DEFAULT": ft.Colors.GREY_300,
}

# Цвет выбранных слов
SELECTION_COLOR = ft.Colors.YELLOW_200

# Минимальная длина слова для добавления в память
MIN_WORD_LENGTH = 3


class SplitView(ft.Column):
    """
    Компонент с двумя панелями и единым скроллом.
    Поддерживает режим множественного выбора слов.
    """

    def __init__(
        self,
        original_text: str,
        anonymized_text: str,
        entities: List[Entity],
        on_add_to_memory: Callable[[str], None],
        on_entity_toggle: Callable[[str], None] = None,
        on_multi_select: Callable[[List[str]], None] = None,
    ):
        super().__init__()

        self.original_text = original_text
        self.anonymized_text = anonymized_text
        self.entities = entities
        self.on_add_to_memory = on_add_to_memory
        self.on_entity_toggle = on_entity_toggle
        self.on_multi_select = on_multi_select

        # Режим выбора (вкл/выкл)
        self.selection_mode: bool = False

        # Состояние выбранных слов
        self.selected_words: List[Dict[str, Any]] = []  # [{text, start, end}, ...]

        # Поиск
        self.search_query: str = ""
        self.search_matches: List[Tuple[int, int]] = []  # [(start, end), ...]
        self.current_match_index: int = -1

        self.expand = True
        self.spacing = 0

        # Ссылки на контролы для обновления
        self.original_text_control: Optional[ft.Text] = None
        self.result_text_control: Optional[ft.Text] = None
        self.selection_bar: Optional[ft.Container] = None
        self.mode_button: Optional[ft.IconButton] = None
        self.search_field: Optional[ft.TextField] = None
        self.search_count_text: Optional[ft.Text] = None
        self.scroll_container: Optional[ft.Column] = None  # Для сохранения скролла

        # Создаём view
        self._build_views()

    def _build_views(self) -> None:
        """Строит layout с единым скроллом."""
        # Кнопка режима выбора
        self.mode_button = ft.IconButton(
            icon=ft.Icons.CHECKLIST,
            icon_color=ft.Colors.GREY_600,
            tooltip="Режим выбора слов (для объединения)",
            on_click=self._toggle_selection_mode,
        )

        # Поле поиска
        self.search_field = ft.TextField(
            hint_text="Поиск...",
            width=200,
            height=35,
            text_size=13,
            content_padding=ft.padding.symmetric(horizontal=10, vertical=5),
            border_radius=5,
            on_change=self._on_search_change,
            on_submit=self._on_search_next,
            suffix=ft.IconButton(
                icon=ft.Icons.CLOSE,
                icon_size=16,
                on_click=self._clear_search,
                tooltip="Очистить поиск",
            ),
        )
        self.search_count_text = ft.Text("", size=12, color=ft.Colors.GREY_600)

        search_controls = ft.Row([
            self.search_field,
            ft.IconButton(
                icon=ft.Icons.KEYBOARD_ARROW_UP,
                icon_size=18,
                on_click=self._on_search_prev,
                tooltip="Предыдущее совпадение",
            ),
            ft.IconButton(
                icon=ft.Icons.KEYBOARD_ARROW_DOWN,
                icon_size=18,
                on_click=self._on_search_next,
                tooltip="Следующее совпадение",
            ),
            self.search_count_text,
        ], spacing=2, vertical_alignment=ft.CrossAxisAlignment.CENTER)

        # Заголовки
        headers = ft.Row(
            controls=[
                ft.Container(
                    content=ft.Row([
                        ft.Text(
                            "Оригинал",
                            weight=ft.FontWeight.BOLD,
                            size=14,
                            color=ft.Colors.ON_SURFACE,
                        ),
                        self.mode_button,
                    ], spacing=5),
                    expand=1,
                    padding=ft.padding.only(left=10, bottom=8),
                ),
                ft.Container(
                    content=ft.Row([
                        ft.Text(
                            "Результат",
                            weight=ft.FontWeight.BOLD,
                            size=14,
                            color=ft.Colors.ON_SURFACE,
                        ),
                        ft.Container(expand=True),
                        search_controls,
                    ]),
                    expand=1,
                    padding=ft.padding.only(left=10, bottom=8, right=10),
                ),
            ],
            spacing=10,
        )

        # Панель выбранных слов (изначально скрыта)
        self.selection_bar = self._build_selection_bar()

        # Левое окно - Оригинал
        self.original_text_control = ft.Text(
            spans=self._build_original_spans(),
            selectable=True,
            color=ft.Colors.ON_SURFACE,
            font_family="Roboto Mono, Consolas, monospace", # Monospace for alignment
            size=14,
        )

        # Правое окно - Результат с подсветкой
        result_content = self._build_result_content()

        # Контент в Row - оба текста рядом
        content_row = ft.Row(
            controls=[
                ft.Container(
                    content=self.original_text_control,
                    expand=1,
                    padding=15,
                    border=ft.border.all(1, "outlineVariant"),
                    border_radius=8,
                    bgcolor="surfaceVariant",
                ),
                ft.Container(
                    content=result_content,
                    expand=1,
                    padding=15,
                    border=ft.border.all(1, "outlineVariant"),
                    border_radius=8,
                    bgcolor="surfaceVariant",
                ),
            ],
            spacing=10,
            vertical_alignment=ft.CrossAxisAlignment.START,
            expand=True,
        )

        # Единый скроллируемый контейнер
        self.scroll_container = ft.Column(
            controls=[content_row],
            scroll=ft.ScrollMode.AUTO,
            expand=True,
            on_scroll=self._on_scroll,  # Отслеживаем позицию
        )
        self._last_scroll_offset: float = 0  # Сохранённая позиция

        self.controls = [
            headers,
            self.selection_bar,
            ft.Container(
                content=self.scroll_container,
                expand=True,
                padding=ft.padding.only(left=5, right=5),
            ),
        ]

    def _toggle_selection_mode(self, e) -> None:
        """Переключает режим выбора."""
        self.selection_mode = not self.selection_mode

        if self.selection_mode:
            # Включаем режим выбора
            self.mode_button.icon_color = ft.Colors.ORANGE_600
            self.mode_button.bgcolor = ft.Colors.ORANGE_100
            self.mode_button.tooltip = "Выключить режим выбора"
        else:
            # Выключаем режим выбора
            self.mode_button.icon_color = ft.Colors.GREY_600
            self.mode_button.bgcolor = None
            self.mode_button.tooltip = "Режим выбора слов (для объединения)"
            # Очищаем выбор при выходе из режима
            if self.selected_words:
                self._clear_selection()

        if self.page:
            self.mode_button.update()

    def _on_scroll(self, e: ft.OnScrollEvent) -> None:
        """Сохраняет текущую позицию скролла."""
        self._last_scroll_offset = e.pixels

    def update_data(
        self,
        anonymized_text: str,
        entities: List[Entity],
    ) -> None:
        """
        Обновляет данные БЕЗ пересоздания всего компонента.
        Сохраняет позицию скролла.
        """
        # Сохраняем текущий offset
        saved_offset = self._last_scroll_offset

        # Обновляем данные
        self.anonymized_text = anonymized_text
        self.entities = entities

        # Перестраиваем spans для оригинала
        self.original_text_control.spans = self._build_original_spans()

        # Перестраиваем результат (с учётом поиска, если активен)
        result_spans = self._build_result_spans_with_search()
        self.result_text_control.spans = result_spans if result_spans else [
            ft.TextSpan(self.anonymized_text)
        ]

        # Обновляем UI
        if self.page:
            self.original_text_control.update()
            self.result_text_control.update()

            # Восстанавливаем скролл после рендера
            if saved_offset > 0:
                self.scroll_container.scroll_to(
                    offset=saved_offset,
                    duration=0,  # Мгновенно, без анимации
                )

    def _build_selection_bar(self) -> ft.Container:
        """Создаёт панель с выбранными словами."""
        return ft.Container(
            content=ft.Row(
                controls=[],
                spacing=5,
            ),
            visible=False,
            padding=ft.padding.symmetric(horizontal=10, vertical=8),
            bgcolor=ft.Colors.YELLOW_50,
            border=ft.border.all(1, ft.Colors.YELLOW_300),
            border_radius=5,
            margin=ft.margin.only(left=5, right=5, bottom=8),
        )

    def _update_selection_bar(self) -> None:
        """Обновляет панель выбранных слов."""
        if not self.selected_words:
            self.selection_bar.visible = False
        else:
            # Формируем текст из выбранных слов
            words_text = " ".join([w["text"] for w in self.selected_words])

            self.selection_bar.content = ft.Row(
                controls=[
                    ft.Icon(ft.Icons.CHECK_CIRCLE, size=18, color=ft.Colors.YELLOW_800),
                    ft.Text(
                        f"Выбрано: ",
                        size=13,
                        color=ft.Colors.GREY_700,
                    ),
                    ft.Container(
                        content=ft.Text(
                            words_text,
                            weight=ft.FontWeight.BOLD,
                            size=13,
                            color=ft.Colors.GREY_900,
                        ),
                        bgcolor=ft.Colors.YELLOW_200,
                        padding=ft.padding.symmetric(horizontal=8, vertical=2),
                        border_radius=3,
                    ),
                    ft.Container(expand=True),  # Spacer
                    ft.ElevatedButton(
                        "Добавить в память",
                        icon=ft.Icons.MEMORY,
                        on_click=lambda e: self._confirm_multi_selection(),
                        bgcolor=ft.Colors.TEAL_600,
                        color=ft.Colors.WHITE,
                    ),
                    ft.IconButton(
                        icon=ft.Icons.CLOSE,
                        icon_size=18,
                        tooltip="Очистить выбор",
                        on_click=lambda e: self._clear_selection(),
                    ),
                ],
                spacing=5,
                vertical_alignment=ft.CrossAxisAlignment.CENTER,
            )
            self.selection_bar.visible = True

        if self.page:
            self.selection_bar.update()

    def _clear_selection(self) -> None:
        """Очищает выбор слов."""
        self.selected_words = []
        self._update_selection_bar()
        self._rebuild_original_text()

    def _confirm_multi_selection(self) -> None:
        """Подтверждает выбор нескольких слов."""
        if self.selected_words and self.on_multi_select:
            words = [w["text"] for w in self.selected_words]
            self.on_multi_select(words)
            self._clear_selection()
            # Выключаем режим выбора после добавления
            if self.selection_mode:
                self._toggle_selection_mode(None)

    def _rebuild_original_text(self) -> None:
        """Перестраивает текст с учётом выбранных слов."""
        if self.original_text_control:
            self.original_text_control.spans = self._build_original_spans()
            if self.page:
                self.original_text_control.update()

    def _build_original_spans(self) -> List[ft.TextSpan]:
        """Создаёт текстовые спаны с подсветкой сущностей и выбранных слов.

        ВАЖНО: Использует original_start/original_end из Entity,
        а НЕ повторный поиск через find(). Это гарантирует корректную подсветку.
        """
        # Логируем только статистику (без чувствительных данных)
        logger.debug(f"Building spans for {len(self.entities)} entities")

        # Собираем позиции выбранных слов
        selected_positions = set()
        for w in self.selected_words:
            for i in range(w["start"], w["end"]):
                selected_positions.add(i)

        if not self.entities:
            return self._build_clickable_text_spans(self.original_text, 0, selected_positions)

        # Используем ГОТОВЫЕ позиции из Entity (original_start, original_end)
        # Это ключевое изменение — больше не ищем через find()!
        positions = []

        for entity in self.entities:
            # Проверяем, есть ли валидные позиции
            if entity.original_start >= 0 and entity.original_end > entity.original_start:
                positions.append({
                    "start": entity.original_start,
                    "end": entity.original_end,
                    "category": entity.category,
                    "entity": entity,
                })

        # Сортируем по позиции
        positions.sort(key=lambda x: x['start'])

        # Убираем пересечения (оставляем первое)
        filtered = []
        last_end = 0
        for pos in positions:
            if pos['start'] >= last_end:
                filtered.append(pos)
                last_end = pos['end']

        # Строим спаны
        spans = []
        last_index = 0

        for pos in filtered:
            # Текст до сущности (кликабельный)
            if pos['start'] > last_index:
                text_before = self.original_text[last_index:pos['start']]
                spans.extend(self._build_clickable_text_spans(text_before, last_index, selected_positions))

            # Сущность с подсветкой (кликабельная) - клик убирает выделение
            # Use original text slice to preserve case formatting
            entity_text = self.original_text[pos['start']:pos['end']]
            entity_id = pos['entity'].id
            color = CATEGORY_COLORS.get(pos['category'], CATEGORY_COLORS['DEFAULT'])
            spans.append(
                ft.TextSpan(
                    entity_text,
                    style=ft.TextStyle(
                        bgcolor=color, 
                        color=ft.Colors.GREY_900, 
                        font_family="Roboto Mono, Consolas, monospace"
                    ),
                    on_click=lambda e, eid=entity_id: self._on_entity_click(eid),
                )
            )
            last_index = pos['end']

        # Остаток текста (кликабельный)
        if last_index < len(self.original_text):
            spans.extend(self._build_clickable_text_spans(
                self.original_text[last_index:],
                last_index,
                selected_positions
            ))

        return spans if spans else [ft.TextSpan(self.original_text, style=ft.TextStyle(color="onSurface"))]

    def _build_clickable_text_spans(
        self,
        text: str,
        offset: int,
        selected_positions: Set[int]
    ) -> List[ft.TextSpan]:
        """Создаёт кликабельные спаны для обычного текста."""
        import re
        spans = []
        current_pos = offset

        # Разбиваем на слова и пробелы
        parts = re.split(r'(\s+)', text)
        for part in parts:
            if part.strip():
                # Проверяем, выбрано ли это слово
                word_start = current_pos
                word_end = current_pos + len(part)
                is_selected = word_start in selected_positions

                # Слово - кликабельное
                style = ft.TextStyle(
                    color="onSurface",
                    bgcolor=SELECTION_COLOR if is_selected else None,
                )
                if is_selected:
                     # Если выбрано (желтый фон), текст должен быть темным
                     style.color = ft.Colors.GREY_900

                spans.append(
                    ft.TextSpan(
                        part,
                        style=style,
                        on_click=lambda e, t=part, s=word_start, end=word_end: self._on_text_click(t, s, end),
                    )
                )
            else:
                # Пробелы - просто текст
                spans.append(ft.TextSpan(part, style=ft.TextStyle(color="onSurface")))

            current_pos += len(part)

        return spans

    def _on_text_click(self, text: str, start: int, end: int) -> None:
        """Обрабатывает клик по тексту."""
        if self.selection_mode:
            # Режим выбора - добавляем/убираем слово
            word_data = {"text": text, "start": start, "end": end}

            # Проверяем, есть ли уже это слово в выборе
            existing_idx = None
            for i, w in enumerate(self.selected_words):
                if w["start"] == start:
                    existing_idx = i
                    break

            if existing_idx is not None:
                # Убираем из выбора
                self.selected_words.pop(existing_idx)
            else:
                # Добавляем в выбор
                self.selected_words.append(word_data)
                # Сортируем по позиции
                self.selected_words.sort(key=lambda w: w["start"])

            self._update_selection_bar()
            self._rebuild_original_text()
        else:
            # Обычный режим
            # Сначала проверяем, не является ли этот текст частью сущности
            # (на случай, если клик пришёлся на границу подсветки)
            for entity in self.entities:
                if (entity.original_start >= 0 and
                    start >= entity.original_start and
                    end <= entity.original_end):
                    # Это часть сущности — делаем toggle вместо "добавить в память"
                    if self.on_entity_toggle:
                        self.on_entity_toggle(entity.id)
                    return

            # Проверяем минимальную длину слова
            if len(text) < MIN_WORD_LENGTH:
                return
            # Показываем диалог для одного слова
            if text and self.on_add_to_memory:
                self.on_add_to_memory(text)

    def _on_entity_click(self, entity_id: str) -> None:
        """Обрабатывает клик по выделенной сущности - убирает выделение."""
        if entity_id and self.on_entity_toggle:
            self.on_entity_toggle(entity_id)

    def _build_result_content(self) -> ft.Text:
        """Создаёт контент с цветной подсветкой сущностей."""
        import re

        if not self.anonymized_text:
            return ft.Text(
                "",
                selectable=True,
                color="onSurface",
            )

        # Создаём маппинг entity_id -> entity
        entity_map = {e.id: e for e in self.entities} if self.entities else {}

        # Строим спаны с подсветкой
        spans = []
        text = self.anonymized_text
        last_idx = 0

        # Паттерн для плейсхолдеров [CATEGORY_N]
        placeholder_pattern = re.compile(r'\[([A-Z_]+_\d+)\]')

        while True:
            # Ищем начало метки
            start = text.find('[', last_idx)
            if start == -1:
                # Остаток текста
                if last_idx < len(text):
                    spans.append(ft.TextSpan(text[last_idx:], style=ft.TextStyle(color="onSurface")))
                break

            # Ищем конец метки
            end = text.find(']', start)
            if end == -1:
                spans.append(ft.TextSpan(text[last_idx:], style=ft.TextStyle(color="onSurface")))
                break

            # Текст до метки
            if start > last_idx:
                spans.append(ft.TextSpan(text[last_idx:start], style=ft.TextStyle(color="onSurface")))

            # Извлекаем ID из метки (с квадратными скобками для поиска в entity_map)
            raw_id = text[start + 1:end]
            entity_id_with_brackets = f"[{raw_id}]"

            # Проверяем, это известная сущность
            if entity_id_with_brackets in entity_map:
                entity = entity_map[entity_id_with_brackets]
                category = entity.category
                color = CATEGORY_COLORS.get(category, CATEGORY_COLORS['DEFAULT'])
                # Сущность с подсветкой
                spans.append(
                    ft.TextSpan(
                        entity_id_with_brackets,
                        style=ft.TextStyle(bgcolor=color, color=ft.Colors.GREY_900),
                    )
                )
            elif placeholder_pattern.match(f"[{raw_id}]"):
                # Это плейсхолдер от LLM, который мы ещё не знаем — подсвечиваем
                # Извлекаем категорию из ID для цвета
                parts = raw_id.rsplit('_', 1)
                category = parts[0] if len(parts) == 2 else 'DEFAULT'
                color = CATEGORY_COLORS.get(category, CATEGORY_COLORS['DEFAULT'])
                spans.append(
                    ft.TextSpan(
                        f"[{raw_id}]",
                        style=ft.TextStyle(bgcolor=color, color=ft.Colors.GREY_900),
                    )
                )
            else:
                # Это не плейсхолдер, добавляем как обычный текст
                spans.append(ft.TextSpan(text[start:end + 1], style=ft.TextStyle(color="onSurface")))

            last_idx = end + 1

        result_text = ft.Text(
            spans=spans if spans else [ft.TextSpan(self.anonymized_text)],
            selectable=True,
            color="onSurface",
            font_family="Roboto Mono, Consolas, monospace",
            size=14,
        )
        self.result_text_control = result_text
        return result_text

    # === ПОИСК ===

    def _on_search_change(self, e) -> None:
        """Обрабатывает изменение текста поиска."""
        query = e.control.value.strip()
        if query != self.search_query:
            self.search_query = query
            self._perform_search()

    def _perform_search(self) -> None:
        """Выполняет поиск и обновляет UI."""
        self.search_matches = []
        self.current_match_index = -1

        if not self.search_query or len(self.search_query) < 2:
            self._update_search_count()
            self._rebuild_result_with_search()
            return

        # Ищем все совпадения (case-insensitive)
        text_to_search = self.anonymized_text.lower()
        query_lower = self.search_query.lower()

        start = 0
        while True:
            pos = text_to_search.find(query_lower, start)
            if pos == -1:
                break
            self.search_matches.append((pos, pos + len(self.search_query)))
            start = pos + 1

        if self.search_matches:
            self.current_match_index = 0

        self._update_search_count()
        self._rebuild_result_with_search()

    def _update_search_count(self) -> None:
        """Обновляет счётчик найденных совпадений."""
        if not self.search_query or len(self.search_query) < 2:
            self.search_count_text.value = ""
        elif self.search_matches:
            self.search_count_text.value = f"{self.current_match_index + 1}/{len(self.search_matches)}"
        else:
            self.search_count_text.value = "0/0"

        if self.page:
            self.search_count_text.update()

    def _rebuild_result_with_search(self) -> None:
        """Перестраивает результат с подсветкой поиска."""
        if not self.result_text_control or not self.page:
            return

        # Строим новые спаны с учётом поиска
        new_spans = self._build_result_spans_with_search()
        self.result_text_control.spans = new_spans
        self.result_text_control.update()

    def _build_result_spans_with_search(self) -> List[ft.TextSpan]:
        """Строит спаны результата с подсветкой поиска."""
        if not self.anonymized_text:
            return [ft.TextSpan("")]

        text = self.anonymized_text
        entity_map = {e.id: e for e in self.entities} if self.entities else {}
        placeholder_pattern = re.compile(r'\[([A-Z_]+_\d+)\]')

        # Собираем все позиции для подсветки
        highlights = []

        # 1. Сущности (плейсхолдеры)
        for match in placeholder_pattern.finditer(text):
            entity_id = match.group(0)
            if entity_id in entity_map:
                entity = entity_map[entity_id]
                color = CATEGORY_COLORS.get(entity.category, CATEGORY_COLORS['DEFAULT'])
            else:
                parts = match.group(1).rsplit('_', 1)
                category = parts[0] if len(parts) == 2 else 'DEFAULT'
                color = CATEGORY_COLORS.get(category, CATEGORY_COLORS['DEFAULT'])
            highlights.append({
                'start': match.start(),
                'end': match.end(),
                'color': color,
                'type': 'entity'
            })

        # 2. Поиск
        for i, (start, end) in enumerate(self.search_matches):
            is_current = (i == self.current_match_index)
            highlights.append({
                'start': start,
                'end': end,
                'color': ft.Colors.ORANGE_400 if is_current else SEARCH_HIGHLIGHT_COLOR,
                'type': 'search',
                'is_current': is_current
            })

        # Сортируем по позиции
        highlights.sort(key=lambda x: (x['start'], -x['end']))

        # Строим спаны
        spans = []
        last_idx = 0

        for h in highlights:
            # Пропускаем пересекающиеся (поиск внутри плейсхолдера)
            if h['start'] < last_idx:
                continue

            # Текст до
            if h['start'] > last_idx:
                spans.append(ft.TextSpan(
                    text[last_idx:h['start']],
                    style=ft.TextStyle(color="onSurface")
                ))

            # Подсвеченный текст
            style = ft.TextStyle(
                bgcolor=h['color'],
                color=ft.Colors.GREY_900,
            )
            if h['type'] == 'search' and h.get('is_current'):
                style.weight = ft.FontWeight.BOLD

            spans.append(ft.TextSpan(
                text[h['start']:h['end']],
                style=style
            ))
            last_idx = h['end']

        # Остаток
        if last_idx < len(text):
            spans.append(ft.TextSpan(
                text[last_idx:],
                style=ft.TextStyle(color="onSurface")
            ))

        return spans if spans else [ft.TextSpan(text)]

    def _on_search_next(self, e) -> None:
        """Переход к следующему совпадению."""
        if not self.search_matches:
            return
        self.current_match_index = (self.current_match_index + 1) % len(self.search_matches)
        self._update_search_count()
        self._rebuild_result_with_search()
        self._scroll_to_current_match()

    def _on_search_prev(self, e) -> None:
        """Переход к предыдущему совпадению."""
        if not self.search_matches:
            return
        self.current_match_index = (self.current_match_index - 1) % len(self.search_matches)
        self._update_search_count()
        self._rebuild_result_with_search()
        self._scroll_to_current_match()

    def _scroll_to_current_match(self) -> None:
        """Скроллит к текущему найденному совпадению."""
        if not self.search_matches or self.current_match_index < 0:
            return
        if not self.scroll_container or not self.page:
            return

        # Получаем позицию текущего совпадения в тексте
        match_start, match_end = self.search_matches[self.current_match_index]

        # Оцениваем позицию скролла
        # Примерно: позиция символа / длина текста * высота контента
        text_len = len(self.anonymized_text) if self.anonymized_text else 1
        ratio = match_start / text_len

        # Средняя высота строки ~20px, ~80 символов на строку
        estimated_line = match_start // 80
        estimated_offset = estimated_line * 20

        # Скроллим с небольшим отступом сверху
        self.scroll_container.scroll_to(
            offset=max(0, estimated_offset - 100),
            duration=200,  # Плавная анимация
        )

    def _clear_search(self, e) -> None:
        """Очищает поиск."""
        self.search_query = ""
        self.search_matches = []
        self.current_match_index = -1
        self.search_field.value = ""
        self._update_search_count()
        self._rebuild_result_with_search()
        if self.page:
            self.search_field.update()
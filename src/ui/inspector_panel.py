"""
Inspector Panel - нижняя панель контроля.
Вкладки: [Все], [Люди], [Компании], [Контакты], [Память]
Содержит горизонтальную ленту тегов с возможностью удаления.
"""
import flet as ft
from typing import List, Dict, Any, Callable
from src.processing.types import Entity

# Цвета для тегов
TAG_COLORS = {
    "PERSON": ft.Colors.BLUE_400,
    "ORGANIZATION": ft.Colors.GREEN_400,
    "EMAIL": ft.Colors.ORANGE_400,
    "PHONE": ft.Colors.PURPLE_400,
    "CREDIT_CARD": ft.Colors.RED_400,
    "LEARNED_RULE": ft.Colors.TEAL_400,
    "LOC": ft.Colors.AMBER_400,
    "ADDRESS": ft.Colors.AMBER_500,
    "POSTAL_CODE": ft.Colors.AMBER_300,
    "COMPANY": ft.Colors.GREEN_500,
    # Документы
    "PASSPORT_RF": ft.Colors.PINK_400,
    "SNILS": ft.Colors.CYAN_400,
    "INN": ft.Colors.LIME_600,
    "IIN_KZ": ft.Colors.INDIGO_400,
    "IIN_BIN": ft.Colors.INDIGO_400,
    "ID_CARD_KZ": ft.Colors.INDIGO_300,
    "PASSPORT_KZ": ft.Colors.INDIGO_500,
    "BANK_ACCOUNT": ft.Colors.DEEP_ORANGE_400,
    "LICENSE_PLATE": ft.Colors.BROWN_400,
    "DEFAULT": ft.Colors.GREY_500,
}

# Категории для вкладок
CATEGORY_TABS = {
    "all": {"label": "Все", "categories": None},
    "people": {"label": "Люди", "categories": ["PERSON"]},
    "orgs": {"label": "Компании", "categories": ["ORGANIZATION", "COMPANY"]},
    "places": {"label": "Адреса", "categories": ["LOC", "ADDRESS", "POSTAL_CODE"]},
    "contacts": {"label": "Контакты", "categories": ["EMAIL", "PHONE", "CREDIT_CARD", "IBAN", "IBAN_KZ"]},
    "docs": {"label": "Документы", "categories": ["PASSPORT_RF", "SNILS", "INN", "IIN_KZ", "IIN_BIN", "ID_CARD_KZ", "PASSPORT_KZ", "BANK_ACCOUNT", "LICENSE_PLATE"]},
    "memory": {"label": "Память", "categories": ["LEARNED_RULE"]},
}


class InspectorPanel(ft.Container):
    """
    Панель инспектора с вкладками и тегами сущностей.
    """

    def __init__(
        self,
        entities: List[Entity],
        on_entity_click: Callable[[str], None],
        on_entity_remove: Callable[[str], None],
    ):
        super().__init__()

        self.entities = entities
        self.entity_mask_states: Dict[str, bool] = {}
        self.on_entity_click = on_entity_click
        self.on_entity_remove = on_entity_remove
        self.current_tab = "all"
        self.is_collapsed = False

        self.height = 140
        self.bgcolor = "surfaceVariant"
        self.padding = ft.padding.only(left=15, right=15, top=10, bottom=10)
        self.border = ft.border.only(top=ft.BorderSide(1, "outlineVariant"))

        self._build_content()

    def _build_content(self) -> None:
        """Строит содержимое панели."""
        # Вкладки
        self.tabs_row = ft.Row(
            controls=[
                self._build_tab_button(key, config["label"])
                for key, config in CATEGORY_TABS.items()
            ],
            spacing=5,
        )

        # Кнопка сворачивания/разворачивания
        self.collapse_btn = ft.IconButton(
            icon=ft.Icons.KEYBOARD_ARROW_DOWN,
            icon_size=20,
            tooltip="Свернуть панель",
            on_click=self._toggle_collapse,
        )

        # Лента тегов
        self.tags_container = ft.Row(
            controls=self._build_tags(),
            scroll=ft.ScrollMode.AUTO,
            spacing=8,
            expand=True,
        )

        # Статистика
        self.stats_text = ft.Text(
            self._get_stats_text(),
            size=12,
            color="onSurfaceVariant",
        )

        # Контейнер с основным контентом (может сворачиваться)
        self.main_content = ft.Container(
            content=self.tags_container,
            expand=True,
            padding=ft.padding.only(top=10),
            visible=not self.is_collapsed,
        )

        self.content = ft.Column(
            controls=[
                ft.Row(
                    controls=[
                        self.tabs_row,
                        self.stats_text,
                        self.collapse_btn,
                    ],
                    alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                ),
                self.main_content,
            ],
            spacing=5,
            expand=True,
        )

    def _build_tab_button(self, key: str, label: str) -> ft.Container:
        """Создаёт кнопку вкладки."""
        is_active = key == self.current_tab

        return ft.Container(
            content=ft.Text(
                label,
                size=13,
                weight=ft.FontWeight.W_500 if is_active else ft.FontWeight.NORMAL,
                color=ft.Colors.BLUE_700 if is_active else ft.Colors.GREY_700,
            ),
            bgcolor=ft.Colors.WHITE if is_active else ft.Colors.TRANSPARENT,
            border=ft.border.all(1, ft.Colors.BLUE_400 if is_active else ft.Colors.GREY_400),
            border_radius=15,
            padding=ft.padding.symmetric(horizontal=12, vertical=6),
            on_click=lambda e, k=key: self._on_tab_click(k),
            ink=True,
        )

    def _build_tags(self) -> List[ft.Control]:
        """Строит теги для текущей вкладки."""
        tags = []

        # Фильтруем сущности по категории
        filtered = self._get_filtered_entities()

        if not filtered:
            return [
                ft.Text(
                    "Нет сущностей" if self.current_tab == "all" else "Нет сущностей в этой категории",
                    color=ft.Colors.GREY_500,
                    italic=True,
                )
            ]

        for entity in filtered:
            is_active = self.entity_mask_states.get(entity.id, True)
            tags.append(self._build_tag(entity, is_active))

        return tags

    def _build_tag(self, entity: Entity, is_active: bool) -> ft.Container:
        """Создаёт тег сущности."""
        category = entity.category
        color = TAG_COLORS.get(category, TAG_COLORS['DEFAULT'])
        text = entity.original_text

        # Ограничиваем длину
        if len(text) > 25:
            text = text[:22] + "..."

        return ft.Container(
            content=ft.Row(
                controls=[
                    ft.Text(
                        text,
                        size=13,
                        color=ft.Colors.WHITE if is_active else ft.Colors.GREY_900,
                    ),
                    ft.IconButton(
                        icon=ft.Icons.CLOSE,
                        icon_size=14,
                        icon_color=ft.Colors.WHITE if is_active else ft.Colors.GREY_700,
                        tooltip="Убрать из анонимизации",
                        on_click=lambda e, eid=entity.id: self._on_remove_click(eid),
                        style=ft.ButtonStyle(padding=0),
                        width=20,
                        height=20,
                    ),
                ],
                spacing=4,
                tight=True,
            ),
            bgcolor=color if is_active else ft.Colors.GREY_300,
            border_radius=15,
            padding=ft.padding.only(left=10, right=4, top=4, bottom=4),
            on_click=lambda e, eid=entity.id: self._on_tag_click(eid),
            tooltip=f"{entity.original_text} ({category})",
            opacity=1.0 if is_active else 0.7,
        )

    def _get_filtered_entities(self) -> List[Entity]:
        """Возвращает сущности для текущей вкладки."""
        config = CATEGORY_TABS.get(self.current_tab, CATEGORY_TABS["all"])
        categories = config["categories"]

        if categories is None:
            return self.entities

        return [e for e in self.entities if e.category in categories]

    def _get_stats_text(self) -> str:
        """Генерирует текст статистики."""
        if not self.entities:
            return "Сущностей не найдено"

        active = sum(1 for e in self.entities if self.entity_mask_states.get(e.id, True))
        total = len(self.entities)

        return f"Активных: {active} из {total}"

    def _on_tab_click(self, tab_key: str) -> None:
        """Обрабатывает клик по вкладке."""
        self.current_tab = tab_key
        self._refresh()

    def _on_tag_click(self, entity_id: str) -> None:
        """Обрабатывает клик по тегу."""
        self.on_entity_click(entity_id)

    def _on_remove_click(self, entity_id: str) -> None:
        """Обрабатывает удаление тега."""
        self.on_entity_remove(entity_id)

    def _toggle_collapse(self, e) -> None:
        """Сворачивает/разворачивает панель."""
        self.is_collapsed = not self.is_collapsed
        self.main_content.visible = not self.is_collapsed

        # Меняем иконку и тултип
        if self.is_collapsed:
            self.collapse_btn.icon = ft.Icons.KEYBOARD_ARROW_UP
            self.collapse_btn.tooltip = "Развернуть панель"
            self.height = 50
        else:
            self.collapse_btn.icon = ft.Icons.KEYBOARD_ARROW_DOWN
            self.collapse_btn.tooltip = "Свернуть панель"
            # Динамически меняем высоту в зависимости от наличия сущностей
            self.height = 60 if not self.entities else 140

        if self.page:
            self.page.update()

    def _refresh(self) -> None:
        """Обновляет отображение."""
        # Обновляем вкладки
        self.tabs_row.controls = [
            self._build_tab_button(key, config["label"])
            for key, config in CATEGORY_TABS.items()
        ]

        # Обновляем теги
        self.tags_container.controls = self._build_tags()

        # Обновляем статистику
        self.stats_text.value = self._get_stats_text()

        if self.page:
            self.page.update()

    def update_entities(
        self,
        entities: List[Entity],
        mask_states: Dict[str, bool]
    ) -> None:
        """Обновляет список сущностей."""
        self.entities = entities
        self.entity_mask_states = mask_states

        # Автоматически адаптируем высоту панели
        if not self.is_collapsed:
            self.height = 60 if not entities else 140

        self._refresh()

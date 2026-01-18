"""
Command Center - верхняя панель управления приложения.

Содержит:
- Логотип и название
- Кнопки управления документами
- Выпадающий список промптов
- Кнопки экспорта
"""
import flet as ft
from typing import List, Dict, Any, Callable, Optional
import logging

logger = logging.getLogger(__name__)


class CommandCenter(ft.Container):
    """
    Верхняя панель управления.
    Содержит кнопки: Открыть, Новый, Промпты, Память, Скачать, Копировать, Тема.
    """

    def __init__(
        self,
        prompts: List[Dict[str, Any]],
        on_open_file: Callable,
        on_new_document: Callable,
        on_prompt_changed: Callable,
        on_add_prompt: Callable,
        on_download: Callable,
        on_copy: Callable,
        on_memory: Callable,
        on_theme_toggle: Callable,
        on_reidentify_toggle: Callable,
        on_license_click: Callable, # New callback
    ):
        super().__init__()
        self.prompts = prompts
        self.on_open_file = on_open_file
        self.on_new_document = on_new_document
        self.on_prompt_changed = on_prompt_changed
        self.on_add_prompt = on_add_prompt
        self.on_download = on_download
        self.on_copy = on_copy
        self.on_memory = on_memory
        self.on_theme_toggle = on_theme_toggle
        self.on_reidentify_toggle = on_reidentify_toggle
        self.on_license_click = on_license_click

        self.padding = ft.padding.symmetric(horizontal=20, vertical=12)
        # Убираем жесткий белый цвет, используем surfaceVariant для отличия от фона
        self.bgcolor = "surfaceVariant" 
        self.border = ft.border.only(bottom=ft.BorderSide(1, "outlineVariant"))
        
        # Initialize UI elements for later update
        self.btn_reidentify: Optional[ft.IconButton] = None
        self.btn_license: Optional[ft.TextButton] = None

        self._build_content()

    def _build_content(self) -> None:
        """Строит содержимое панели."""
        # Логотип
        logo = ft.Row(
            controls=[
                ft.Icon(ft.Icons.VISIBILITY_OFF, color=ft.Colors.PRIMARY, size=28),
                ft.Text("GhostLayer", size=20, weight=ft.FontWeight.BOLD, color=ft.Colors.PRIMARY),
            ],
            spacing=8
        )
        
        # Индикатор лицензии
        self.btn_license = ft.TextButton(
            text="FREE",
            on_click=self.on_license_click,
            style=ft.ButtonStyle(
                color=ft.Colors.GREY_500,
                text_style=ft.TextStyle(weight=ft.FontWeight.BOLD)
            ),
            tooltip="Нажмите для активации"
        )

        # Кнопки файлов
        self.btn_open_file = ft.ElevatedButton(
            text="Открыть",
            icon=ft.Icons.FOLDER_OPEN,
            on_click=self.on_open_file,
            tooltip="Открыть PDF, DOCX или TXT"
        )

        self.btn_new_doc = ft.IconButton(
            icon=ft.Icons.REFRESH,
            on_click=self.on_new_document,
            disabled=True,
            tooltip="Сбросить (Новый документ)"
        )

        # Выбор промпта
        self.prompt_dropdown = ft.Dropdown(
            label="Промпт",
            options=self._build_prompt_options(),
            on_change=self._handle_prompt_change,
            width=250,
            text_size=14,
            content_padding=10,
        )

        # Кнопки действий
        self.btn_memory = ft.IconButton(
            icon=ft.Icons.MEMORY,
            on_click=self.on_memory,
            tooltip="Память (M)"
        )
        
        # Кнопка темы
        self.btn_theme = ft.IconButton(
            icon=ft.Icons.DARK_MODE,
            on_click=self.on_theme_toggle,
            tooltip="Переключить тему"
        )

        self.btn_download = ft.IconButton(
            icon=ft.Icons.DOWNLOAD,
            on_click=self.on_download,
            disabled=True,
            tooltip="Скачать результат"
        )

        self.btn_reidentify = ft.OutlinedButton(
            text="Деанонимизация",
            icon=ft.Icons.RESTORE_FROM_TRASH, 
            on_click=self.on_reidentify_toggle,
            disabled=True,
            tooltip="Обратная деанонимизация"
        )

        self.btn_copy = ft.FilledButton(
            text="Копировать",
            icon=ft.Icons.COPY,
            on_click=self.on_copy,
            disabled=True,
            tooltip="Копировать для AI"
        )
        
        self.content = ft.Row(
            controls=[
                # Левая часть
                ft.Row(controls=[logo, self.btn_license, self.btn_open_file, self.btn_new_doc], spacing=10),
                # Центр
                ft.Row(controls=[self.prompt_dropdown], alignment=ft.MainAxisAlignment.CENTER),
                # Правая часть
                ft.Row(controls=[self.btn_memory, self.btn_theme, self.btn_download, self.btn_reidentify, self.btn_copy], spacing=5),
            ],
            alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
        )

    def set_license_status(self, mode: str):
        """Обновляет индикатор лицензии."""
        if not self.btn_license:
            return
            
        self.btn_license.text = mode
        if mode in ["PRO", "TRIAL", "TEAM"]:
            self.btn_license.style = ft.ButtonStyle(color=ft.Colors.GREEN_600)
            self.btn_license.tooltip = "Лицензия активна"
        else:
            self.btn_license.style = ft.ButtonStyle(color=ft.Colors.GREY_500)
            self.btn_license.tooltip = "Нажмите для активации"
        
        if self.page:
            self.page.update()

    def _build_prompt_options(self) -> List[ft.dropdown.Option]:
        """Строит список опций для dropdown промптов."""
        options = []
        for p in self.prompts:
            # Формируем текст: название + краткое описание (если есть)
            title = p['title']
            # Для длинного body берём первую строку как описание
            body = p.get('body', '')
            first_line = body.split('\n')[0][:50] if body else ''
            # Убираем лишнее из первой строки
            if first_line.startswith('Ты —'):
                first_line = first_line[4:].strip()
            if len(first_line) > 40:
                first_line = first_line[:40] + '...'

            display_text = title
            options.append(
                ft.dropdown.Option(key=str(p['id']), text=display_text)
            )
        options.append(ft.dropdown.Option(key="__add__", text="+ Добавить свой промпт"))
        return options

    def _handle_prompt_change(self, e) -> None:
        """Обрабатывает изменение промпта."""
        if e.control.value == "__add__":
            self.on_add_prompt()
            e.control.value = None
            if self.page:
                self.page.update()
        else:
            self.on_prompt_changed(e.control.value)

    def update_prompts(self, prompts: List[Dict[str, Any]]) -> None:
        """Обновляет список промптов."""
        self.prompts = prompts
        self.prompt_dropdown.options = self._build_prompt_options()
        if self.page:
            self.page.update()

    def set_document_loaded(self, loaded: bool) -> None:
        """Устанавливает состояние кнопок в зависимости от загрузки документа."""
        self.btn_new_doc.disabled = not loaded
        self.btn_download.disabled = not loaded
        self.btn_copy.disabled = not loaded
        # Кнопка деанонимизации активна только если документ загружен
        if self.btn_reidentify:
            self.btn_reidentify.disabled = not loaded

        if self.page:
            self.page.update()

    def set_reidentification_active(self, is_active: bool) -> None:
        """Обновляет иконку и цвет кнопки деанонимизации."""
        if self.btn_reidentify:
            if is_active:
                self.btn_reidentify.icon = ft.Icons.RESTORE_FROM_TRASH_ROUNDED
                self.btn_reidentify.style = ft.ButtonStyle(color=ft.Colors.ORANGE_500)
                self.btn_reidentify.tooltip = "Закрыть панель деанонимизации"
            else:
                self.btn_reidentify.icon = ft.Icons.RESTORE_FROM_TRASH
                self.btn_reidentify.style = None
                self.btn_reidentify.tooltip = "Обратная деанонимизация"
            self.page.update()

    def get_selected_prompt_id(self) -> Optional[str]:
        """Возвращает ID выбранного промпта."""
        value = self.prompt_dropdown.value
        if value and value != "__add__":
            return value
        return None

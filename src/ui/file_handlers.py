"""
Обработчики файловых операций.

Содержит логику:
- Открытие и валидация файлов
- Сохранение результатов
"""
import os
import logging
from typing import Callable, Optional

import flet as ft
import pyperclip

from src.services.file_service import FileService
from src.services.validator import ValidationError

logger = logging.getLogger(__name__)


class FileHandlers:
    """
    Обработчики файловых операций.

    Инкапсулирует логику работы с файлами:
    - Открытие файлов через диалог
    - Сохранение результатов
    - Копирование в буфер обмена
    """

    def __init__(
        self,
        page: ft.Page,
        on_file_loaded: Callable[[str], None],
        on_error: Callable[[str], None],
        on_success: Callable[[str], None],
    ):
        self.page = page
        self.on_file_loaded = on_file_loaded
        self.on_error = on_error
        self.on_success = on_success

        # Создаём file pickers
        self.file_picker_open = ft.FilePicker(on_result=self._on_file_picked)
        self.file_picker_save = ft.FilePicker(on_result=self._on_save_result)

        # Добавляем в overlay страницы
        self.page.overlay.extend([self.file_picker_open, self.file_picker_save])

        # Контент для сохранения (устанавливается перед сохранением)
        self._content_to_save: str = ""

    def open_file_dialog(self, e) -> None:
        """Открывает диалог выбора файла."""
        self.file_picker_open.pick_files(
            dialog_title="Выберите файл для анонимизации",
            allowed_extensions=["pdf", "txt", "docx"],
            file_type=ft.FilePickerFileType.CUSTOM
        )

    def save_file_dialog(self, content: str) -> None:
        """
        Открывает диалог сохранения файла.

        Args:
            content: Контент для сохранения.
        """
        self._content_to_save = content
        self.file_picker_save.save_file(
            dialog_title="Сохранить результат",
            file_name="anonymized.md",
            allowed_extensions=["md", "txt"]
        )

    def copy_to_clipboard(self, content: str) -> None:
        """
        Копирует контент в буфер обмена.

        Args:
            content: Контент для копирования.
        """
        pyperclip.copy(content)
        self.on_success("Скопировано в буфер обмена!")

    def _on_file_picked(self, e: ft.FilePickerResultEvent) -> None:
        """Обрабатывает выбранный файл."""
        if not e.files:
            return

        file_path = e.files[0].path
        logger.info(f"Выбран файл: {file_path}")
        self._process_file(file_path)

    def _process_file(self, file_path: str) -> None:
        """
        Обрабатывает файл (чтение и передача содержимого).

        Args:
            file_path: Путь к файлу.
        """
        try:
            raw_text = FileService.read_file(file_path)
            if raw_text:
                self.on_file_loaded(raw_text)
            else:
                raise ValueError("Не удалось прочитать файл (пустой результат)")
        except ValidationError as ve:
            logger.warning(f"Ошибка валидации: {ve}")
            self.on_error(str(ve))
        except Exception as ex:
            logger.error(f"Ошибка: {ex}")
            self.on_error(f"Ошибка обработки: {ex}")

    def _on_save_result(self, e: ft.FilePickerResultEvent) -> None:
        """Сохраняет файл."""
        if not e.path:
            return

        try:
            with open(e.path, "w", encoding="utf-8") as f:
                f.write(self._content_to_save)
            self.on_success(f"Сохранено: {e.path}")
        except Exception as ex:
            self.on_error(f"Ошибка сохранения: {ex}")


class LoadingIndicator(ft.Container):
    """
    Индикатор загрузки документа с прогрессом.
    """

    def __init__(self, message: str = "Анализируем документ..."):
        super().__init__()

        self._message_text = ft.Text(message, color=ft.Colors.GREY_600)
        self._progress_bar = ft.ProgressBar(
            width=300,
            value=None,  # Indeterminate mode
            color=ft.Colors.PRIMARY,
            bgcolor=ft.Colors.GREY_300,
        )
        self._stage_text = ft.Text("", size=12, color=ft.Colors.GREY_500)

        self.content = ft.Column(
            controls=[
                ft.ProgressRing(),
                self._message_text,
                self._progress_bar,
                self._stage_text,
            ],
            alignment=ft.MainAxisAlignment.CENTER,
            horizontal_alignment=ft.CrossAxisAlignment.CENTER,
            spacing=10,
        )
        self.alignment = ft.alignment.center
        self.expand = True

    def update_progress(self, current: int, total: int, stage: str) -> None:
        """
        Обновляет прогресс-бар.

        Args:
            current: Текущий прогресс
            total: Общий объём
            stage: Название текущей стадии
        """
        if total > 0:
            self._progress_bar.value = current / total
        self._stage_text.value = stage
        if self.page:
            self._progress_bar.update()
            self._stage_text.update()


class DropArea(ft.Container):
    """
    Область-placeholder для загрузки файлов.
    """

    def __init__(self):
        super().__init__()

        self.content = ft.Column(
            controls=[
                ft.Icon(ft.Icons.UPLOAD_FILE, size=64, color=ft.Colors.GREY_400),
                ft.Text(
                    "Нажмите 'Открыть файл' для загрузки",
                    size=18,
                    color=ft.Colors.GREY_500
                ),
                ft.Text(
                    "Поддерживаемые форматы: PDF, DOCX, TXT",
                    size=14,
                    color=ft.Colors.GREY_400
                ),
            ],
            alignment=ft.MainAxisAlignment.CENTER,
            horizontal_alignment=ft.CrossAxisAlignment.CENTER,
            spacing=10
        )

        self.expand = True
        self.bgcolor = "surfaceVariant"
        self.border = ft.border.all(2, "outlineVariant")
        self.border_radius = 10
        self.alignment = ft.alignment.center

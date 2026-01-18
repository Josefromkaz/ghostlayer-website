"""
Главное окно приложения GhostLayer.
Архитектура: "Студия Сравнения" (Studio Layout)

Декомпозировано на компоненты:
- CommandCenter: верхняя панель управления
- FileHandlers: обработка файлов
- DialogManager: управление диалогами
- SplitView: двухпанельный просмотр
- InspectorPanel: панель инспектора
"""
import gc
import logging
from typing import Dict, Any, List, Optional
from collections import Counter

import flet as ft

from src.processing.pipeline import anonymize_text, sync_entities_from_llm_result
from src.processing.types import Entity
from src.database.db_manager import DBManager
from src.services.session_logger import get_session_logger
from src.licensing.license_manager import get_license_manager
from src.licensing.online_check import OnlineChecker

# UI компоненты
from src.ui.split_view import SplitView
from src.ui.inspector_panel import InspectorPanel
from src.ui.command_center import CommandCenter
from src.ui.file_handlers import FileHandlers, LoadingIndicator, DropArea
from src.ui.reidentification_panel import ReidentificationPanel
from src.ui.license_dialog import LicenseDialog
from src.ui.paywall_dialog import PaywallDialog
from src.ui.dialogs import (
    DialogManager,
    AddToMemoryDialog,
    MemoryManagementDialog,
    AddPromptDialog,
    TutorialManager,
)

logger = logging.getLogger(__name__)


class MainWindow(ft.Column):
    """
    Главный компонент UI - Студия Сравнения.

    Координирует работу всех подкомпонентов:
    - CommandCenter: управление документами
    - SplitView: отображение оригинала и результата
    - InspectorPanel: просмотр и управление сущностями
    """

    def __init__(self, page: ft.Page):
        super().__init__()
        self.page = page

        # Состояние документа
        self.original_text: str = ""
        self.anonymized_text: str = ""
        self.entities: List[Entity] = []
        self.prompts: List[Dict[str, Any]] = []
        self.entity_mask_states: Dict[str, bool] = {}
        self.anti_entities: set[str] = set()

        # Layout
        self.expand = True
        self.spacing = 0

        # Инициализация
        self._load_data()
        self._init_components()
        self._build_ui()
        self._setup_keyboard_handlers()
        
        # Применяем сохраненную тему
        self._apply_saved_theme()
        
        # Обновляем статус лицензии
        self._update_license_status()

        # Запускаем туториал (если нужно)
        self.tutorial_manager.show_welcome_guide()

    def _apply_saved_theme(self) -> None:
        """Применяет сохраненную тему."""
        with DBManager() as db:
            theme = db.get_setting("theme_mode", "light")
        
        if theme == "dark":
            self.page.theme_mode = ft.ThemeMode.DARK
            self.command_center.btn_theme.icon = ft.Icons.LIGHT_MODE
        else:
            self.page.theme_mode = ft.ThemeMode.LIGHT
            self.command_center.btn_theme.icon = ft.Icons.DARK_MODE
        
        self.page.update()

    def _load_data(self) -> None:
        """Загружает данные из БД."""
        with DBManager() as db:
            self.prompts = db.get_all_prompts()

            # Загружаем правила-исключения (только для PRO)
            if get_license_manager().can_use_feature("memory"):
                rules = db.get_all_learning_rules()
                self.anti_entities = {
                    r['pattern'] for r in rules
                    if r.get('rule_type') == 'whitelist'
                }
                logger.info(f"Загружено {len(self.anti_entities)} исключений из БД")
            else:
                self.anti_entities = set()
                logger.debug("Исключения недоступны: требуется PRO-лицензия")

    def _init_components(self) -> None:
        """Инициализирует компоненты UI."""
        # Менеджер диалогов
        self.dialog_manager = DialogManager(self.page)

        # Обработчики файлов
        self.file_handlers = FileHandlers(
            page=self.page,
            on_file_loaded=self._on_file_loaded,
            on_error=self.dialog_manager.show_error,
            on_success=self.dialog_manager.show_success,
        )
        
        # Лицензионные диалоги
        self.license_dialog = LicenseDialog(
            page=self.page,
            on_success=self._update_license_status
        )
        self.paywall_dialog = PaywallDialog(
            page=self.page,
            on_enter_key=self._on_enter_key_click
        )

        # Диалоги
        self.add_to_memory_dialog = AddToMemoryDialog(
            page=self.page,
            on_confirm=self._on_memory_rule_added,
            dialog_manager=self.dialog_manager,
        )

        self.memory_dialog = MemoryManagementDialog(
            page=self.page,
            on_rule_deleted=self._on_memory_rule_deleted,
            dialog_manager=self.dialog_manager,
        )

        self.add_prompt_dialog = AddPromptDialog(
            page=self.page,
            on_prompt_added=self._on_prompt_added,
            dialog_manager=self.dialog_manager,
        )
        
        self.tutorial_manager = TutorialManager(self.page)

        # Панель обратной деанонимизации
        self.reidentification_panel = ReidentificationPanel(
            on_reidentify=self._on_reidentify_request,
            on_close=self._toggle_reidentification_panel,
        )

        # Онлайн проверка (обновления + лицензия)
        self.online_checker = OnlineChecker(
            on_update_found=self._on_update_found,
            on_license_revoked=self._on_license_revoked
        )

    def _build_ui(self) -> None:
        """Строит интерфейс."""
        # Command Center (верхняя панель)
        self.command_center = CommandCenter(
            prompts=self.prompts,
            on_open_file=self.file_handlers.open_file_dialog,
            on_new_document=self._on_new_document,
            on_prompt_changed=self._on_prompt_changed,
            on_add_prompt=self.add_prompt_dialog.show,
            on_download=self._on_download,
            on_copy=self._on_copy,
            on_memory=self._on_memory_click,
            on_theme_toggle=self._on_theme_toggle,
            on_reidentify_toggle=self._toggle_reidentification_panel,
            on_license_click=self._on_license_click,
        )
        
        # Регистрация диалогов на странице
        self.page.overlay.append(self.license_dialog)
        self.page.overlay.append(self.paywall_dialog)

        # Drop Area (placeholder)
        self.drop_area = DropArea()

        # Split View Container
        self.split_view_container = ft.Container(
            content=self.drop_area,
            expand=True,
            padding=ft.padding.symmetric(horizontal=10, vertical=10),
        )

        # Inspector Panel (нижняя панель)
        self.inspector_panel = InspectorPanel(
            entities=self.entities,
            on_entity_click=self._on_entity_click,
            on_entity_remove=self._on_entity_remove,
        )

        # Собираем layout
        self.controls = [
            self.command_center,
            self.split_view_container,
            self.reidentification_panel, # Добавляем панель восстановления
            self.inspector_panel,
        ]
        
        # Запускаем фоновую проверку после загрузки UI
        self.online_checker.start_background_check()

    def _on_update_found(self, version: str, url: str) -> None:
        """Показывает уведомление о новой версии."""
        def open_url(e):
            self.page.launch_url(url)
            
        snack = ft.SnackBar(
            content=ft.Text(f"Доступна новая версия: {version}"),
            action="Скачать",
            on_action=open_url,
            duration=10000, # 10 секунд
        )
        self.page.snack_bar = snack
        self.page.snack_bar.open = True
        self.page.update()

    def _on_license_revoked(self) -> None:
        """Обрабатывает отзыв лицензии сервером."""
        self._update_license_status() # Обновит иконку на FREE
        self.dialog_manager.show_error(
            "Ваша лицензия была отозвана сервером. Приложение переключено в FREE режим."
        )

    def _on_theme_toggle(self, e) -> None:
        """Переключает тему приложения."""
        new_mode = "light"
        if self.page.theme_mode == ft.ThemeMode.LIGHT:
            self.page.theme_mode = ft.ThemeMode.DARK
            self.command_center.btn_theme.icon = ft.Icons.LIGHT_MODE
            new_mode = "dark"
        else:
            self.page.theme_mode = ft.ThemeMode.LIGHT
            self.command_center.btn_theme.icon = ft.Icons.DARK_MODE
            new_mode = "light"
        
        with DBManager() as db:
            db.set_setting("theme_mode", new_mode)
        
        self.page.update()

    def _setup_keyboard_handlers(self) -> None:
        """Настраивает обработчики клавиатуры."""
        self.page.on_keyboard_event = self._on_keyboard_event

    # === FILE OPERATIONS ===

    def _on_file_loaded(self, text: str) -> None:
        """
        Обрабатывает загруженный текст файла.

        Args:
            text: Содержимое файла.
        """
        # Показываем индикатор загрузки с прогрессом
        self._loading_indicator = LoadingIndicator()
        self.split_view_container.content = self._loading_indicator
        self.page.update()

        # Обрабатываем текст
        self.original_text = text
        self._run_pipeline()

        # Показываем результат
        count = len(self.entities)
        if count > 0:
            self.dialog_manager.show_success(f"Найдено {count} объектов")
        else:
            self.dialog_manager.show_info(
                "Автоматических совпадений не найдено. Вы можете выделить их вручную."
            )

        logger.info(f"Обработано: {count} сущностей")
        self._update_view()
        
        # Туториал: работа с файлом
        self.tutorial_manager.show_file_loaded_guide()

    def _on_new_document(self, e) -> None:
        """Сбрасывает документ."""
        self.original_text = ""
        self.anonymized_text = ""
        self.entities = []
        self.entity_mask_states = {}
        # Не очищаем anti_entities, так как они теперь глобальные из БД
        gc.collect()
        self._update_view()

    def _on_download(self, e) -> None:
        """Скачивает результат."""
        content = self._build_export_content()
        self.file_handlers.save_file_dialog(content)

    def _on_copy(self, e) -> None:
        """Копирует в буфер обмена."""
        content = self._build_export_content()
        self.file_handlers.copy_to_clipboard(content)

        # Логируем копирование
        get_session_logger().add_entry(
            level="INFO",
            module="export",
            event="copied_to_clipboard",
            details={"content_length": len(content)}
        )

        # Туториал: подсказываем про восстановление, так как пользователь скопировал текст для AI
        if self.tutorial_manager:
             self.tutorial_manager.show_reidentify_guide()

    # === PROMPT OPERATIONS ===

    def _on_prompt_changed(self, prompt_id: str) -> None:
        """Обрабатывает выбор промпта."""
        # Промпт сохраняется для использования при экспорте
        pass

    def _on_prompt_added(self) -> None:
        """Обрабатывает добавление промпта."""
        self._load_data()
        self.command_center.update_prompts(self.prompts)

    # === LICENSE OPERATIONS ===

    def _update_license_status(self) -> None:
        """Обновляет статус лицензии в UI."""
        mode = get_license_manager().mode
        self.command_center.set_license_status(mode)
        
    def _on_license_click(self, e) -> None:
        """Обработчик клика по кнопке лицензии."""
        self.license_dialog.open = True
        self.page.update()
        
    def _on_enter_key_click(self) -> None:
        """Открывает диалог ввода ключа из Paywall."""
        self.license_dialog.open = True
        self.page.update()

    # === MEMORY OPERATIONS ===

    def _on_memory_click(self, e=None) -> None:
        """Обработчик клика по кнопке Память."""
        def show_paywall():
            self.paywall_dialog.open = True
            self.page.update()

        self.memory_dialog.show(on_paywall_needed=show_paywall)

    def _on_add_to_memory(self, text: str) -> None:
        """Показывает диалог добавления в память."""
        # Проверка лицензии
        if not get_license_manager().can_use_feature("memory"):
            self.paywall_dialog.open = True
            self.page.update()
            return
            
        if text:
            self.add_to_memory_dialog.show(text)

    def _on_multi_select(self, words: List[str]) -> None:
        """Обрабатывает выбор нескольких слов."""
        # Проверка лицензии
        if not get_license_manager().can_use_feature("memory"):
            self.paywall_dialog.open = True
            self.page.update()
            return

        if words:
            phrase = " ".join(words)
            self.add_to_memory_dialog.show(phrase)

    def _on_memory_rule_added(self, text: str) -> None:
        """Обрабатывает добавление правила в память."""
        # Логируем добавление в память (без самого текста)
        get_session_logger().add_entry(
            level="INFO",
            module="memory",
            event="rule_added",
            details={"text_length": len(text)}
        )
        # Удаляем из локального anti_entities (если был в whitelist)
        self.anti_entities.discard(text)
        self._run_pipeline()
        self._update_view()

    def _on_memory_rule_deleted(self) -> None:
        """Обрабатывает удаление правила из памяти."""
        if self.original_text:
            self._run_pipeline()
            self._update_view()

    # === ENTITY OPERATIONS ===

    def _on_entity_click(self, entity_id: str) -> None:
        """Обрабатывает клик по сущности."""
        logger.debug(f"Клик по сущности: {entity_id}")

    def _on_entity_remove(self, entity_id: str) -> None:
        """Убирает сущность из анонимизации и добавляет в исключения."""
        # Проверка лицензии для добавления в whitelist
        if not get_license_manager().can_use_feature("memory"):
            self.paywall_dialog.open = True
            self.page.update()
            return

        # Находим сущность
        entity = next((e for e in self.entities if e.id == entity_id), None)
        if entity:
            text_to_exclude = entity.original_text

            # Логируем действие (без чувствительных данных)
            get_session_logger().log_entity_action(
                action="removed_to_whitelist",
                category=entity.category
            )

            # Добавляем текст в список анти-сущностей
            self.anti_entities.add(text_to_exclude)

            # Сохраняем в БД как правило исключения
            try:
                with DBManager() as db:
                    db.add_learning_rule(
                        pattern=text_to_exclude,
                        match_type='ignore_case',
                        rule_type='whitelist'
                    )
                logger.info(f"Добавлено в исключения и сохранено в БД: {text_to_exclude}")
            except Exception as e:
                logger.error(f"Ошибка сохранения исключения в БД: {e}")

            # Разблокируем все сущности с таким текстом
            for e in self.entities:
                if e.original_text == text_to_exclude:
                    self.entity_mask_states[e.id] = False

        elif entity_id in self.entity_mask_states:
             self.entity_mask_states[entity_id] = False

        self._regenerate_anonymized_text()
        self._update_view()

    def _on_entity_toggle(self, entity_id: str) -> None:
        """
        Обрабатывает клик по сущности в оригинале.
        Теперь это работает как добавление в исключения (whitelist).
        """
        # Логика идентична удалению через инспектор
        self._on_entity_remove(entity_id)

    # === KEYBOARD HANDLERS ===

    def _on_keyboard_event(self, e: ft.KeyboardEvent) -> None:
        """Обрабатывает клавиатурные события."""
        if e.key == "S" and not e.ctrl and not e.alt:
            self._toggle_selection_mode()
        elif e.key == "Enter" and not e.ctrl and not e.alt:
            self._confirm_selection()
        elif e.key == "M" and not e.ctrl and not e.alt:
            self._on_memory_click()

    def _toggle_selection_mode(self) -> None:
        """Переключает режим выбора."""
        # Проверка лицензии — режим выбора для добавления в память
        if not get_license_manager().can_use_feature("memory"):
            self.paywall_dialog.open = True
            self.page.update()
            return

        content = self.split_view_container.content
        if hasattr(content, '_toggle_selection_mode'):
            content._toggle_selection_mode(None)

    def _confirm_selection(self) -> None:
        """Подтверждает выбор слов."""
        # Проверка лицензии
        if not get_license_manager().can_use_feature("memory"):
            self.paywall_dialog.open = True
            self.page.update()
            return

        content = self.split_view_container.content
        if hasattr(content, '_confirm_multi_selection'):
            content._confirm_multi_selection()

    # === PIPELINE ===

    def _run_pipeline(self) -> None:
        """Запускает pipeline анонимизации."""
        if not self.original_text:
            return

        # Callback для обновления прогресса в UI
        def on_progress(current: int, total: int, stage: str) -> None:
            if hasattr(self, '_loading_indicator') and self._loading_indicator:
                self._loading_indicator.update_progress(current, total, stage)

        result = anonymize_text(self.original_text, on_progress=on_progress)
        self.entities = result.entities

        # Инициализируем маски: скрываем только то, чего нет в исключениях
        self.entity_mask_states = {
            e.id: (e.original_text not in self.anti_entities)
            for e in self.entities
        }

        # Перегенерируем текст с учётом исключений
        self._regenerate_anonymized_text()

        # Структурированный лог результатов pipeline
        active_count = sum(1 for v in self.entity_mask_states.values() if v)
        by_category = dict(Counter(e.category for e in self.entities))
        get_session_logger().log_pipeline_result(
            total_entities=len(self.entities),
            active_entities=active_count,
            by_category=by_category
        )

    def _regenerate_anonymized_text(self) -> None:
        """Перегенерирует текст с учётом масок.

        Использует позиционную замену (original_start/original_end),
        чтобы корректно обрабатывать дубли текста.
        """
        # Берём только активные сущности
        active_entities = [
            e for e in self.entities
            if self.entity_mask_states.get(e.id, True)
        ]

        # Сортируем по позиции С КОНЦА (чтобы замены не сбивали индексы)
        sorted_entities = sorted(
            active_entities,
            key=lambda e: e.original_start,
            reverse=True
        )

        temp_text = self.original_text
        for entity in sorted_entities:
            # Позиционная замена вместо replace()
            if entity.original_start >= 0 and entity.original_end > entity.original_start:
                temp_text = (
                    temp_text[:entity.original_start] +
                    entity.id +
                    temp_text[entity.original_end:]
                )

        self.anonymized_text = temp_text

    def _build_export_content(self) -> str:
        """Собирает контент для экспорта."""
        content = self.anonymized_text

        # Инструкция для AI: сохранять маски в ответе (для обратной деанонимизации)
        mask_instruction = (
            "\n\n---\n"
            "**ВАЖНО:** В своём ответе сохраняй все маски вида [PERSON_1], [COMPANY_1], [EMAIL_1] и т.д. "
            "Не заменяй их на реальные или вымышленные данные. Это необходимо для обратной деанонимизации."
        )

        prompt_id = self.command_center.get_selected_prompt_id()
        if prompt_id:
            prompt = next(
                (p for p in self.prompts if p['id'] == int(prompt_id)),
                None
            )
            if prompt:
                content = f"{prompt['body']}\n\n---\n\n{self.anonymized_text}{mask_instruction}"
        else:
            # Даже без промпта добавляем инструкцию
            content = f"{self.anonymized_text}{mask_instruction}"

        return content

    # === VIEW UPDATE ===

    def _update_view(self) -> None:
        """Обновляет отображение."""
        has_text = bool(self.original_text)

        # Обновляем состояние кнопок
        self.command_center.set_document_loaded(has_text)
        self.command_center.set_reidentification_active(self.reidentification_panel.visible)

        # Синхронизируем сущности с результатом (если есть новые от LLM)
        if has_text and self.anonymized_text:
            synced_entities, _ = sync_entities_from_llm_result(
                self.original_text,
                self.anonymized_text,
                self.entities
            )
            # Добавляем новые сущности в общий список
            new_entity_ids = {e.id for e in synced_entities} - {e.id for e in self.entities}
            for entity in synced_entities:
                if entity.id in new_entity_ids:
                    self.entities.append(entity)
                    # По умолчанию новые сущности от LLM активны (выделены)
                    self.entity_mask_states[entity.id] = True

        # Обновляем рабочую область
        if not has_text:
            self.split_view_container.content = self.drop_area
        else:
            # Фильтруем активные сущности
            active_entities = [
                e for e in self.entities
                if self.entity_mask_states.get(e.id, True)
            ]

            # Проверяем, есть ли уже SplitView — если да, обновляем его данные
            current_content = self.split_view_container.content
            if isinstance(current_content, SplitView):
                # Обновляем существующий SplitView без пересоздания
                current_content.update_data(
                    anonymized_text=self.anonymized_text,
                    entities=active_entities,
                )
            else:
                # Первый раз — создаём новый SplitView
                self.split_view_container.content = SplitView(
                    original_text=self.original_text,
                    anonymized_text=self.anonymized_text,
                    entities=active_entities,
                    on_add_to_memory=self._on_add_to_memory,
                    on_entity_toggle=self._on_entity_toggle,
                    on_multi_select=self._on_multi_select,
                )

        # Обновляем инспектор
        self.inspector_panel.update_entities(
            self.entities,
            self.entity_mask_states
        )

        self.page.update()

    def _on_reidentify_request(self, ai_response: str) -> None:
        """
        Выполняет обратную деанонимизацию текста, полученного от AI.
        """
        if not self.entities:
            self.dialog_manager.show_info("Нет сущностей для восстановления.")
            return

        restored_text = ai_response
        # Используем entities из текущей сессии
        for entity in self.entities:
            # Ищем маску по ID и заменяем на оригинальный текст
            mask_id = entity.id
            original_value = entity.original_text
            
            # Важно: заменять только полные маски, чтобы избежать частичных совпадений
            restored_text = restored_text.replace(mask_id, original_value)
        
        # Обновляем anonymized_text, чтобы показать результат
        self.anonymized_text = restored_text
        self.reidentification_panel.ai_response_field.value = restored_text # Показываем результат в поле
        self.dialog_manager.show_success("Сущности восстановлены!")
        self._update_view() # Перерисовываем UI

    def _toggle_reidentification_panel(self, e=None) -> None:
        """
        Переключает видимость панели обратной деанонимизации.
        """
        self.reidentification_panel.visible = not self.reidentification_panel.visible
        
        if self.reidentification_panel.visible:
            # Туториал: обратная деанонимизация
            self.tutorial_manager.show_reidentify_guide()
            
        self.reidentification_panel.ai_response_field.value = "" # Очищаем поле при открытии/закрытии
        self.reidentification_panel.restore_button.disabled = True
        self.command_center.set_reidentification_active(self.reidentification_panel.visible)
        self.page.update()

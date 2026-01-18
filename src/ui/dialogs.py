"""
Диалоговые окна приложения GhostLayer.

Содержит все модальные диалоги:
- Добавление в память
- Управление памятью
- Добавление промпта
- Экспорт логов
"""
import flet as ft
from typing import List, Dict, Any, Callable, Optional
from datetime import datetime
import logging

from src.database.db_manager import DBManager
from src.services.validator import Validator, ValidationError
from src.services.session_logger import get_session_logger
from src.licensing.license_manager import get_license_manager

logger = logging.getLogger(__name__)


class DialogManager:
    """
    Менеджер диалоговых окон.

    Централизованное управление всеми диалогами приложения.
    """

    def __init__(self, page: ft.Page):
        self.page = page

    def show_error(self, message: str) -> None:
        """Показывает сообщение об ошибке."""
        self.page.snack_bar = ft.SnackBar(
            content=ft.Text(message, color=ft.Colors.WHITE),
            bgcolor=ft.Colors.RED_600,
            duration=3000
        )
        self.page.snack_bar.open = True
        self.page.update()

    def show_success(self, message: str) -> None:
        """Показывает сообщение об успехе."""
        self.page.snack_bar = ft.SnackBar(
            content=ft.Text(message, color=ft.Colors.WHITE),
            bgcolor=ft.Colors.GREEN_600,
            duration=2000
        )
        self.page.snack_bar.open = True
        self.page.update()

    def show_info(self, message: str) -> None:
        """Показывает информационное сообщение."""
        self.page.snack_bar = ft.SnackBar(
            content=ft.Text(message, color=ft.Colors.WHITE),
            bgcolor=ft.Colors.BLUE_GREY_600,
            duration=4000
        )
        self.page.snack_bar.open = True
        self.page.update()


class AddToMemoryDialog:
    """
    Диалог добавления слова/фразы в память.
    """

    def __init__(
        self,
        page: ft.Page,
        on_confirm: Callable[[str], None],
        dialog_manager: DialogManager
    ):
        self.page = page
        self.on_confirm = on_confirm
        self.dialog_manager = dialog_manager
        self.dialog: Optional[ft.AlertDialog] = None

    def show(self, text: str) -> None:
        """
        Показывает диалог подтверждения добавления в память.

        Args:
            text: Текст для добавления в память.
        """
        display_text = text if len(text) <= 50 else text[:47] + "..."

        def confirm_add(e):
            self._add_to_memory(text)
            self.page.close(self.dialog)

        def close_dialog(e):
            self.page.close(self.dialog)

        self.dialog = ft.AlertDialog(
            modal=True,
            title=ft.Text("Добавить в память?"),
            content=ft.Column([
                ft.Text(
                    "Это слово будет скрываться во всех документах:",
                    size=13,
                    color=ft.Colors.GREY_700,
                ),
                ft.Container(
                    content=ft.Text(
                        f'"{display_text}"',
                        weight=ft.FontWeight.BOLD,
                        size=14,
                        color=ft.Colors.TEAL_700,
                    ),
                    bgcolor=ft.Colors.TEAL_50,
                    padding=10,
                    border_radius=5,
                    margin=ft.margin.only(top=5),
                ),
                ft.Container(
                    content=ft.Row([
                        ft.Icon(ft.Icons.INFO_OUTLINE, size=14, color=ft.Colors.BLUE_400),
                        ft.Text(
                            "Совет: нажмите S для режима выбора нескольких слов",
                            size=12,
                            color=ft.Colors.BLUE_600,
                            italic=True,
                        ),
                    ], spacing=5),
                    padding=ft.padding.only(top=10),
                ),
            ], tight=True, spacing=5),
            actions=[
                ft.TextButton("Отмена", on_click=close_dialog),
                ft.FilledButton(
                    "Запомнить",
                    icon=ft.Icons.MEMORY,
                    on_click=confirm_add
                ),
            ],
            actions_alignment=ft.MainAxisAlignment.END,
        )
        self.page.open(self.dialog)

    def _add_to_memory(self, text: str) -> None:
        """Добавляет текст в память."""
        try:
            Validator.validate_memory_rule(text)
        except ValidationError as ve:
            self.dialog_manager.show_error(str(ve))
            return

        with DBManager() as db:
            # Удаляем из whitelist, если текст там был (разрешаем конфликт)
            db.delete_whitelist_by_pattern(text)
            # Добавляем как правило анонимизации
            db.add_learning_rule(text)

        self.on_confirm(text)
        display = text if len(text) <= 30 else text[:27] + "..."
        self.dialog_manager.show_success(f"'{display}' добавлено в память")


class MemoryManagementDialog:
    """
    Диалог управления правилами памяти.
    """

    def __init__(
        self,
        page: ft.Page,
        on_rule_deleted: Callable[[], None],
        dialog_manager: DialogManager
    ):
        self.page = page
        self.on_rule_deleted = on_rule_deleted
        self.dialog_manager = dialog_manager
        self.dialog: Optional[ft.AlertDialog] = None

    def show(self, e=None, on_paywall_needed: callable = None) -> None:
        """Показывает диалог управления памятью с вкладками."""
        # Проверка лицензии
        if not get_license_manager().can_use_feature("memory"):
            if on_paywall_needed:
                on_paywall_needed()
            else:
                self.dialog_manager.show_info("Управление памятью доступно только в PRO версии.")
            return

        with DBManager() as db:
            rules = db.get_all_learning_rules()

        # Разделяем правила на два списка
        anonymize_rules = [r for r in rules if r.get('rule_type', 'anonymize') == 'anonymize']
        whitelist_rules = [r for r in rules if r.get('rule_type') == 'whitelist']

        # Категории для выбора
        AVAILABLE_CATEGORIES = [
            ("PERSON", "Человек"),
            ("ORGANIZATION", "Организация"),
            ("COMPANY", "Компания"),
            ("LOC", "Локация"),
            ("ADDRESS", "Адрес"),
            ("DATE", "Дата"),
            ("PHONE", "Телефон"),
            ("EMAIL", "Email"),
            ("LEARNED_RULE", "Другое"),
        ]

        def delete_rule(rule_id: int, rule_text: str):
            def handler(e):
                with DBManager() as db:
                    db.delete_learning_rule(rule_id)
                self.dialog_manager.show_success(f"'{rule_text}' удалено")
                self.page.close(self.dialog)
                self.show()
                self.on_rule_deleted()
            return handler

        def update_category(rule_id: int, new_category: str):
            def handler(e):
                with DBManager() as db:
                    db.update_learning_rule_category(rule_id, new_category)
                self.dialog_manager.show_success(f"Категория обновлена: {new_category}")
                self.page.close(self.dialog)
                self.show()
                # Нужно обновить view, чтобы применилась новая категория
                self.on_rule_deleted() # Это перерисует экран
            return handler

        def close_dialog(e):
            self.page.close(self.dialog)

        def build_list_controls(rules_list: List[Dict[str, Any]], empty_msg: str, color: str) -> List[ft.Control]:
            if not rules_list:
                return [ft.Text(empty_msg, color=ft.Colors.GREY_500, italic=True)]
            
            items = []
            for rule in rules_list:
                category = rule.get('category', 'LEARNED_RULE')
                
                # Создаем меню изменения категории
                category_items = [
                    ft.PopupMenuItem(
                        text=label,
                        on_click=update_category(rule['id'], code),
                        checked=(code == category)
                    ) for code, label in AVAILABLE_CATEGORIES
                ]

                # Меню действий (три точки)
                actions_menu = ft.PopupMenuButton(
                    items=[
                        ft.PopupMenuItem(
                            text="Изменить категорию",
                            icon=ft.Icons.CATEGORY,
                            content=ft.Column(
                                [ft.Text("Выберите категорию:", size=12, weight="bold")] + 
                                [
                                    ft.Container(
                                        content=ft.Text(label),
                                        padding=5,
                                        on_click=update_category(rule['id'], code),
                                        bgcolor=ft.Colors.BLUE_50 if code == category else None
                                    ) for code, label in AVAILABLE_CATEGORIES
                                ],
                                spacing=2
                            )
                        ),
                        ft.PopupMenuItem(text="Удалить", icon=ft.Icons.DELETE, on_click=delete_rule(rule['id'], rule['pattern'])),
                    ]
                )

                # Упрощенное меню (так как вложенные меню в Flet работают специфично)
                # Лучше сделаем просто список действий
                menu_items = []
                # Submenu trick using a dialog? No, simple list is better.
                # Let's just list categories directly in the main menu for simplicity
                
                submenu_items = [
                    ft.PopupMenuItem(
                        text=f"Сменить на: {label}", 
                        on_click=update_category(rule['id'], code),
                        icon=ft.Icons.CHECK if code == category else None
                    ) for code, label in AVAILABLE_CATEGORIES
                ]
                
                final_menu = ft.PopupMenuButton(
                    icon=ft.Icons.MORE_VERT,
                    tooltip="Действия",
                    items=[
                        ft.PopupMenuItem(text="Удалить", icon=ft.Icons.DELETE, on_click=delete_rule(rule['id'], rule['pattern'])),
                        ft.PopupMenuItem(), # Divider
                        ft.PopupMenuItem(text="Категория:", disabled=True),
                    ] + submenu_items
                )

                items.append(
                    ft.Container(
                        content=ft.Row(
                            controls=[
                                ft.Column([
                                    ft.Text(
                                        rule['pattern'],
                                        size=14,
                                        weight="bold",
                                        color=ft.Colors.GREY_900,
                                    ),
                                    ft.Text(
                                        category,
                                        size=11,
                                        color=ft.Colors.TEAL_600,
                                    )
                                ], spacing=2, expand=True),
                                final_menu,
                            ],
                            alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        ),
                        padding=ft.padding.symmetric(horizontal=10, vertical=5),
                        bgcolor=color,
                        border_radius=5,
                    )
                )
            return items

        # Контент для вкладки "Скрывать"
        mask_content = ft.Column(
            controls=build_list_controls(anonymize_rules, "Нет правил скрытия", ft.Colors.TEAL_50),
            spacing=5,
            scroll=ft.ScrollMode.AUTO,
            expand=True,
        )

        # Контент для вкладки "Исключения"
        whitelist_content = ft.Column(
            controls=build_list_controls(whitelist_rules, "Нет исключений", ft.Colors.ORANGE_50),
            spacing=5,
            scroll=ft.ScrollMode.AUTO,
            expand=True,
        )

        # Tabs
        tabs = ft.Tabs(
            selected_index=0,
            animation_duration=300,
            tabs=[
                ft.Tab(
                    text="Скрывать",
                    icon=ft.Icons.VISIBILITY_OFF,
                    content=ft.Container(content=mask_content, padding=10)
                ),
                ft.Tab(
                    text="Исключения",
                    icon=ft.Icons.VISIBILITY,
                    content=ft.Container(content=whitelist_content, padding=10)
                ),
            ],
            expand=True,
        )

        # File picker для экспорта логов
        self.log_file_picker = ft.FilePicker(
            on_result=self._on_log_export_result
        )
        self.page.overlay.append(self.log_file_picker)

        # File picker для экспорта правил
        self.rules_export_picker = ft.FilePicker(
            on_result=self._on_rules_export_result
        )
        self.page.overlay.append(self.rules_export_picker)

        # File picker для импорта правил
        self.rules_import_picker = ft.FilePicker(
            on_result=self._on_rules_import_result
        )
        self.page.overlay.append(self.rules_import_picker)

        def export_logs(e):
            """Открывает диалог сохранения логов."""
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            self.log_file_picker.save_file(
                dialog_title="Сохранить технические логи",
                file_name=f"ghostlayer_logs_{timestamp}.json",
                allowed_extensions=["json"],
            )

        def export_rules(e):
            """Открывает диалог экспорта правил."""
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            self.rules_export_picker.save_file(
                dialog_title="Экспорт правил памяти",
                file_name=f"ghostlayer_rules_{timestamp}.json",
                allowed_extensions=["json"],
            )

        def import_rules(e):
            """Открывает диалог импорта правил."""
            self.rules_import_picker.pick_files(
                dialog_title="Импорт правил памяти",
                allowed_extensions=["json"],
                file_type=ft.FilePickerFileType.CUSTOM,
            )

        # Количество записей в логе
        session_logger = get_session_logger()
        log_count = session_logger.get_entries_count()

        total_rules = len(anonymize_rules) + len(whitelist_rules)

        self.dialog = ft.AlertDialog(
            modal=True,
            title=ft.Row([
                ft.Icon(ft.Icons.MEMORY, color=ft.Colors.TEAL_600),
                ft.Text("Управление памятью", weight=ft.FontWeight.BOLD),
            ], spacing=10),
            content=ft.Container(
                content=tabs,
                width=500,
                height=400,
            ),
            actions=[
                ft.TextButton(
                    "Импорт",
                    icon=ft.Icons.UPLOAD_FILE,
                    on_click=import_rules,
                    tooltip="Импортировать правила из файла",
                ),
                ft.TextButton(
                    f"Экспорт ({total_rules})",
                    icon=ft.Icons.DOWNLOAD,
                    on_click=export_rules,
                    tooltip="Экспортировать все правила в файл",
                    disabled=total_rules == 0,
                ),
                ft.TextButton(
                    f"Логи ({log_count})",
                    icon=ft.Icons.BUG_REPORT,
                    on_click=export_logs,
                    tooltip="Экспорт технических логов",
                ),
                ft.Container(expand=True),  # Spacer
                ft.TextButton("Закрыть", on_click=close_dialog),
            ],
            actions_alignment=ft.MainAxisAlignment.END,
        )
        self.page.open(self.dialog)


    def _on_log_export_result(self, e: ft.FilePickerResultEvent) -> None:
        """Обрабатывает результат сохранения логов."""
        if e.path:
            try:
                session_logger = get_session_logger()
                json_content = session_logger.export_json()

                with open(e.path, 'w', encoding='utf-8') as f:
                    f.write(json_content)

                self.dialog_manager.show_success(f"Логи сохранены: {e.path}")
                logger.info(f"Логи экспортированы в {e.path}")
            except Exception as ex:
                self.dialog_manager.show_error(f"Ошибка сохранения: {ex}")
                logger.error(f"Ошибка экспорта логов: {ex}")

    def _on_rules_export_result(self, e: ft.FilePickerResultEvent) -> None:
        """Обрабатывает результат экспорта правил памяти."""
        if e.path:
            try:
                import json
                with DBManager() as db:
                    rules_data = db.export_learning_rules()

                with open(e.path, 'w', encoding='utf-8') as f:
                    json.dump(rules_data, f, ensure_ascii=False, indent=2)

                count = len(rules_data)
                self.dialog_manager.show_success(f"Экспортировано {count} правил: {e.path}")
                logger.info(f"Правила экспортированы в {e.path}")
            except Exception as ex:
                self.dialog_manager.show_error(f"Ошибка экспорта: {ex}")
                logger.error(f"Ошибка экспорта правил: {ex}")

    def _on_rules_import_result(self, e: ft.FilePickerResultEvent) -> None:
        """Обрабатывает результат импорта правил памяти."""
        if e.files and len(e.files) > 0:
            try:
                import json
                file_path = e.files[0].path

                with open(file_path, 'r', encoding='utf-8') as f:
                    rules_data = json.load(f)

                with DBManager() as db:
                    imported, skipped = db.import_learning_rules(rules_data)

                if skipped > 0:
                    self.dialog_manager.show_success(
                        f"Импортировано {imported} правил, пропущено {skipped} дубликатов"
                    )
                else:
                    self.dialog_manager.show_success(f"Импортировано {imported} правил")

                logger.info(f"Импортировано {imported} правил из {file_path}")

                # Обновляем диалог и view
                self.page.close(self.dialog)
                self.show()
                self.on_rule_deleted()

            except json.JSONDecodeError:
                self.dialog_manager.show_error("Неверный формат файла (требуется JSON)")
            except Exception as ex:
                self.dialog_manager.show_error(f"Ошибка импорта: {ex}")
                logger.error(f"Ошибка импорта правил: {ex}")


class AddPromptDialog:
    """
    Диалог добавления нового промпта.
    """

    def __init__(
        self,
        page: ft.Page,
        on_prompt_added: Callable[[], None],
        dialog_manager: DialogManager
    ):
        self.page = page
        self.on_prompt_added = on_prompt_added
        self.dialog_manager = dialog_manager
        self.dialog: Optional[ft.AlertDialog] = None

    def show(self, e=None) -> None:
        """Показывает диалог добавления промпта."""
        title_field = ft.TextField(label="Название промпта", autofocus=True)
        body_field = ft.TextField(
            label="Текст инструкции для AI",
            multiline=True,
            min_lines=3
        )

        def save_prompt(e):
            if title_field.value and body_field.value:
                with DBManager() as db:
                    db.add_prompt(title_field.value, body_field.value)
                self.page.close(self.dialog)
                self.on_prompt_added()
                self.dialog_manager.show_success("Промпт добавлен")
            self.page.update()

        def close_dialog(e):
            self.page.close(self.dialog)

        self.dialog = ft.AlertDialog(
            modal=True,
            title=ft.Text("Добавить промпт"),
            content=ft.Column([title_field, body_field], tight=True, spacing=10),
            actions=[
                ft.TextButton("Отмена", on_click=close_dialog),
                ft.FilledButton("Сохранить", on_click=save_prompt),
            ],
            actions_alignment=ft.MainAxisAlignment.END,
        )
        self.page.open(self.dialog)


class TutorialManager:
    """
    Менеджер интерактивного обучения.
    Показывает диалоги в зависимости от этапа освоения программы.
    """

    def __init__(self, page: ft.Page):
        self.page = page

    def _is_step_completed(self, step_key: str) -> bool:
        """Проверяет, был ли пройден этап."""
        with DBManager() as db:
            return db.get_setting(f"tutorial_{step_key}", "false") == "true"

    def _mark_step_completed(self, step_key: str) -> None:
        """Отмечает этап как пройденный."""
        with DBManager() as db:
            db.set_setting(f"tutorial_{step_key}", "true")

    def show_welcome_guide(self) -> None:
        """Этап 1: Приветствие и начало работы."""
        if self._is_step_completed("welcome"):
            return

        def close_dlg(e):
            self.page.close(dlg)
            self._mark_step_completed("welcome")

        content = ft.Column([
            ft.Image(src="assets/splash.png", width=400, height=200, fit=ft.ImageFit.CONTAIN, visible=False), # Placeholder
            ft.Text("Добро пожаловать в GhostLayer!", size=20, weight=ft.FontWeight.BOLD),
            ft.Text("Ваш безопасный шлюз для работы с AI.", size=14, color=ft.Colors.GREY_700),
            ft.Container(height=10),
            ft.Row([
                ft.Icon(ft.Icons.SECURITY, color=ft.Colors.GREEN),
                ft.Text("Ваши данные не покидают этот компьютер.", expand=True),
            ]),
            ft.Row([
                ft.Icon(ft.Icons.UPLOAD_FILE, color=ft.Colors.BLUE),
                ft.Text("Начните с загрузки документа (PDF, DOCX).", expand=True),
            ]),
        ], tight=True, spacing=10)

        dlg = ft.AlertDialog(
            modal=True,
            content=ft.Container(content=content, width=400),
            actions=[
                ft.FilledButton("Начать работу", on_click=close_dlg),
            ],
            actions_alignment=ft.MainAxisAlignment.CENTER,
        )
        self.page.open(dlg)

    def show_file_loaded_guide(self) -> None:
        """Этап 2: После загрузки файла."""
        if self._is_step_completed("file_loaded"):
            return

        def close_dlg(e):
            self.page.close(dlg)
            self._mark_step_completed("file_loaded")

        content = ft.Column([
            ft.Text("Документ обработан!", size=18, weight=ft.FontWeight.BOLD),
            ft.Container(height=10),
            ft.Row([
                ft.Icon(ft.Icons.VISIBILITY_OFF, color=ft.Colors.BLUE_400),
                ft.Text("Синие слова скрыты масками.", expand=True, weight=ft.FontWeight.BOLD),
            ]),
            ft.Text("Если нужно раскрыть слово — просто кликните по нему в левом окне. Оно добавится в исключения.", size=13),
            ft.Container(height=5),
            ft.Row([
                ft.Icon(ft.Icons.MEMORY, color=ft.Colors.TEAL_400),
                ft.Text("Управляйте памятью.", expand=True, weight=ft.FontWeight.BOLD),
            ]),
            ft.Text("В меню «Память» можно менять категорию (например, указать, что это Компания), чтобы AI лучше понимал контекст.", size=13),
        ], tight=True, spacing=10)

        dlg = ft.AlertDialog(
            modal=True,
            content=ft.Container(content=content, width=400),
            actions=[
                ft.TextButton("Понятно", on_click=close_dlg),
            ],
            actions_alignment=ft.MainAxisAlignment.END,
        )
        self.page.open(dlg)

    def show_reidentify_guide(self) -> None:
        """Этап 3: Обратная деанонимизация."""
        if self._is_step_completed("reidentify"):
            return

        def close_dlg(e):
            self.page.close(dlg)
            self._mark_step_completed("reidentify")

        content = ft.Column([
            ft.Text("Следующий шаг: Восстановление", size=18, weight=ft.FontWeight.BOLD, color=ft.Colors.ON_SURFACE),
            ft.Container(height=10),
            ft.Text("Вы скопировали анонимизированный текст.", size=14, color=ft.Colors.ON_SURFACE),
            ft.Container(
                content=ft.Text(
                    "Когда вы получите ответ от AI:\n"
                    "1. Нажмите кнопку «Деанонимизация» (справа сверху).\n"
                    "2. Вставьте ответ AI в поле.\n"
                    "3. Нажмите «Восстановить» для возврата имен.",
                    size=13,
                    color=ft.Colors.GREY_900,
                ),
                bgcolor=ft.Colors.ORANGE_50,
                padding=10,
                border_radius=5,
            ),
            ft.Text("Программа автоматически заменит все маски [PERSON_1] обратно на реальные имена.", size=13, color=ft.Colors.ON_SURFACE_VARIANT),
        ], tight=True, spacing=10)

        dlg = ft.AlertDialog(
            modal=True,
            content=ft.Container(content=content, width=400),
            actions=[
                ft.FilledButton("Понятно", on_click=close_dlg),
            ],
            actions_alignment=ft.MainAxisAlignment.END,
        )
        self.page.open(dlg)

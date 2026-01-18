import logging
import flet as ft
from src.licensing.license_manager import get_license_manager, LICENSE_FILE_NAME

logger = logging.getLogger(__name__)

class LicenseDialog(ft.AlertDialog):
    def __init__(self, page: ft.Page, on_success=None):
        self.page_ref = page
        self.on_success = on_success
        
        self.key_field = ft.TextField(
            label="Лицензионный ключ",
            hint_text="Вставьте ключ формата GHOST-PRO-...",
            multiline=True,
            min_lines=3,
            max_lines=5,
            width=400,
            text_size=12,
            autofocus=True
        )
        
        self.status_text = ft.Text("", size=12)

        super().__init__(
            modal=True,
            title=ft.Text("Активация GhostLayer"),
            content=ft.Column(
                [
                    ft.Text("Введите ваш лицензионный ключ для активации PRO версии.", size=14),
                    self.key_field,
                    self.status_text
                ],
                tight=True,
                width=450
            ),
            actions=[
                ft.TextButton("Отмена", on_click=self.close),
                ft.ElevatedButton("Активировать", on_click=self.activate, bgcolor=ft.Colors.BLUE, color=ft.Colors.WHITE),
            ],
            actions_alignment=ft.MainAxisAlignment.END,
        )

    def close(self, e=None):
        self.open = False
        self.page_ref.update()

    def activate(self, e):
        key = self.key_field.value.strip()
        if not key:
            self.status_text.value = "Пожалуйста, введите ключ."
            self.status_text.color = ft.Colors.RED
            self.page_ref.update()
            return

        self.status_text.value = "Проверка..."
        self.status_text.color = ft.Colors.GREY
        self.page_ref.update()

        # Save temporarily to validate
        try:
            with open(LICENSE_FILE_NAME, "w") as f:
                f.write(key)
            
            # Reload manager
            mgr = get_license_manager()
            mgr.load_license()
            
            if mgr.is_pro():
                self.status_text.value = "Лицензия успешно активирована!"
                self.status_text.color = ft.Colors.GREEN
                self.page_ref.update()

                # Логируем успешную активацию
                user_id = mgr.license_data.get('user_id', 'unknown')
                expiration = mgr.license_data.get('expiration', 'unknown')
                logger.info(f"Лицензия активирована: режим={mgr.mode}, user_id={user_id}, expires={expiration}")

                # Callback to update UI
                if self.on_success:
                    self.on_success()

                self.close()
                
                # Show snackbar
                self.page_ref.snack_bar = ft.SnackBar(ft.Text("GhostLayer PRO активирован!"))
                self.page_ref.snack_bar.open = True
                self.page_ref.update()
            else:
                self.status_text.value = "Неверный ключ или истек срок действия."
                self.status_text.color = ft.Colors.RED
                self.page_ref.update()
                
        except Exception as ex:
            logger.error(f"Activation error: {ex}")
            self.status_text.value = "Ошибка при сохранении ключа."
            self.status_text.color = ft.Colors.RED
            self.page_ref.update()

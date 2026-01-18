import flet as ft
from typing import Callable, List, Dict, Any, Optional

class ReidentificationPanel(ft.Container):
    """
    Панель для обратной деанонимизации (восстановления сущностей).
    Позволяет вставить текст от AI и восстановить оригинальные сущности.
    """
    def __init__(
        self,
        on_reidentify: Callable[[str], None],
        on_close: Callable,
    ):
        super().__init__()
        self.on_reidentify = on_reidentify
        self.on_close = on_close

        self.ai_response_field = ft.TextField(
            label="Вставьте ответ AI здесь",
            multiline=True,
            min_lines=5,
            expand=True,
            hint_text="Например: 'В ответе AI [PERSON_1] сказал, что [COMPANY_1] одобрила запрос.'",
        )

        self.restore_button = ft.ElevatedButton(
            text="Восстановить сущности",
            icon=ft.Icons.RESTORE,
            on_click=self._on_restore_click,
            disabled=True, # Изначально отключена, пока нет текста
        )
        
        self.close_button = ft.IconButton(
            icon=ft.Icons.CLOSE,
            on_click=lambda e: self.on_close(),
            tooltip="Закрыть панель восстановления"
        )

        self.content = ft.Column(
            controls=[
                ft.Row([
                    ft.Text("Восстановление сущностей", weight=ft.FontWeight.BOLD, size=16),
                    ft.Container(expand=True),
                    self.close_button,
                ]),
                ft.Container(
                    content=self.ai_response_field,
                    expand=True, # Поле занимает все доступное место
                ),
                ft.Row([
                    ft.Container(expand=True),
                    self.restore_button,
                ])
            ],
            spacing=10,
            expand=True,
        )
        self.padding = 15
        self.bgcolor = "surfaceVariant"
        self.border_radius = 8
        self.margin = ft.margin.only(top=10)
        self.visible = False # Изначально скрыта
        
        # Ограничиваем высоту панели, чтобы она не занимала весь экран и кнопки были видны
        self.height = 350 # Вернули фиксированную высоту для стабильности UI
        self.border = ft.border.all(1, "outlineVariant")

        # Отслеживаем изменения в текстовом поле для активации кнопки
        self.ai_response_field.on_change = self._check_restore_button_state

        # Инициализация кнопки копирования (создаем её сразу, чтобы добавить в layout)
        self.copy_button = ft.IconButton(
            icon=ft.Icons.COPY,
            on_click=self._on_copy_click,
            tooltip="Копировать результат",
            visible=False # Скрыта до восстановления
        )

        # Пересобираем content с учетом новой кнопки
        self.content.controls[-1].controls.insert(1, self.copy_button) # Вставляем перед кнопкой Restore (или после)

        # Лучше пересобрать Row с кнопками полностью для ясности
        self.content.controls[-1] = ft.Row([
            ft.Container(expand=True),
            self.copy_button,
            self.restore_button,
        ])


    def _check_restore_button_state(self, e):
        self.restore_button.disabled = not bool(self.ai_response_field.value.strip())
        self.page.update()

    def _on_restore_click(self, e):
        """Обрабатывает клик по кнопке 'Восстановить'."""
        if self.ai_response_field.value:
            self.on_reidentify(self.ai_response_field.value)
            # После восстановления показываем кнопку копирования
            self.copy_button.visible = True
            self.page.update()

    def _on_copy_click(self, e):
        """Копирует содержимое поля в буфер обмена."""
        if self.ai_response_field.value:
            self.page.set_clipboard(self.ai_response_field.value)
            self.page.snack_bar = ft.SnackBar(ft.Text("Текст скопирован!"))
            self.page.snack_bar.open = True
            self.page.update()

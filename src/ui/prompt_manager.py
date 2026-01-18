"""
Менеджер промптов.
"""
import flet as ft
from typing import List, Dict, Any, Callable


class PromptManager(ft.Column):
    """
    UI компонент для управления библиотекой промптов.
    """

    def __init__(
        self,
        prompts: List[Dict[str, Any]],
        on_add_prompt: Callable,
        on_delete_prompt: Callable
    ):
        super().__init__()

        self.prompts = prompts
        self.on_add_prompt = on_add_prompt
        self.on_delete_prompt = on_delete_prompt

        self.new_prompt_name = ft.TextField(label="Название")
        self.new_prompt_content = ft.TextField(label="Текст промпта", multiline=True)

        self.expand = True
        self.controls = self._build_controls()

    def _build_controls(self) -> List:
        """Строит список контролов для отображения."""
        prompt_rows = []
        for prompt in self.prompts:
            prompt_rows.append(
                ft.Row(
                    controls=[
                        ft.IconButton(
                            icon=ft.Icons.DELETE_OUTLINE,
                            icon_color=ft.Colors.RED_400,
                            data=prompt['id'],
                            on_click=lambda e: self.on_delete_prompt(int(e.control.data)),
                            tooltip="Удалить промпт"
                        ),
                        ft.Text(prompt['name']),
                    ],
                    alignment=ft.MainAxisAlignment.START
                )
            )

        return [
            ft.Row(
                controls=[
                    ft.Text("Библиотека промптов", weight=ft.FontWeight.BOLD),
                    ft.IconButton(
                        icon=ft.Icons.ADD_CIRCLE,
                        on_click=self._open_add_dialog,
                        tooltip="Добавить новый промпт"
                    ),
                ],
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN
            ),
            ft.Column(controls=prompt_rows, scroll=ft.ScrollMode.ADAPTIVE, expand=True)
        ]

    def _open_add_dialog(self, e):
        """Открывает диалог добавления нового промпта."""
        dialog = ft.AlertDialog(
            modal=True,
            title=ft.Text("Добавить новый промпт"),
            content=ft.Column([self.new_prompt_name, self.new_prompt_content]),
            actions=[
                ft.TextButton("Отмена", on_click=self._close_dialog),
                ft.FilledButton("Сохранить", on_click=self._save_new_prompt)
            ],
            actions_alignment=ft.MainAxisAlignment.END,
        )
        self.page.dialog = dialog
        dialog.open = True
        self.page.update()

    def _close_dialog(self, e):
        """Закрывает диалог."""
        e.page.dialog.open = False
        e.page.update()

    def _save_new_prompt(self, e):
        """Сохраняет новый промпт."""
        self.on_add_prompt(self.new_prompt_name.value, self.new_prompt_content.value)
        e.page.dialog.open = False
        e.page.update()

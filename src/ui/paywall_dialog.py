import flet as ft

class PaywallDialog(ft.AlertDialog):
    def __init__(self, page: ft.Page, on_enter_key=None):
        self.page_ref = page
        self.on_enter_key = on_enter_key

        super().__init__(
            modal=True,
            title=ft.Row([
                ft.Icon(ft.Icons.LOCK, color=ft.Colors.AMBER),
                ft.Text(" Функция доступна в PRO")
            ]),
            content=ft.Column(
                [
                    ft.Text(
                        "Функция «Запомнить навсегда» (Memory Rules) позволяет "
                        "автоматически скрывать секретные данные во всех будущих документах.",
                        size=14
                    ),
                    ft.Container(height=10),
                    ft.Text(
                        "В FREE версии вы можете использовать только встроенные алгоритмы (Regex + NLP).",
                        size=13,
                        color=ft.Colors.GREY_500
                    ),
                    ft.Container(height=15),
                    # Pricing block
                    ft.Container(
                        content=ft.Column([
                            ft.Text("PRO — $199", size=18, weight=ft.FontWeight.BOLD, color=ft.Colors.BLACK),
                            ft.Text("Бессрочная лицензия", size=12, color=ft.Colors.BLACK54),
                        ], spacing=2, horizontal_alignment=ft.CrossAxisAlignment.CENTER),
                        bgcolor=ft.Colors.AMBER,
                        padding=ft.padding.symmetric(horizontal=20, vertical=12),
                        border_radius=8,
                    ),
                    ft.Container(height=8),
                    ft.Text(
                        "+ $99/год за обновления (опционально)",
                        size=12,
                        color=ft.Colors.GREY_600,
                        text_align=ft.TextAlign.CENTER,
                    ),
                ],
                tight=True,
                width=400,
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
            ),
            actions=[
                ft.TextButton("Позже", on_click=self.close),
                ft.OutlinedButton("Ввести ключ", on_click=self._on_enter_key_click),
                ft.ElevatedButton("Купить PRO", on_click=self._on_buy_click, bgcolor=ft.Colors.AMBER, color=ft.Colors.BLACK),
            ],
            actions_alignment=ft.MainAxisAlignment.END,
        )

    def close(self, e=None):
        self.open = False
        self.page_ref.update()

    def _on_enter_key_click(self, e):
        self.close()
        if self.on_enter_key:
            self.on_enter_key()

    def _on_buy_click(self, e):
        # Open browser
        self.page_ref.launch_url("https://ghostlayer.app/pricing") # Placeholder URL

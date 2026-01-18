"""
Точка входа приложения GhostLayer.
"""
import logging
import flet as ft
from flet import app, Page

from src.config import (
    APP_TITLE, WINDOW_WIDTH, WINDOW_HEIGHT,
    WINDOW_MIN_WIDTH, WINDOW_MIN_HEIGHT, BACKGROUND_COLOR,
    setup_logging
)
from src.ui.main_window import MainWindow
from src.database.db_manager import DBManager
from src.services.session_logger import setup_session_logging, get_session_logger
from src.processing.nlp_models import preload_models_async
from src.licensing.license_manager import get_license_manager

logger = logging.getLogger(__name__)


def main(page: Page) -> None:
    """
    Основная функция для запуска Flet приложения GhostLayer.

    Args:
        page: Объект страницы Flet.
    """
    # Инициализация лицензии
    license_mgr = get_license_manager()
    logger.info(f"License initialized. Mode: {license_mgr.mode}")

    # Загружаем настройки окна
    with DBManager() as db:
        width = int(float(db.get_setting("window_width", str(WINDOW_WIDTH))))
        height = int(float(db.get_setting("window_height", str(WINDOW_HEIGHT))))
        top = db.get_setting("window_top")
        left = db.get_setting("window_left")
        
        # Проверяем, есть ли сохраненные координаты
        if top is not None:
            page.window_top = int(float(top))
        if left is not None:
            page.window_left = int(float(left))

    # Настройки окна
    page.title = APP_TITLE
    page.window_width = width
    page.window_height = height
    page.window_min_width = WINDOW_MIN_WIDTH
    page.window_min_height = WINDOW_MIN_HEIGHT
    
    # Для сохранения настроек при закрытии
    page.window_prevent_close = True

    def on_window_event(e):
        if e.data == "close":
            # Сохраняем настройки перед выходом
            try:
                with DBManager() as db:
                    db.set_setting("window_width", str(page.window_width))
                    db.set_setting("window_height", str(page.window_height))
                    db.set_setting("window_top", str(page.window_top))
                    db.set_setting("window_left", str(page.window_left))
                logger.info("Настройки окна сохранены")
            except Exception as ex:
                logger.error(f"Не удалось сохранить настройки окна: {ex}")
            
            page.window_destroy()

    page.on_window_event = on_window_event
    
    # Адаптивный цвет фона (SURFACE меняется в зависимости от темы)
    page.bgcolor = ft.Colors.SURFACE
    page.theme_mode = ft.ThemeMode.LIGHT  # Будет переопределено в MainWindow
    
    page.vertical_alignment = "start"
    page.horizontal_alignment = "stretch"

    logger.info(f"Запуск {APP_TITLE}")

    # Закрываем Splash Screen (только для собранного exe)
    try:
        import pyi_splash
        if pyi_splash.is_alive():
            pyi_splash.close()
            logger.info("Splash screen closed")
    except ImportError:
        pass

    # Запускаем фоновую загрузку NLP моделей (не блокирует UI)
    preload_models_async()
    logger.info("Фоновая загрузка NLP моделей запущена")

    # Создаём и добавляем основной layout
    main_window = MainWindow(page)
    page.add(main_window)
    page.update()


if __name__ == "__main__":
    try:
        # Настраиваем логирование: только в консоль (Zero Data - не пишем на диск)
        logging.basicConfig(
            level=logging.DEBUG,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[logging.StreamHandler()]
        )

        # Подключаем сессионный логгер (хранит в памяти для экспорта)
        setup_session_logging()

        logger.info("Запуск приложения...")

        app(target=main)
    except Exception as e:
        # Пытаемся закрыть сплэш скрин при ошибке, чтобы видеть сообщение
        try:
            import pyi_splash
            if pyi_splash.is_alive():
                pyi_splash.close()
        except ImportError:
            pass

        logger.critical(f"Критическая ошибка при запуске: {e}", exc_info=True)
        # Пытаемся показать ошибку пользователю, если Flet еще не загрузился
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, str(e), "Critical Error", 0x10)
        except:
            print(f"CRITICAL ERROR: {e}")
        raise

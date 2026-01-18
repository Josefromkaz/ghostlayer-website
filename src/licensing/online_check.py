import threading
import logging
import urllib.request
import json
from typing import Optional, Dict, Any
from src.config import APP_VERSION, UPDATE_SERVER_URL
from src.licensing.license_manager import get_license_manager

logger = logging.getLogger(__name__)

class OnlineChecker:
    """
    Выполняет фоновую проверку лицензии и обновлений.
    Не блокирует основной поток UI.
    """

    def __init__(self, on_update_found=None, on_license_revoked=None):
        self.on_update_found = on_update_found
        self.on_license_revoked = on_license_revoked
        self._thread = None

    def start_background_check(self):
        """Запускает проверку в отдельном потоке."""
        self._thread = threading.Thread(target=self._check_worker, daemon=True)
        self._thread.start()

    def _check_worker(self):
        """Рабочая функция потока."""
        # Проверяем, включена ли онлайн-проверка
        if UPDATE_SERVER_URL is None:
            logger.debug("Online check disabled (UPDATE_SERVER_URL is None)")
            return

        mgr = get_license_manager()

        # Если лицензии нет (FREE), проверяем только обновления
        license_key = mgr._read_license_file() or ""

        # Формируем URL
        # Пример: https://api.site.com/ping?key=...&ver=1.0.0
        try:
            # Экранируем параметры
            safe_key = urllib.parse.quote(license_key)
            safe_ver = urllib.parse.quote(APP_VERSION)

            url = f"{UPDATE_SERVER_URL}?key={safe_key}&version={safe_ver}"
            
            # Таймаут 5 секунд, чтобы не висеть долго
            with urllib.request.urlopen(url, timeout=5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode())
                    self._process_response(data)
                    
        except Exception as e:
            # Ошибки сети игнорируем (оффлайн режим)
            # logger.debug(f"Online check failed (offline?): {e}")
            pass

    def _process_response(self, data: Dict[str, Any]):
        """Обрабатывает ответ от сервера."""
        # 1. Проверка отзыва лицензии
        if data.get("revoked") is True:
            logger.warning("License revoked by server!")
            mgr = get_license_manager()
            mgr.mode = "FREE" # Downgrade locally
            
            if self.on_license_revoked:
                self.on_license_revoked()

        # 2. Проверка обновлений
        latest_version = data.get("latest_version")
        if latest_version and self._is_newer(latest_version, APP_VERSION):
            logger.info(f"New version available: {latest_version}")
            if self.on_update_found:
                self.on_update_found(latest_version, data.get("update_url", ""))

    def _is_newer(self, remote_ver: str, local_ver: str) -> bool:
        """Сравнивает семантические версии (X.Y.Z)."""
        try:
            r_parts = [int(x) for x in remote_ver.split('.')]
            l_parts = [int(x) for x in local_ver.split('.')]
            return r_parts > l_parts
        except ValueError:
            return False

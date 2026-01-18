import os
import logging
import json
from datetime import datetime
from pathlib import Path

from src.licensing.license_validator import LicenseValidator

# Импортируем ctypes только для Windows (используется для скрытия файлов)
if os.name == 'nt':
    import ctypes
    FILE_ATTRIBUTE_HIDDEN = 0x02
    FILE_ATTRIBUTE_NORMAL = 0x80

logger = logging.getLogger(__name__)

LICENSE_FILE_NAME = "license.key"
META_FILE_DIR = Path(os.path.expanduser("~")) / ".ghostlayer"
META_FILE_NAME = ".meta"

_license_manager_instance = None

def get_license_manager():
    global _license_manager_instance
    if _license_manager_instance is None:
        _license_manager_instance = LicenseManager()
    return _license_manager_instance

class LicenseManager:
    def __init__(self):
        self.mode = "FREE"  # FREE, PRO, EXPIRED, TAMPERED
        self.license_data = {}
        self.meta_path = META_FILE_DIR / META_FILE_NAME
        
        # Ensure meta dir exists
        try:
            META_FILE_DIR.mkdir(parents=True, exist_ok=True)
            # Make it hidden on Windows
            if os.name == 'nt':
                ctypes.windll.kernel32.SetFileAttributesW(str(META_FILE_DIR), FILE_ATTRIBUTE_HIDDEN)
        except Exception as e:
            logger.error(f"Failed to create meta directory: {e}")

        self.load_license()

    def load_license(self):
        """Loads and validates license from file."""
        # Check Anti-Backdating first
        if not self._check_anti_backdating():
            self.mode = "TAMPERED"
            logger.warning("System date manipulation detected. License disabled.")
            return

        # Try to find license key
        key = self._read_license_file()
        if not key:
            self.mode = "FREE"
            logger.info("No license file found. Running in FREE mode.")
            return

        # Validate
        result = LicenseValidator.validate(key)
        if result["valid"]:
            self.mode = result["type"] # e.g., "PRO"
            self.license_data = result
            logger.info(f"License valid. Mode: {self.mode}, Expires: {result['expiration']}")
        else:
            if result.get("reason") == "Expired":
                self.mode = "EXPIRED"
            else:
                self.mode = "FREE"
            logger.warning(f"License invalid: {result.get('reason')}")

    def _read_license_file(self) -> str:
        """Reads license key from root or local dir."""
        # 1. Check current directory
        if os.path.exists(LICENSE_FILE_NAME):
            try:
                with open(LICENSE_FILE_NAME, "r") as f:
                    return f.read().strip()
            except Exception:
                pass
        return None

    def _check_anti_backdating(self) -> bool:
        """
        Checks if system time is earlier than last seen time.
        Returns False if manipulation detected.
        """
        current_time = datetime.now()
        last_seen = None

        if self.meta_path.exists():
            try:
                with open(self.meta_path, "r") as f:
                    data = json.load(f)
                    last_seen_str = data.get("last_seen")
                    if last_seen_str:
                        last_seen = datetime.fromisoformat(last_seen_str)
            except Exception as e:
                logger.error(f"Error reading meta file: {e}")
                # If meta file is corrupted, we might want to be strict or lenient.
                # For MVP, let's reset it if we can't read it, but log error.
                pass

        if last_seen and current_time < last_seen:
            # Clock moved back!
            logger.error(f"Clock tampering detected! Current: {current_time}, Last seen: {last_seen}")
            return False

        # Update last seen
        try:
            # Unhide before writing on Windows
            if os.name == 'nt' and self.meta_path.exists():
                ctypes.windll.kernel32.SetFileAttributesW(str(self.meta_path), FILE_ATTRIBUTE_NORMAL)

            with open(self.meta_path, "w") as f:
                json.dump({"last_seen": current_time.isoformat()}, f)

            # Hide the file explicitly on Windows
            if os.name == 'nt':
                ctypes.windll.kernel32.SetFileAttributesW(str(self.meta_path), FILE_ATTRIBUTE_HIDDEN)
                
        except Exception as e:
            logger.error(f"Failed to update meta file: {e}")

        return True

    def is_pro(self) -> bool:
        return self.mode in ["PRO", "TRIAL", "TEAM"]

    def can_use_feature(self, feature_name: str) -> bool:
        if feature_name == "memory":
            return self.is_pro()
        return True

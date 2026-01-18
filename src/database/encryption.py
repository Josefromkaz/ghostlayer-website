"""
Модуль шифрования для защиты конфиденциальных данных в БД.

Использует AES-256-GCM для шифрования правил памяти.
Ключ генерируется из machine-specific данных и хранится локально.
"""
import os
import hashlib
import secrets
import logging
import platform
from pathlib import Path
from typing import Optional, Tuple
from base64 import b64encode, b64decode

logger = logging.getLogger(__name__)

# Пытаемся импортировать cryptography, если недоступен - fallback на base64
try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    logger.warning(
        "Библиотека cryptography не установлена. "
        "Используется Base64 обфускация вместо шифрования. "
        "Для настоящего шифрования установите: pip install cryptography"
    )


def _get_key_file_path() -> Path:
    """Возвращает путь к файлу с ключом шифрования."""
    app_name = "GhostLayer"

    if platform.system() == "Windows":
        base_dir = os.getenv("APPDATA")
        if not base_dir:
            base_dir = os.path.expanduser(r"~\AppData\Roaming")
    else:
        base_dir = os.path.expanduser("~/.local/share")

    app_dir = Path(base_dir) / app_name
    app_dir.mkdir(parents=True, exist_ok=True)

    return app_dir / ".encryption_key"


def _get_machine_id() -> bytes:
    """
    Генерирует уникальный идентификатор машины.
    Используется как часть соли для генерации ключа.
    """
    components = []

    # Имя компьютера
    components.append(platform.node())

    # Платформа
    components.append(platform.system())
    components.append(platform.machine())

    # Пользователь
    try:
        import getpass
        components.append(getpass.getuser())
    except Exception:
        pass

    # Домашняя директория
    components.append(str(Path.home()))

    machine_string = "|".join(components)
    return hashlib.sha256(machine_string.encode()).digest()


def _generate_key() -> bytes:
    """Генерирует новый ключ шифрования."""
    return secrets.token_bytes(32)  # 256 бит для AES-256


def _load_or_create_key() -> bytes:
    """
    Загружает существующий ключ или создаёт новый.
    Ключ хранится в файле, защищённом правами доступа.
    """
    key_file = _get_key_file_path()

    if key_file.exists():
        try:
            with open(key_file, 'rb') as f:
                stored_data = f.read()

            # Данные: salt (16 bytes) + encrypted_key
            if len(stored_data) > 16:
                salt = stored_data[:16]
                encrypted_key = stored_data[16:]

                # Расшифровываем ключ с помощью machine ID
                machine_id = _get_machine_id()
                decryption_key = hashlib.pbkdf2_hmac(
                    'sha256',
                    machine_id,
                    salt,
                    100000,
                    dklen=32
                )

                # XOR для простой защиты ключа
                key = bytes(a ^ b for a, b in zip(encrypted_key, decryption_key))
                return key
        except Exception as e:
            logger.warning(f"Ошибка чтения ключа: {e}. Создаю новый.")

    # Создаём новый ключ
    key = _generate_key()
    salt = secrets.token_bytes(16)

    # Шифруем ключ с помощью machine ID
    machine_id = _get_machine_id()
    encryption_key = hashlib.pbkdf2_hmac(
        'sha256',
        machine_id,
        salt,
        100000,
        dklen=32
    )

    encrypted_key = bytes(a ^ b for a, b in zip(key, encryption_key))

    try:
        with open(key_file, 'wb') as f:
            f.write(salt + encrypted_key)

        # Устанавливаем ограниченные права доступа (только для владельца)
        if platform.system() != "Windows":
            os.chmod(key_file, 0o600)

        logger.info("Создан новый ключ шифрования")
    except Exception as e:
        logger.error(f"Ошибка сохранения ключа: {e}")

    return key


# Кэшируем ключ для производительности
_cached_key: Optional[bytes] = None


def _get_encryption_key() -> bytes:
    """Возвращает ключ шифрования (с кэшированием)."""
    global _cached_key
    if _cached_key is None:
        _cached_key = _load_or_create_key()
    return _cached_key


class Encryptor:
    """
    Класс для шифрования и расшифровки данных.

    Использует AES-256-GCM если доступна библиотека cryptography,
    иначе использует Base64 обфускацию (с предупреждением).
    """

    def __init__(self):
        self.key = _get_encryption_key()
        if CRYPTO_AVAILABLE:
            self.aesgcm = AESGCM(self.key)
        else:
            self.aesgcm = None

    def encrypt(self, plaintext: str) -> str:
        """
        Шифрует строку.

        Args:
            plaintext: Исходная строка.

        Returns:
            Зашифрованная строка в формате Base64.
        """
        if not plaintext:
            return ""

        if not CRYPTO_AVAILABLE:
            # Fallback: Base64 + XOR с ключом
            return self._obfuscate(plaintext)

        try:
            # Генерируем случайный nonce (12 байт для GCM)
            nonce = secrets.token_bytes(12)

            # Шифруем
            plaintext_bytes = plaintext.encode('utf-8')
            ciphertext = self.aesgcm.encrypt(nonce, plaintext_bytes, None)

            # Объединяем nonce + ciphertext и кодируем в Base64
            result = b64encode(nonce + ciphertext).decode('utf-8')
            return result

        except Exception as e:
            logger.error(f"Ошибка шифрования: {e}")
            # Fallback на обфускацию
            return self._obfuscate(plaintext)

    def decrypt(self, ciphertext: str) -> str:
        """
        Расшифровывает строку.

        Args:
            ciphertext: Зашифрованная строка в формате Base64.

        Returns:
            Расшифрованная строка.
        """
        if not ciphertext:
            return ""

        if not CRYPTO_AVAILABLE:
            return self._deobfuscate(ciphertext)

        try:
            # Декодируем из Base64
            data = b64decode(ciphertext.encode('utf-8'))

            # Извлекаем nonce (первые 12 байт) и ciphertext
            nonce = data[:12]
            encrypted_data = data[12:]

            # Расшифровываем
            plaintext_bytes = self.aesgcm.decrypt(nonce, encrypted_data, None)
            return plaintext_bytes.decode('utf-8')

        except Exception as e:
            logger.debug(f"Не удалось расшифровать AES, пробую Base64: {e}")
            # Пробуем Base64 (для обратной совместимости со старыми данными)
            return self._deobfuscate(ciphertext)

    def _obfuscate(self, plaintext: str) -> str:
        """
        Простая обфускация (XOR + Base64).
        Используется как fallback, если cryptography недоступен.
        """
        try:
            key_bytes = self.key[:len(plaintext.encode('utf-8'))]
            if len(key_bytes) < len(plaintext.encode('utf-8')):
                # Расширяем ключ
                key_bytes = (self.key * (len(plaintext.encode('utf-8')) // len(self.key) + 1))
            key_bytes = key_bytes[:len(plaintext.encode('utf-8'))]

            plaintext_bytes = plaintext.encode('utf-8')
            obfuscated = bytes(a ^ b for a, b in zip(plaintext_bytes, key_bytes))
            return b64encode(obfuscated).decode('utf-8')
        except Exception:
            # Последний fallback: просто Base64
            return b64encode(plaintext.encode('utf-8')).decode('utf-8')

    def _deobfuscate(self, obfuscated: str) -> str:
        """Деобфускация."""
        try:
            # Сначала пробуем XOR деобфускацию
            data = b64decode(obfuscated.encode('utf-8'))
            key_bytes = self.key[:len(data)]
            if len(key_bytes) < len(data):
                key_bytes = (self.key * (len(data) // len(self.key) + 1))
            key_bytes = key_bytes[:len(data)]

            deobfuscated = bytes(a ^ b for a, b in zip(data, key_bytes))
            return deobfuscated.decode('utf-8')
        except Exception:
            try:
                # Fallback: просто Base64
                return b64decode(obfuscated.encode('utf-8')).decode('utf-8')
            except Exception:
                # Если ничего не работает, возвращаем как есть
                # (для совместимости с незашифрованными данными)
                return obfuscated


# Глобальный экземпляр для удобства
_encryptor: Optional[Encryptor] = None


def get_encryptor() -> Encryptor:
    """Возвращает глобальный экземпляр Encryptor."""
    global _encryptor
    if _encryptor is None:
        _encryptor = Encryptor()
    return _encryptor


def encrypt(plaintext: str) -> str:
    """Удобная функция для шифрования."""
    return get_encryptor().encrypt(plaintext)


def decrypt(ciphertext: str) -> str:
    """Удобная функция для расшифровки."""
    return get_encryptor().decrypt(ciphertext)


def is_crypto_available() -> bool:
    """Проверяет, доступно ли настоящее шифрование."""
    return CRYPTO_AVAILABLE

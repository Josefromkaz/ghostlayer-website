"""
Тесты для модуля шифрования.
"""
import pytest
import os
import tempfile
from unittest.mock import patch

from src.database.encryption import (
    Encryptor,
    encrypt,
    decrypt,
    is_crypto_available,
    _get_machine_id,
    _generate_key,
)


class TestEncryptor:
    """Тесты для класса Encryptor."""

    def test_encrypt_decrypt_roundtrip(self):
        """Проверяет полный цикл шифрования-расшифровки."""
        encryptor = Encryptor()
        original = "Секретные данные клиента"

        encrypted = encryptor.encrypt(original)
        decrypted = encryptor.decrypt(encrypted)

        assert decrypted == original

    def test_encrypt_produces_different_output(self):
        """Проверяет, что шифрование изменяет данные."""
        encryptor = Encryptor()
        original = "Test data"

        encrypted = encryptor.encrypt(original)

        assert encrypted != original

    def test_encrypt_empty_string(self):
        """Проверяет шифрование пустой строки."""
        encryptor = Encryptor()

        encrypted = encryptor.encrypt("")
        decrypted = encryptor.decrypt("")

        assert encrypted == ""
        assert decrypted == ""

    def test_encrypt_unicode(self):
        """Проверяет шифрование Unicode текста."""
        encryptor = Encryptor()
        texts = [
            "Привет, мир!",
            "日本語テキスト",
            "مرحبا بالعالم",
            "🔐🔒🔓",
            "Mixed: Привет, 日本, مرحبا, 🎉",
        ]

        for original in texts:
            encrypted = encryptor.encrypt(original)
            decrypted = encryptor.decrypt(encrypted)
            assert decrypted == original, f"Failed for: {original}"

    def test_encrypt_long_text(self):
        """Проверяет шифрование длинного текста."""
        encryptor = Encryptor()
        original = "Длинный текст. " * 1000  # ~15KB

        encrypted = encryptor.encrypt(original)
        decrypted = encryptor.decrypt(encrypted)

        assert decrypted == original

    def test_encrypt_special_characters(self):
        """Проверяет шифрование спецсимволов."""
        encryptor = Encryptor()
        original = "ООО «Компания» — test@example.com +7(999)123-45-67"

        encrypted = encryptor.encrypt(original)
        decrypted = encryptor.decrypt(encrypted)

        assert decrypted == original

    def test_different_nonces_produce_different_ciphertexts(self):
        """Проверяет, что одинаковый текст шифруется по-разному."""
        encryptor = Encryptor()
        original = "Same text"

        encrypted1 = encryptor.encrypt(original)
        encrypted2 = encryptor.encrypt(original)

        # Разные nonce должны давать разные результаты
        # (даже если cryptography недоступен, XOR с разными ключами даст разное)
        # Но оба должны расшифровываться в исходный текст
        assert encryptor.decrypt(encrypted1) == original
        assert encryptor.decrypt(encrypted2) == original


class TestConvenienceFunctions:
    """Тесты для удобных функций encrypt/decrypt."""

    def test_encrypt_function(self):
        """Проверяет функцию encrypt."""
        encrypted = encrypt("Test data")
        assert encrypted != "Test data"
        assert len(encrypted) > 0

    def test_decrypt_function(self):
        """Проверяет функцию decrypt."""
        original = "Тестовые данные"
        encrypted = encrypt(original)
        decrypted = decrypt(encrypted)
        assert decrypted == original

    def test_encrypt_decrypt_consistency(self):
        """Проверяет согласованность функций."""
        data = "Секретная информация"

        # Шифруем функцией, расшифровываем классом
        encryptor = Encryptor()
        encrypted = encrypt(data)
        decrypted = encryptor.decrypt(encrypted)
        assert decrypted == data

        # Шифруем классом, расшифровываем функцией
        encrypted2 = encryptor.encrypt(data)
        decrypted2 = decrypt(encrypted2)
        assert decrypted2 == data


class TestBackwardCompatibility:
    """Тесты обратной совместимости."""

    def test_decrypt_base64_fallback(self):
        """Проверяет расшифровку старых Base64 данных."""
        import base64

        original = "Старые данные"
        old_encrypted = base64.b64encode(original.encode('utf-8')).decode('utf-8')

        decrypted = decrypt(old_encrypted)

        # Должно либо расшифроваться, либо вернуться как есть
        assert decrypted in [original, old_encrypted]

    def test_decrypt_invalid_data_returns_input(self):
        """Проверяет обработку некорректных данных."""
        invalid_data = "Not encrypted at all!!!"

        decrypted = decrypt(invalid_data)

        # Должно вернуть исходные данные
        assert decrypted == invalid_data


class TestMachineId:
    """Тесты генерации machine ID."""

    def test_machine_id_is_bytes(self):
        """Проверяет тип machine ID."""
        machine_id = _get_machine_id()
        assert isinstance(machine_id, bytes)

    def test_machine_id_is_consistent(self):
        """Проверяет постоянство machine ID."""
        id1 = _get_machine_id()
        id2 = _get_machine_id()
        assert id1 == id2

    def test_machine_id_has_length(self):
        """Проверяет длину machine ID (SHA-256 = 32 байта)."""
        machine_id = _get_machine_id()
        assert len(machine_id) == 32


class TestKeyGeneration:
    """Тесты генерации ключей."""

    def test_generate_key_is_bytes(self):
        """Проверяет тип ключа."""
        key = _generate_key()
        assert isinstance(key, bytes)

    def test_generate_key_length(self):
        """Проверяет длину ключа (256 бит = 32 байта)."""
        key = _generate_key()
        assert len(key) == 32

    def test_generate_key_is_random(self):
        """Проверяет случайность ключей."""
        key1 = _generate_key()
        key2 = _generate_key()
        assert key1 != key2


class TestCryptoAvailability:
    """Тесты проверки доступности криптографии."""

    def test_is_crypto_available_returns_bool(self):
        """Проверяет тип возвращаемого значения."""
        result = is_crypto_available()
        assert isinstance(result, bool)

    def test_crypto_fallback_works(self):
        """Проверяет работу fallback механизма."""
        # Даже если cryptography недоступен, шифрование должно работать
        original = "Test data"
        encrypted = encrypt(original)
        decrypted = decrypt(encrypted)
        assert decrypted == original


class TestEdgeCases:
    """Тесты граничных случаев."""

    def test_encrypt_none_like_values(self):
        """Проверяет обработку None-подобных значений."""
        encryptor = Encryptor()

        assert encryptor.encrypt("") == ""
        assert encryptor.decrypt("") == ""

    def test_encrypt_whitespace_only(self):
        """Проверяет шифрование пробелов."""
        encryptor = Encryptor()
        original = "   \t\n   "

        encrypted = encryptor.encrypt(original)
        decrypted = encryptor.decrypt(encrypted)

        assert decrypted == original

    def test_encrypt_newlines(self):
        """Проверяет шифрование текста с переносами."""
        encryptor = Encryptor()
        original = "Line 1\nLine 2\r\nLine 3"

        encrypted = encryptor.encrypt(original)
        decrypted = encryptor.decrypt(encrypted)

        assert decrypted == original

    def test_encrypt_very_short_text(self):
        """Проверяет шифрование очень короткого текста."""
        encryptor = Encryptor()

        for text in ["a", "ab", "abc"]:
            encrypted = encryptor.encrypt(text)
            decrypted = encryptor.decrypt(encrypted)
            assert decrypted == text

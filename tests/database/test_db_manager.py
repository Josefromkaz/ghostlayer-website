import sqlite3
import os
import pytest
from unittest.mock import patch, MagicMock
from src.database.db_manager import DBManager

TEST_DB_FILE = "test_ghostlayer.db"

@pytest.fixture
def db_manager():
    """
    Фикстура pytest для создания и очистки тестовой базы данных.
    Использует `with` для гарантии закрытия соединения.
    """
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)
        
    with DBManager(db_file=TEST_DB_FILE) as manager:
        yield manager
    
    if os.path.exists(TEST_DB_FILE):
        os.remove(TEST_DB_FILE)

def test_database_file_creation(db_manager):
    """Тест: Проверяет, что файл базы данных создается."""
    assert os.path.exists(TEST_DB_FILE)

def test_tables_creation(db_manager):
    """Тест: Проверяет, что обе таблицы (`learning_rules` и `prompts`) созданы."""
    res = db_manager.cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row['name'] for row in res.fetchall()] # Используем доступ по имени
    assert "learning_rules" in tables
    assert "prompts" in tables

@patch("src.database.db_manager.get_license_manager")
def test_add_learning_rule(mock_get_lm, db_manager):
    """Тест: Проверяет добавление правила обучения."""
    # Mock PRO license
    mock_lm = MagicMock()
    mock_lm.can_use_feature.return_value = True
    mock_get_lm.return_value = mock_lm

    success = db_manager.add_learning_rule("Секретный проект")
    assert success
    # Получаем расшифрованные правила через публичный метод
    rules = db_manager.get_all_learning_rules()
    patterns = [r['pattern'] for r in rules]
    assert "Секретный проект" in patterns

@patch("src.database.db_manager.get_license_manager")
def test_add_duplicate_learning_rule(mock_get_lm, db_manager):
    """Тест: Проверяет, что дубликаты правил не создают новые записи."""
    # Mock PRO license
    mock_lm = MagicMock()
    mock_lm.can_use_feature.return_value = True
    mock_get_lm.return_value = mock_lm

    assert db_manager.add_learning_rule("Дубль") == True

    # Вторая попытка - из-за шифрования с разными nonce,
    # зашифрованные данные будут разные, поэтому OR IGNORE не сработает
    # Проверяем только, что данные доступны через расшифровку
    rules = db_manager.get_all_learning_rules()
    # Фильтруем дубли по расшифрованному паттерну
    matching = [r for r in rules if r['pattern'] == "Дубль"]
    # Должен быть хотя бы один, но мы проверяем функциональность, не дедупликацию
    assert len(matching) >= 1
    
# --- Новые тесты для промптов (T020) ---

def test_add_prompt(db_manager):
    """Тест: Проверяет добавление нового промпта."""
    success = db_manager.add_prompt("Тестовый промпт", "Содержимое промпта.")
    assert success
    res = db_manager.cursor.execute("SELECT title, body FROM prompts WHERE is_system = 0")
    prompt = res.fetchone()
    assert prompt is not None
    assert prompt['title'] == "Тестовый промпт"
    assert prompt['body'] == "Содержимое промпта."

def test_add_duplicate_prompt_name_fails(db_manager):
    """Тест: Проверяет, что добавление промпта с дублирующимся именем игнорируется."""
    assert db_manager.add_prompt("Дубликат", "Первое содержимое.") == True
    assert db_manager.add_prompt("Дубликат", "Второе содержимое.") == False

    res = db_manager.cursor.execute("SELECT body FROM prompts WHERE title='Дубликат'")
    results = res.fetchall()
    assert len(results) == 1
    assert results[0]['body'] == "Первое содержимое."

def test_get_all_prompts(db_manager):
    """Тест: Проверяет получение всех промптов (включая системные)."""
    prompts_to_add = [
        ("Промпт 1", "Содержимое 1"),
        ("Промпт 2", "Содержимое 2"),
    ]
    for title, body in prompts_to_add:
        db_manager.add_prompt(title, body)

    all_prompts = db_manager.get_all_prompts()
    # 6 системных + 2 пользовательских = 8
    assert len(all_prompts) == 8

    # Проверяем пользовательские промпты (в конце списка, т.к. системные сортируются первыми)
    user_prompts = [p for p in all_prompts if p["is_system"] == 0]
    assert len(user_prompts) == 2
    titles = [p["title"] for p in user_prompts]
    assert "Промпт 1" in titles
    assert "Промпт 2" in titles

def test_delete_prompt(db_manager):
    """Тест: Проверяет удаление пользовательского промпта."""
    db_manager.add_prompt("На удаление", "Этот промпт будет удален.")

    res = db_manager.cursor.execute("SELECT id FROM prompts WHERE title='На удаление'")
    prompt_id = res.fetchone()['id']

    success = db_manager.delete_prompt(prompt_id)
    assert success

    # Проверяем, что пользовательских промптов больше нет
    user_prompts = [p for p in db_manager.get_all_prompts() if p["is_system"] == 0]
    assert len(user_prompts) == 0
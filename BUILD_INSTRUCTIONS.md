# Инструкции по сборке GhostLayer v1.0 для релиза

## Предварительные требования

### 1. Установка зависимостей

```bash
# Создать виртуальное окружение (если еще не создано)
python -m venv .venv

# Активировать (Windows)
.venv\Scripts\activate

# Установить зависимости
pip install -r requirements.txt

# Установить PyInstaller
pip install pyinstaller

# Установить SpaCy модель
python -m spacy download en_core_web_sm
```

### 2. Проверка системы

```bash
# Проверить версию Python (должна быть 3.11+)
python --version

# Проверить установку SpaCy модели
python -c "import en_core_web_sm; print(en_core_web_sm.__path__)"

# Запустить тесты
python -m pytest tests/ -v
```

---

## Процесс сборки

### Шаг 1: Очистка предыдущих сборок

```bash
# Windows PowerShell
Remove-Item -Path "dist", "build" -Recurse -Force -ErrorAction SilentlyContinue

# Linux/macOS
rm -rf dist/ build/
```

### Шаг 2: Проверка .spec файла

Откройте `GhostLayer_Final_v2.spec` и убедитесь, что:
- Путь к SpaCy модели определяется динамически (через функцию `get_spacy_model_path()`)
- Путь к `assets/splash.png` корректен
- `console=False` (чтобы не показывать консоль)
- `upx=True` (для сжатия)

### Шаг 3: Сборка exe файла

```bash
# Запустить PyInstaller с .spec файлом
pyinstaller GhostLayer_Final_v2.spec --clean --noconfirm
```

**Ожидаемое время сборки**: 3-5 минут (зависит от системы)

### Шаг 4: Проверка сборки

После сборки проверьте:

```bash
# Перейти в директорию dist
cd dist/GhostLayer_Final_v2

# Проверить наличие exe файла
ls GhostLayer_Final_v2.exe  # Windows
# или
dir GhostLayer_Final_v2.exe  # Windows CMD

# Проверить размер (должен быть ~300-500 MB)
```

### Шаг 5: Тестирование собранного exe

```bash
# Запустить exe файл из директории dist
cd dist/GhostLayer_Final_v2
./GhostLayer_Final_v2.exe
```

**Что проверить при тестировании:**
- [ ] Splash screen отображается корректно
- [ ] Приложение запускается без ошибок
- [ ] Drag-and-Drop работает с PDF и TXT файлами
- [ ] Анонимизация работает (тест на простом тексте)
- [ ] Темная тема переключается корректно
- [ ] Prompt Library открывается и работает
- [ ] Inspector Panel показывает найденные сущности
- [ ] Экспорт текста в буфер обмена работает

---

## Создание дистрибутива

### Шаг 1: Создать архив для распространения

```bash
# Перейти в dist/
cd dist/

# Создать ZIP архив (Windows PowerShell)
Compress-Archive -Path "GhostLayer_Final_v2" -DestinationPath "GhostLayer_v1.0.0_Windows_x64.zip"

# Или использовать 7-Zip для лучшего сжатия
7z a -tzip GhostLayer_v1.0.0_Windows_x64.zip GhostLayer_Final_v2\
```

### Шаг 2: Проверка финального архива

```bash
# Распаковать в другую директорию для тестирования
Expand-Archive -Path "GhostLayer_v1.0.0_Windows_x64.zip" -DestinationPath "test_install/"

# Запустить из распакованной директории
cd test_install/GhostLayer_Final_v2
./GhostLayer_Final_v2.exe
```

### Шаг 3: Подсчет размера финального дистрибутива

```bash
# Проверить размер архива
Get-Item "GhostLayer_v1.0.0_Windows_x64.zip" | Select-Object Name, @{Name="SizeMB";Expression={[math]::Round($_.Length/1MB, 2)}}
```

---

## Решение типичных проблем

### Проблема: "Module not found" при запуске exe

**Решение:**
1. Проверьте, что все зависимости добавлены в `hiddenimports` в .spec файле
2. Добавьте недостающий модуль:
   ```python
   hiddenimports = ['spacy.lang.en', 'spacy.lang.ru', 'docx', 'missing_module_name']
   ```
3. Пересоберите: `pyinstaller GhostLayer_Final_v2.spec --clean`

### Проблема: Splash screen не отображается

**Решение:**
1. Проверьте путь к `assets/splash.png`
2. Убедитесь, что файл существует: `Test-Path assets/splash.png`
3. Проверьте, что `splash` объект добавлен в `exe` в .spec файле

### Проблема: SpaCy модель не найдена

**Решение:**
1. Проверьте установку: `python -c "import en_core_web_sm; print('OK')"`
2. Если не установлена: `python -m spacy download en_core_web_sm`
3. Пересоберите exe

### Проблема: exe файл слишком большой (>1GB)

**Решение:**
1. Убедитесь, что `upx=True` в .spec файле
2. Исключите ненужные библиотеки в `excludes`:
   ```python
   excludes=['matplotlib', 'pandas', 'scipy']  # если не используются
   ```
3. Проверьте, что не включили лишние данные в `datas`

### Проблема: Антивирус блокирует exe

**Решение:**
1. Это нормально для unsigned exe файлов
2. Для продакшена: подпишите exe цифровой подписью
3. Временно: добавьте в исключения антивируса для тестирования

---

## Подпись exe файла (опционально, для продакшена)

### Требования:
- Сертификат code signing от авторизованного CA (например, Sectigo, DigiCert)
- Утилита `signtool.exe` (входит в Windows SDK)

### Команда подписи:

```cmd
signtool sign /f "path\to\certificate.pfx" /p "password" /t http://timestamp.digicert.com /fd SHA256 "dist\GhostLayer_Final_v2\GhostLayer_Final_v2.exe"
```

---

## Финальный чеклист перед релизом

- [ ] Тесты пройдены (`pytest tests/`)
- [ ] .spec файл не содержит hardcoded путей
- [ ] `console=False` в .spec (без консоли)
- [ ] Splash screen работает
- [ ] Версия в `src/config.py` обновлена (APP_VERSION = "1.0.0")
- [ ] README.md обновлен с актуальными инструкциями
- [ ] Создан архив `GhostLayer_v1.0.0_Windows_x64.zip`
- [ ] Протестировано на чистой Windows машине
- [ ] Размер дистрибутива приемлем (<500 MB для zip)
- [ ] Release notes подготовлены
- [ ] Git tag создан: `git tag v1.0.0`

---

## После успешной сборки

```bash
# Создать Git tag
git tag -a v1.0.0 -m "Release v1.0.0 - GhostLayer MVP"

# Запушить tag (если используете GitHub/GitLab)
git push origin v1.0.0

# Создать GitHub Release и прикрепить ZIP файл
# Или опубликовать через другой канал распространения
```

---

**Последнее обновление:** 27.12.2025

# Инструкции по очистке репозитория перед релизом

Перед финальным релизом необходимо выполнить следующие действия:

## 1. Удалить лишние файлы

```bash
# Удалить тестовые и временные файлы
rm -f license.key license.key.bak test_document.txt nul

# Удалить старые/неиспользуемые директории
rm -rf Research/
rm -rf .gemini/
rm -rf .specify/
rm -rf specs/  # Или переместить в отдельную ветку documentation

# Удалить dist/ и build/ перед финальной сборкой
rm -rf dist/
rm -rf build/
rm -rf .pytest_cache/
```

## 2. Очистка git

```bash
# Добавить изменения в .gitignore
git add .gitignore

# Удалить файлы из индекса Git (но не с диска, если они нужны локально)
git rm --cached license.key license.key.bak test_document.txt nul 2>/dev/null || true

# Проверить статус
git status

# Зафиксировать очистку
git add -A
git commit -m "chore: cleanup repository for production release"
```

## 3. Удалить неактуальные markdown файлы

```bash
# Удалить или переместить в docs/
rm -f GEMINI.md  # Если это внутренний документ
rm -f PLAN_POST_MVP.md  # Или переместить в docs/development/
```

## 4. Финальная проверка перед релизом

### Проверьте, что следующие файлы НЕ закоммичены:
- [ ] `license.key` и `license.key.bak`
- [ ] `test_document.txt`
- [ ] `nul`
- [ ] `*.db` файлы
- [ ] `dist/` и `build/` директории
- [ ] `__pycache__/` директории
- [ ] `.pytest_cache/`

### Проверьте, что следующие файлы ПРИСУТСТВУЮТ:
- [x] `README.md` (обновлен с актуальными инструкциями)
- [x] `PRODUCTION_CHECKLIST.md` (чеклист релиза)
- [x] `requirements.txt` (все зависимости)
- [x] `GhostLayer_Final_v2.spec` (исправленный .spec файл)
- [x] `docs/PRIVACY_POLICY.md` и русская версия
- [x] `docs/SECURITY_WHITEPAPER.md` и русская версия
- [x] `LICENSE` или `EULA.txt` (нужно создать!)

## 5. Команды для быстрой очистки (PowerShell для Windows)

```powershell
# Удалить тестовые файлы
Remove-Item -Path "license.key", "license.key.bak", "test_document.txt", "nul" -ErrorAction SilentlyContinue

# Удалить директории
Remove-Item -Path "Research", ".gemini", ".specify", "dist", "build", ".pytest_cache" -Recurse -ErrorAction SilentlyContinue

# Проверить, что осталось в корне
Get-ChildItem -Path . -File | Select-Object Name
```

## 6. Git команды для проверки

```bash
# Посмотреть, какие файлы будут в коммите
git status

# Посмотреть, какие файлы отслеживаются
git ls-files

# Найти большие файлы в репозитории
git ls-files -z | xargs -0 du -h | sort -h | tail -20

# Проверить размер репозитория
du -sh .git
```

---

**Примечание**: После выполнения этих команд обязательно запустите тесты (`python -m pytest tests/`) и пересоберите exe файл.

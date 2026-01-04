# GhostLayer Landing Page

Лендинг для GhostLayer — десктопного приложения для анонимизации данных.

## Локальный запуск

```bash
npm install
npm run dev
```

## Деплой на Vercel

### Вариант 1: Через GitHub (рекомендуется)

1. Создайте репозиторий на GitHub
2. Запушьте этот проект
3. Зайдите на https://vercel.com
4. Нажмите "Import Project" → выберите репозиторий
5. Vercel автоматически определит Vite и задеплоит

### Вариант 2: Через Vercel CLI

```bash
npm i -g vercel
vercel
```

## Подключение домена

1. В Vercel Dashboard → Settings → Domains
2. Добавьте `ghostlayerapp.com`
3. В Namecheap измените DNS записи:
   - Type: A, Host: @, Value: 76.76.21.21
   - Type: CNAME, Host: www, Value: cname.vercel-dns.com

## Tech Stack

- React 18
- Vite 5
- Tailwind CSS 3
- Lucide Icons

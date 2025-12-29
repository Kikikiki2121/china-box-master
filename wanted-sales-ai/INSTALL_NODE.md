# Установка Node.js

Для работы проекта необходимо установить Node.js (версия 18 или выше).

## Вариант 1: Через официальный сайт

1. Перейдите на https://nodejs.org/
2. Скачайте LTS версию для macOS
3. Установите скачанный файл
4. Перезапустите терминал

## Вариант 2: Через Homebrew (рекомендуется)

```bash
brew install node
```

## Проверка установки

После установки проверьте:

```bash
node --version
npm --version
```

Оба должны показать версии.

## После установки Node.js

1. Перейдите в директорию проекта:
   ```bash
   cd wanted-sales-ai
   ```

2. Установите зависимости:
   ```bash
   npm install
   ```

3. Добавьте ваш OpenAI API ключ в `.env.local`:
   ```env
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

4. Запустите dev сервер:
   ```bash
   npm run dev
   ```

5. Откройте http://localhost:3000 в браузере


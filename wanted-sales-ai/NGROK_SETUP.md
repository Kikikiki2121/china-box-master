# Настройка ngrok для доступа к приложению

## Установка ngrok

### Вариант 1: Через Homebrew (если установлен)
```bash
brew install ngrok
```

### Вариант 2: Прямая установка
1. Перейдите на https://ngrok.com/download
2. Скачайте версию для macOS
3. Распакуйте и переместите в `/usr/local/bin/`:
   ```bash
   sudo mv ngrok /usr/local/bin/
   ```

## Настройка authtoken

После установки выполните:
```bash
ngrok config add-authtoken 37VoqIMUvH7W8bvtgXI0tmEDB1t_7Ftqw3w2wA1v8juKSKu65
```

## Запуск ngrok

**ВАЖНО**: Приложение работает на порту 3000, а не 80!

Запустите ngrok на правильном порту:
```bash
ngrok http 3000
```

После запуска вы получите публичный URL вида:
- `https://xxxx-xxxx-xxxx.ngrok-free.app`

## Использование

1. Убедитесь, что dev сервер запущен:
   ```bash
   cd wanted-sales-ai
   npm run dev
   ```

2. В другом терминале запустите ngrok:
   ```bash
   ngrok http 3000
   ```

3. Используйте URL из ngrok для доступа к приложению

## Автоматический запуск

Используйте скрипт `start-ngrok.sh` для автоматического запуска.


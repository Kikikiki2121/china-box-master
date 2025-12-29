#!/bin/bash

echo "🚀 Запуск ngrok для wanted-sales-ai..."
echo ""

# Проверяем наличие ngrok
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok не установлен!"
    echo ""
    echo "Установите ngrok одним из способов:"
    echo "1. brew install ngrok"
    echo "2. Скачайте с https://ngrok.com/download"
    echo ""
    exit 1
fi

echo "✅ ngrok найден"
echo ""

# Проверяем, запущен ли dev сервер на порту 3000
if ! lsof -ti:3000 &> /dev/null; then
    echo "⚠️  Dev сервер не запущен на порту 3000"
    echo "Запустите в другом терминале: npm run dev"
    echo ""
fi

echo "🌐 Запускаю ngrok на порту 3000..."
echo "Публичный URL будет показан ниже:"
echo ""

# Запускаем ngrok
ngrok http 3000


#!/bin/bash

echo "🚀 Настройка Wanted Sales AI..."
echo ""

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен!"
    echo ""
    echo "Пожалуйста, установите Node.js одним из способов:"
    echo "1. Через официальный сайт: https://nodejs.org/"
    echo "2. Через Homebrew: brew install node"
    echo ""
    echo "После установки запустите этот скрипт снова."
    exit 1
fi

echo "✅ Node.js найден: $(node --version)"
echo "✅ npm найден: $(npm --version)"
echo ""

# Проверка .env.local
if [ ! -f .env.local ]; then
    echo "📝 Создаю файл .env.local..."
    cat > .env.local << EOF
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
    echo "⚠️  ВАЖНО: Добавьте ваш OpenAI API ключ в файл .env.local!"
    echo ""
fi

# Установка зависимостей
echo "📦 Устанавливаю зависимости..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Зависимости установлены!"
    echo ""
    echo "📝 Следующие шаги:"
    echo "1. Откройте файл .env.local и добавьте ваш OpenAI API ключ"
    echo "2. Запустите: npm run dev"
    echo "3. Откройте http://localhost:3000 в браузере"
    echo ""
else
    echo ""
    echo "❌ Ошибка при установке зависимостей"
    exit 1
fi


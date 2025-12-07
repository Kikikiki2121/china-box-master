import asyncio
import json
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo

# --- ⚙️ ТВОИ НАСТРОЙКИ ---

# 1. Твой Токен (Я УЖЕ ВСТАВИЛ ЕГО ✅)
BOT_TOKEN = "8520802433:AAEKrlpZzYktcwERwdNbPKyhKWGiXEAdIH8"
# 2. Твой ID (Я УЖЕ ВПИСАЛ ЕГО ✅)
ADMIN_ID = 249088887

# 3. ⚠️ Ссылка на твой сайт (GitHub Pages)
# Это правильная ссылка на твой сайт, а не на репозиторий
WEB_APP_URL = "https://kikikiki2121.github.io/china-box-master/"

# --------------------------

logging.basicConfig(level=logging.INFO)
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Команда /start - показывает кнопку
@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📱 Открыть China Box Master", web_app=WebAppInfo(url=WEB_APP_URL))]
        ],
        resize_keyboard=True
    )
    await message.answer("Привет! Логистический терминал готов к работе. Жми кнопку 👇", reply_markup=keyboard)

# Ловим данные из приложения
@dp.message(F.content_type == "web_app_data")
async def process_data(message: types.Message):
    # Превращаем полученный текст (JSON) в словарь
    try:
        data = json.loads(message.web_app_data.data)
        action = data.get("action")
        
        # Если клиент запросил Адрес Склада
        if action == "get_address":
            await message.answer(
                "📍 **АДРЕС СКЛАДА (GUANGZHOU):**\n\n"
                "Guangzhou Baiyun District, Shijing Street...\n"
                "Tel: +86 138 0000 0000\n"
                "Code: `CLIENT-249`"
            )

        # Если клиент нажал 'Оформить заказ'
        elif action == "order":
            order_data = data.get("data", {})
            
            # 1. Пишем клиенту
            await message.answer("✅ **Заявка принята!**\n\nВаш расчет передан менеджеру.\nОжидайте ответа в течение 5-10 минут.")
            
            # 2. Пишем ТЕБЕ (Админу)
            # Формируем список товаров
            items_list = ""
            for item in order_data.get('items', []):
                items_list += (
                    f"📦 Box #{item['boxNumber']}: {item['dimensions']}\n"
                    f"   Вес: {item['weight']}кг × {item['quantity']}шт = {item['totalWeight']}кг\n"
                    f"   Объем: {item['totalVolume']}м³\n"
                )

            # Определяем метод доставки
            delivery_icons = {
                'air': '✈️ AIR',
                'truck': '🚛 TRUCK', 
                'sea': '🚢 SEA',
                'custom': '⚙️ CUSTOM'
            }
            delivery_method = delivery_icons.get(order_data.get('deliveryMethod', 'custom'), '⚙️ CUSTOM')
            
            # Символ валюты
            currency_symbols = {'USD': '$', 'CNY': '¥', 'RUB': '₽'}
            currency = order_data.get('currency', 'USD')
            symbol = currency_symbols.get(currency, '$')

            report = (
                f"🔔 **НОВАЯ ЗАЯВКА!**\n\n"
                f"👤 Клиент: @{message.from_user.username or 'Не указан'} ({message.from_user.full_name})\n"
                f"💰 **ИТОГО: {symbol}{order_data.get('totalPrice', '0'):.2f} {currency}**\n\n"
                f"📊 **Параметры:**\n"
                f"📦 Общий вес: {order_data.get('totalWeight', '0'):.2f} кг\n"
                f"🧊 Общий объем: {order_data.get('totalVolume', '0'):.3f} м³\n"
                f"📐 Плотность: {order_data.get('density', '0'):.2f} kg/m³\n"
                f"🚚 Доставка: {delivery_method}\n"
                f"💵 Тариф: {symbol}{order_data.get('rate', '0')} per {order_data.get('rateType', 'kg').upper()}\n"
                f"💱 Курс: 1 USD = {order_data.get('exchangeRate', 1)} {currency}\n\n"
                f"📋 **Груз ({len(order_data.get('items', []))} коробок):**\n{items_list}\n"
                f"📅 Дата: {order_data.get('date', 'Не указана')}"
            )
            
            # Отправляем отчет на твой ID
            await bot.send_message(chat_id=ADMIN_ID, text=report, parse_mode="Markdown")
            
    except Exception as e:
        logging.error(f"Ошибка при обработке данных: {e}")

async def main():
    print("🤖 Бот China Box Master ЗАПУЩЕН! Иди в Телеграм.")
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())

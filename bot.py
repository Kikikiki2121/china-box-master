import asyncio
import json
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage

# Состояния для ответов клиенту
class ReplyStates(StatesGroup):
    waiting_for_message = State()

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
storage = MemoryStorage()
dp = Dispatcher(storage=storage)

# Команда /start - показывает кнопку
@dp.message(Command("start"))
async def cmd_start(message: types.Message, state: FSMContext):
    await state.clear()  # Очищаем любое состояние
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📱 Открыть China Box Master", web_app=WebAppInfo(url=WEB_APP_URL))]
        ],
        resize_keyboard=True
    )
    await message.answer("Привет! Логистический терминал готов к работе. Жми кнопку 👇", reply_markup=keyboard)

# Команда /cancel
@dp.message(Command("cancel"))
async def cmd_cancel(message: types.Message, state: FSMContext):
    await state.clear()
    await message.answer("❌ Действие отменено.")

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
            
            # Создаём inline кнопки для быстрых ответов
            keyboard = InlineKeyboardMarkup(inline_keyboard=[
                [
                    InlineKeyboardButton(text="✅ Принять", callback_data=f"accept_{message.from_user.id}"),
                    InlineKeyboardButton(text="❌ Отклонить", callback_data=f"reject_{message.from_user.id}")
                ],
                [
                    InlineKeyboardButton(text="📝 Написать клиенту", callback_data=f"reply_{message.from_user.id}")
                ]
            ])
            
            # Отправляем отчет на твой ID с кнопками
            await bot.send_message(
                chat_id=ADMIN_ID, 
                text=report, 
                parse_mode="Markdown",
                reply_markup=keyboard
            )
            
    except Exception as e:
        logging.error(f"Ошибка при обработке данных: {e}")

# Обработчики inline кнопок
@dp.callback_query(F.data.startswith("accept_"))
async def process_accept(callback: types.CallbackQuery):
    client_id = int(callback.data.split("_")[1])
    
    # Отправляем клиенту подтверждение
    await bot.send_message(
        chat_id=client_id,
        text="✅ **Заявка принята в работу!**\n\n"
             "Ваш заказ обрабатывается.\n"
             "Скоро с вами свяжется менеджер для уточнения деталей."
    )
    
    # Уведомляем админа
    await callback.answer("✅ Заявка принята! Клиент уведомлен.")
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.edit_text(
        callback.message.text + "\n\n✅ **СТАТУС: ПРИНЯТО**",
        parse_mode="Markdown"
    )

@dp.callback_query(F.data.startswith("reject_"))
async def process_reject(callback: types.CallbackQuery):
    client_id = int(callback.data.split("_")[1])
    
    # Отправляем клиенту отказ
    await bot.send_message(
        chat_id=client_id,
        text="❌ **К сожалению, мы не можем принять эту заявку.**\n\n"
             "Попробуйте изменить параметры и отправить новый расчет.\n"
             "Или свяжитесь с менеджером для уточнения деталей."
    )
    
    # Уведомляем админа
    await callback.answer("❌ Заявка отклонена. Клиент уведомлен.")
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.edit_text(
        callback.message.text + "\n\n❌ **СТАТУС: ОТКЛОНЕНО**",
        parse_mode="Markdown"
    )

@dp.callback_query(F.data.startswith("reply_"))
async def process_reply_button(callback: types.CallbackQuery, state: FSMContext):
    client_id = int(callback.data.split("_")[1])
    
    # Сохраняем ID клиента в состояние
    await state.update_data(client_id=client_id)
    await state.set_state(ReplyStates.waiting_for_message)
    
    # Просим админа написать сообщение
    await callback.message.answer(
        "📝 **Напишите сообщение для клиента:**\n\n"
        "Ваше следующее сообщение будет отправлено клиенту.\n"
        "Для отмены отправьте /cancel"
    )
    await callback.answer()

# Обработчик получения текста от админа
@dp.message(ReplyStates.waiting_for_message)
async def process_admin_message(message: types.Message, state: FSMContext):
    if message.text == "/cancel":
        await state.clear()
        await message.answer("❌ Отправка сообщения отменена.")
        return
    
    # Получаем ID клиента из состояния
    data = await state.get_data()
    client_id = data.get('client_id')
    
    if not client_id:
        await message.answer("❌ Ошибка: не найден ID клиента.")
        await state.clear()
        return
    
    # Отправляем сообщение клиенту
    try:
        await bot.send_message(
            chat_id=client_id,
            text=f"💬 **Сообщение от менеджера:**\n\n{message.text}"
        )
        await message.answer(f"✅ Сообщение отправлено клиенту!")
    except Exception as e:
        await message.answer(f"❌ Ошибка отправки: {e}")
    
    # Очищаем состояние
    await state.clear()

async def main():
    print("🤖 Бот China Box Master ЗАПУЩЕН! Иди в Телеграм.")
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())

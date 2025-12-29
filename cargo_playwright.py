#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Playwright версия - лучше обходит защиту от ботов
"""

import asyncio
import json
from datetime import datetime
from playwright.async_api import async_playwright

# ===== НАСТРОЙКИ =====
LOGIN_URL = "https://jiheguoji.itdida.com/itdida-flash/desktop/client-portal"
USERNAME = "281604"
PASSWORD = "Aa123456"  # ⚠️ СМЕНИТЕ ПАРОЛЬ!

HEADLESS = False  # False = с окном, True = без окна (для VPS)
SLOW_MO = 1000  # Замедление в миллисекундах (как человек)


async def main():
    print("=" * 60)
    print("🚢 PLAYWRIGHT CARGO CHECKER")
    print("=" * 60)
    print(f"⏰ Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 URL: {LOGIN_URL}")
    print(f"👤 Логин: {USERNAME}")
    print("=" * 60)
    
    async with async_playwright() as p:
        # Запуск браузера с антидетект настройками
        print("\n🚀 Запуск браузера...")
        browser = await p.chromium.launch(
            headless=HEADLESS,
            slow_mo=SLOW_MO,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
            ]
        )
        
        # Создаем контекст с реалистичными параметрами
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='ru-RU',
            timezone_id='Asia/Shanghai',
        )
        
        # Маскируем WebDriver
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            // Убираем другие признаки автоматизации
            window.navigator.chrome = {
                runtime: {},
            };
            
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
            
            Object.defineProperty(navigator, 'languages', {
                get: () => ['ru-RU', 'ru', 'en-US', 'en'],
            });
        """)
        
        page = await context.new_page()
        print("✅ Браузер запущен")
        
        try:
            # Открываем страницу
            print(f"\n🌐 Открываю {LOGIN_URL}...")
            await page.goto(LOGIN_URL, wait_until='networkidle', timeout=60000)
            await page.wait_for_timeout(3000)
            
            # Скриншот
            await page.screenshot(path='playwright_01_start.png')
            print("📸 Скриншот: playwright_01_start.png")
            
            # Сохраняем HTML
            content = await page.content()
            with open('playwright_page.html', 'w', encoding='utf-8') as f:
                f.write(content)
            print("💾 HTML: playwright_page.html")
            
            # Проверяем на "Access denied"
            body_text = await page.inner_text('body')
            if 'Access denied' in body_text or 'access denied' in body_text.lower():
                print("\n⚠️  ВНИМАНИЕ: Обнаружен 'Access denied'")
                print("Сайт блокирует автоматизацию даже через Playwright")
                print("\n🔍 Пробую обойти защиту...")
                
                # Ждем дольше - может быть JS challenge
                await page.wait_for_timeout(10000)
                await page.screenshot(path='playwright_02_after_wait.png')
                print("📸 Скриншот после ожидания: playwright_02_after_wait.png")
                
                body_text = await page.inner_text('body')
                if 'Access denied' in body_text:
                    print("\n❌ Защита не обошлась")
                    print("\n💡 РЕШЕНИЕ: Используйте букмарклет или ручной вход")
                    print("   См. файл: bookmarklet_solution.html")
                    return
            
            # Ищем поля ввода
            print("\n🔍 Поиск полей для входа...")
            
            # Пробуем разные селекторы
            username_field = None
            password_field = None
            
            # Метод 1: по type
            try:
                password_field = await page.wait_for_selector('input[type="password"]', timeout=5000)
                print("✅ Нашел поле пароля")
            except:
                print("❌ Поле пароля не найдено (method 1)")
            
            try:
                username_field = await page.wait_for_selector('input[type="text"]', timeout=5000)
                print("✅ Нашел поле логина")
            except:
                print("❌ Поле логина не найдено (method 1)")
            
            # Метод 2: первый input
            if not username_field:
                try:
                    username_field = await page.query_selector('input')
                    if username_field:
                        print("✅ Нашел поле логина (первый input)")
                except:
                    pass
            
            if not username_field or not password_field:
                print("\n❌ Не удалось найти поля для входа")
                print("Возможно, форма загружается динамически или защищена")
                
                # Показываем все input элементы
                all_inputs = await page.query_selector_all('input')
                print(f"\n📊 Всего найдено input элементов: {len(all_inputs)}")
                
                for i, inp in enumerate(all_inputs):
                    inp_type = await inp.get_attribute('type')
                    inp_name = await inp.get_attribute('name')
                    inp_id = await inp.get_attribute('id')
                    print(f"  Input #{i+1}: type={inp_type}, name={inp_name}, id={inp_id}")
                
                return
            
            # Вводим данные
            print(f"\n⌨️  Ввод логина: {USERNAME}")
            await username_field.fill(USERNAME)
            await page.wait_for_timeout(1000)
            
            print(f"⌨️  Ввод пароля: {'*' * len(PASSWORD)}")
            await password_field.fill(PASSWORD)
            await page.wait_for_timeout(1000)
            
            await page.screenshot(path='playwright_03_filled.png')
            print("📸 Скриншот: playwright_03_filled.png")
            
            # Ищем кнопку входа
            print("\n🔍 Поиск кнопки входа...")
            login_button = None
            
            # Пробуем найти по тексту
            try:
                login_button = await page.wait_for_selector('button:has-text("Login"), button:has-text("登录"), button:has-text("Sign")', timeout=3000)
                print("✅ Нашел кнопку входа")
            except:
                # Пробуем любую кнопку
                try:
                    login_button = await page.query_selector('button')
                    if login_button:
                        print("✅ Нашел кнопку (первую на странице)")
                except:
                    print("❌ Кнопка не найдена")
            
            if login_button:
                print("🖱️  Клик по кнопке входа...")
                await login_button.click()
            else:
                print("⏎ Нажатие Enter...")
                await password_field.press('Enter')
            
            # Ждем загрузки
            print("\n⏳ Ожидание загрузки личного кабинета...")
            await page.wait_for_timeout(8000)
            
            await page.screenshot(path='playwright_04_after_login.png')
            print("📸 Скриншот: playwright_04_after_login.png")
            
            # Анализируем содержимое
            print("\n📦 Анализ данных о грузе...")
            body_text = await page.inner_text('body')
            
            # Сохраняем текст
            with open('playwright_content.txt', 'w', encoding='utf-8') as f:
                f.write(body_text)
            print("💾 Текст страницы: playwright_content.txt")
            
            # Поиск ключевых слов
            keywords = {
                "APL JEDDAH": "Название судна",
                "晚靠": "Задержка швартовки",
                "ZMPU": "Контейнер",
                "281604": "Номер клиента",
            }
            
            results = {
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "found": []
            }
            
            print("\n🔍 Поиск ключевых слов:")
            for keyword, desc in keywords.items():
                if keyword in body_text:
                    print(f"   ✅ {keyword} - {desc}")
                    results["found"].append(keyword)
                else:
                    print(f"   ❌ {keyword}")
            
            # Сохраняем результаты
            with open('playwright_results.json', 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            
            # Финальный скриншот
            await page.screenshot(path='playwright_05_final.png', full_page=True)
            print("\n📸 Полный скриншот: playwright_05_final.png")
            
            print("\n" + "=" * 60)
            print("✅ ПРОВЕРКА ЗАВЕРШЕНА")
            print("=" * 60)
            print("📁 Созданные файлы:")
            print("   • playwright_*.png - Скриншоты")
            print("   • playwright_content.txt - Текст страницы")
            print("   • playwright_results.json - Результаты")
            print("=" * 60)
            
            # Держим браузер открытым если не headless
            if not HEADLESS:
                print("\n⏸️  Браузер остается открытым. Нажмите Enter для закрытия...")
                input()
            
        except Exception as e:
            print(f"\n❌ ОШИБКА: {e}")
            await page.screenshot(path='playwright_error.png')
            print("📸 Скриншот ошибки: playwright_error.png")
            
        finally:
            print("\n🔒 Закрытие браузера...")
            await browser.close()
            print("✅ Браузер закрыт")


if __name__ == "__main__":
    asyncio.run(main())

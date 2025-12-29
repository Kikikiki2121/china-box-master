#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Автоматический мониторинг груза APL JEDDAH
Использует Selenium с антидетект настройками
"""

import time
import json
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager

# ===== ВАШИ ДАННЫЕ =====
LOGIN_URL = "https://jiheguoji.itdida.com/itdida-flash/desktop/client-portal"
USERNAME = "281604"
PASSWORD = "Aa123456"

# ===== НАСТРОЙКИ =====
HEADLESS = False  # Установите True для запуска без окна на VPS
WAIT_TIMEOUT = 30  # Максимальное время ожидания элементов (секунд)


def create_stealth_browser():
    """
    Создает браузер с антидетект настройками
    """
    chrome_options = Options()
    
    # Для VPS - запуск без окна
    if HEADLESS:
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
    
    # Антидетект настройки
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    # Реалистичный User-Agent
    chrome_options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
    
    # Размер окна
    chrome_options.add_argument("--window-size=1920,1080")
    
    # Дополнительные настройки
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--disable-infobars")
    chrome_options.add_argument("--disable-notifications")
    
    # Создаем драйвер
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    # Удаляем признаки WebDriver
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    
    return driver


def wait_and_find(driver, by, value, timeout=WAIT_TIMEOUT):
    """
    Умное ожидание элемента
    """
    try:
        element = WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((by, value))
        )
        return element
    except TimeoutException:
        print(f"⚠️ Таймаут: элемент {value} не найден за {timeout} сек")
        return None


def login_to_portal(driver):
    """
    Логин на портале
    """
    print("🌐 Открываю портал...")
    driver.get(LOGIN_URL)
    time.sleep(3)  # Даем странице загрузиться
    
    # Сохраняем скриншот начальной страницы
    driver.save_screenshot("01_login_page.png")
    print("📸 Скриншот: 01_login_page.png")
    
    # Ищем поле логина - пробуем разные варианты
    print("🔍 Ищу поле логина...")
    username_input = None
    
    # Попытка 1: по type='text'
    try:
        username_input = driver.find_element(By.XPATH, "//input[@type='text']")
        print("✅ Нашел поле логина (method 1)")
    except:
        pass
    
    # Попытка 2: по placeholder или name
    if not username_input:
        try:
            username_input = driver.find_element(By.XPATH, 
                "//input[contains(@placeholder, 'user') or contains(@placeholder, 'login') or contains(@name, 'user')]"
            )
            print("✅ Нашел поле логина (method 2)")
        except:
            pass
    
    # Попытка 3: первый input на странице
    if not username_input:
        try:
            username_input = driver.find_element(By.TAG_NAME, "input")
            print("✅ Нашел поле логина (method 3 - first input)")
        except:
            pass
    
    if not username_input:
        print("❌ Не могу найти поле логина!")
        driver.save_screenshot("error_no_login_field.png")
        return False
    
    # Ищем поле пароля
    print("🔍 Ищу поле пароля...")
    password_input = wait_and_find(driver, By.XPATH, "//input[@type='password']")
    
    if not password_input:
        print("❌ Не могу найти поле пароля!")
        driver.save_screenshot("error_no_password_field.png")
        return False
    
    # Вводим данные
    print(f"⌨️ Ввожу логин: {USERNAME}")
    username_input.clear()
    username_input.send_keys(USERNAME)
    time.sleep(1)
    
    print(f"⌨️ Ввожу пароль: {'*' * len(PASSWORD)}")
    password_input.clear()
    password_input.send_keys(PASSWORD)
    time.sleep(1)
    
    driver.save_screenshot("02_credentials_entered.png")
    print("📸 Скриншот: 02_credentials_entered.png")
    
    # Ищем кнопку входа
    print("🔍 Ищу кнопку входа...")
    login_button = None
    
    # Попытка 1: по тексту
    try:
        login_button = driver.find_element(By.XPATH, 
            "//button[contains(text(), 'Login') or contains(text(), '登录') or contains(text(), 'Sign') or contains(text(), 'Enter')]"
        )
        print("✅ Нашел кнопку входа")
    except:
        # Попытка 2: любая кнопка
        try:
            login_button = driver.find_element(By.TAG_NAME, "button")
            print("✅ Нашел кнопку (первая на странице)")
        except:
            pass
    
    if login_button:
        print("🖱️ Кликаю кнопку входа...")
        login_button.click()
    else:
        print("⚠️ Кнопка не найдена, пробую Enter...")
        password_input.submit()
    
    # Ждем загрузки
    print("⏳ Ожидаю загрузки личного кабинета...")
    time.sleep(8)
    
    driver.save_screenshot("03_after_login.png")
    print("📸 Скриншот: 03_after_login.png")
    
    return True


def extract_cargo_info(driver):
    """
    Извлекает информацию о грузе
    """
    print("\n📦 Анализирую данные о грузе...")
    
    # Получаем весь текст страницы
    try:
        body_text = driver.find_element(By.TAG_NAME, "body").text
        
        # Сохраняем в файл
        with open("page_content.txt", "w", encoding="utf-8") as f:
            f.write(body_text)
        print("💾 Текст страницы сохранен: page_content.txt")
        
        # Ищем ключевые слова
        results = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "found_keywords": []
        }
        
        keywords = {
            "APL JEDDAH": "Название судна",
            "晚靠": "Задержка швартовки",
            "ZMPU": "Контейнер",
            "281604": "Ваш номер клиента",
            "status": "Статус",
            "delay": "Задержка",
        }
        
        print("\n🔍 Поиск ключевых слов:")
        for keyword, description in keywords.items():
            if keyword in body_text:
                print(f"   ✅ Найдено: {keyword} ({description})")
                results["found_keywords"].append({
                    "keyword": keyword,
                    "description": description
                })
            else:
                print(f"   ❌ Не найдено: {keyword}")
        
        # Сохраняем результаты в JSON
        with open("cargo_status.json", "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print("\n💾 Результаты сохранены: cargo_status.json")
        
        return results
        
    except Exception as e:
        print(f"❌ Ошибка при извлечении данных: {e}")
        return None


def find_tables(driver):
    """
    Находит и извлекает все таблицы на странице
    """
    print("\n📊 Ищу таблицы на странице...")
    try:
        tables = driver.find_elements(By.TAG_NAME, "table")
        print(f"Найдено таблиц: {len(tables)}")
        
        for idx, table in enumerate(tables):
            print(f"\n--- Таблица #{idx + 1} ---")
            print(table.text[:500])  # Первые 500 символов
            
            # Сохраняем HTML таблицы
            with open(f"table_{idx + 1}.html", "w", encoding="utf-8") as f:
                f.write(table.get_attribute("outerHTML"))
        
        return len(tables)
    except Exception as e:
        print(f"❌ Ошибка при поиске таблиц: {e}")
        return 0


def main():
    """
    Главная функция
    """
    print("=" * 60)
    print("🚢 CARGO CHECKER - Автоматический мониторинг груза")
    print("=" * 60)
    print(f"Время запуска: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Портал: {LOGIN_URL}")
    print(f"Пользователь: {USERNAME}")
    print("=" * 60)
    
    driver = None
    
    try:
        # Создаем браузер
        driver = create_stealth_browser()
        print("✅ Браузер запущен")
        
        # Логин
        if not login_to_portal(driver):
            print("\n❌ ОШИБКА: Не удалось войти в систему")
            return
        
        print("\n✅ Успешный вход в систему!")
        
        # Пауза для полной загрузки
        time.sleep(5)
        
        # Извлекаем данные
        cargo_info = extract_cargo_info(driver)
        
        # Ищем таблицы
        tables_found = find_tables(driver)
        
        # Итоговый скриншот
        driver.save_screenshot("04_final_state.png")
        print("\n📸 Финальный скриншот: 04_final_state.png")
        
        # Итоги
        print("\n" + "=" * 60)
        print("✅ ПРОВЕРКА ЗАВЕРШЕНА")
        print("=" * 60)
        print(f"📁 Созданные файлы:")
        print("   • 01_login_page.png - Страница входа")
        print("   • 02_credentials_entered.png - После ввода данных")
        print("   • 03_after_login.png - После входа")
        print("   • 04_final_state.png - Финальное состояние")
        print("   • page_content.txt - Весь текст страницы")
        print("   • cargo_status.json - Результаты поиска")
        if tables_found > 0:
            print(f"   • table_*.html - {tables_found} таблиц(ы)")
        print("\n💡 Проверьте скриншоты и файлы для анализа")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ КРИТИЧЕСКАЯ ОШИБКА: {e}")
        if driver:
            driver.save_screenshot("error_critical.png")
            print("📸 Скриншот ошибки: error_critical.png")
    
    finally:
        if driver:
            print("\n🔒 Закрываю браузер...")
            time.sleep(2)
            driver.quit()
            print("✅ Браузер закрыт")


if __name__ == "__main__":
    main()

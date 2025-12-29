#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Debug скрипт для анализа структуры страницы
"""

import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager

LOGIN_URL = "https://jiheguoji.itdida.com/itdida-flash/desktop/client-portal"
USERNAME = "281604"
PASSWORD = "Aa123456"

def create_browser():
    chrome_options = Options()
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    chrome_options.add_argument("--window-size=1920,1080")
    
    # Реалистичный User-Agent
    chrome_options.add_argument(
        "user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    # Удаляем признаки WebDriver
    driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
        'source': '''
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            })
        '''
    })
    
    return driver

def main():
    print("🔍 DEBUG MODE - Анализ структуры страницы")
    print("=" * 60)
    
    driver = create_browser()
    
    try:
        print("1. Открываю страницу...")
        driver.get(LOGIN_URL)
        time.sleep(5)  # Даем странице полностью загрузиться
        
        # Сохраняем HTML
        print("2. Сохраняю HTML...")
        with open("page_source.html", "w", encoding="utf-8") as f:
            f.write(driver.page_source)
        print("✅ HTML сохранен: page_source.html")
        
        # Сохраняем скриншот
        print("3. Сохраняю скриншот...")
        driver.save_screenshot("debug_screenshot.png")
        print("✅ Скриншот: debug_screenshot.png")
        
        # Ищем все input элементы
        print("\n4. Анализ INPUT элементов:")
        print("-" * 60)
        inputs = driver.find_elements(By.TAG_NAME, "input")
        print(f"Всего найдено INPUT элементов: {len(inputs)}")
        
        for idx, inp in enumerate(inputs):
            print(f"\n  INPUT #{idx + 1}:")
            print(f"    type: {inp.get_attribute('type')}")
            print(f"    name: {inp.get_attribute('name')}")
            print(f"    id: {inp.get_attribute('id')}")
            print(f"    class: {inp.get_attribute('class')}")
            print(f"    placeholder: {inp.get_attribute('placeholder')}")
            print(f"    visible: {inp.is_displayed()}")
        
        # Ищем все button элементы
        print("\n5. Анализ BUTTON элементов:")
        print("-" * 60)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        print(f"Всего найдено BUTTON элементов: {len(buttons)}")
        
        for idx, btn in enumerate(buttons):
            print(f"\n  BUTTON #{idx + 1}:")
            print(f"    text: {btn.text}")
            print(f"    type: {btn.get_attribute('type')}")
            print(f"    class: {btn.get_attribute('class')}")
            print(f"    visible: {btn.is_displayed()}")
        
        # Пробуем найти элементы через разные методы
        print("\n6. Поиск через разные селекторы:")
        print("-" * 60)
        
        selectors = [
            ("CSS: input[type='text']", By.CSS_SELECTOR, "input[type='text']"),
            ("CSS: input[type='password']", By.CSS_SELECTOR, "input[type='password']"),
            ("CSS: input", By.CSS_SELECTOR, "input"),
            ("XPATH: //input", By.XPATH, "//input"),
            ("XPATH: //input[@type='text']", By.XPATH, "//input[@type='text']"),
            ("XPATH: //input[@type='password']", By.XPATH, "//input[@type='password']"),
        ]
        
        for desc, by, selector in selectors:
            try:
                elements = driver.find_elements(by, selector)
                print(f"  ✅ {desc}: найдено {len(elements)} элементов")
            except Exception as e:
                print(f"  ❌ {desc}: {str(e)[:50]}")
        
        # Проверяем iframe
        print("\n7. Проверка IFRAME:")
        print("-" * 60)
        iframes = driver.find_elements(By.TAG_NAME, "iframe")
        print(f"Найдено IFRAME: {len(iframes)}")
        
        if iframes:
            for idx, iframe in enumerate(iframes):
                print(f"\n  IFRAME #{idx + 1}:")
                print(f"    src: {iframe.get_attribute('src')}")
                print(f"    name: {iframe.get_attribute('name')}")
                print(f"    id: {iframe.get_attribute('id')}")
        
        print("\n" + "=" * 60)
        print("✅ АНАЛИЗ ЗАВЕРШЕН")
        print("=" * 60)
        print("Проверьте файлы:")
        print("  • page_source.html - полный HTML код")
        print("  • debug_screenshot.png - скриншот страницы")
        print("\n💡 Откройте page_source.html и найдите форму входа!")
        
        # Ждем немного перед закрытием
        input("\n⏸️  Нажмите Enter чтобы закрыть браузер...")
        
    except Exception as e:
        print(f"\n❌ ОШИБКА: {e}")
        driver.save_screenshot("error_debug.png")
        with open("error_log.txt", "w") as f:
            f.write(str(e))
    
    finally:
        driver.quit()
        print("✅ Браузер закрыт")

if __name__ == "__main__":
    main()

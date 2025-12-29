import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    // Проверяем наличие API ключа
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key_here") {
      console.error("OpenAI API key is not configured");
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Please add your API key to .env.local file." },
        { status: 500 }
      );
    }

    if (!process.env.OPENAI_BASE_URL) {
      console.error("OPENAI_BASE_URL is not configured");
      return NextResponse.json(
        { error: "OPENAI_BASE_URL is not configured. Please add it to .env.local file." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get("image") as File;

    if (!imageFile) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Проверка размера файла (максимум 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds 10MB. Current size: ${(imageFile.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 400 }
      );
    }

    console.log("1. Получено изображение:", imageFile.name, imageFile.size, "bytes", imageFile.type);

    // Определяем MIME type
    const mimeType = imageFile.type || "image/jpeg";
    const imageExtension = mimeType.split("/")[1] || "jpeg";

    // Конвертируем File в base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    console.log("2. Отправляем запрос к Gemini...");

    const completion = await openai.chat.completions.create({
      model: "gemini-2.5-pro-preview-p",
      messages: [
        {
          role: "system",
          content: `Ты ассистент проката мотоциклов. Твоя задача — извлечь данные из паспорта клиента.

КРИТИЧЕСКИ ВАЖНО: Верни ТОЛЬКО валидный JSON объект. НИКАКИХ markdown блоков, НИКАКИХ объяснений, НИКАКОГО текста до или после JSON.

Формат ответа (строго соблюдай):
{"full_name":"...","passport_number":"...","nationality":"...","date_of_birth":"...","home_address":"..."}

Правила:
- Surname и Given Name объедини в full_name (одна строка)
- Если адреса нет, используй пустую строку ""
- Все значения должны быть строками в двойных кавычках
- Не используй markdown, не используй код блоки, просто чистый JSON`
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Извлеки данные из паспорта. Верни ТОЛЬКО JSON объект без markdown и без объяснений. Формат: {\"full_name\":\"...\",\"passport_number\":\"...\",\"nationality\":\"...\",\"date_of_birth\":\"...\",\"home_address\":\"...\"}" 
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              },
            },
          ],
        },
      ],
      max_tokens: 300,
      temperature: 0.1,
    });

    const aiResponse = completion.choices[0]?.message?.content || "{}";
    console.log("3. Ответ от ИИ (полный):", aiResponse);
    console.log("3.1. Длина ответа:", aiResponse.length);
    
    // Функция для извлечения JSON с учетом строк
    function extractJSON(text: string): string | null {
      // Удаляем markdown блоки
      let cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      
      // Ищем первую открывающую скобку
      const jsonStart = cleaned.indexOf('{');
      if (jsonStart === -1) {
        return null;
      }
      
      // Парсим JSON с учетом строк (внутри строк могут быть фигурные скобки)
      let braceCount = 0;
      let inString = false;
      let escapeNext = false;
      let jsonEnd = -1;
      
      for (let i = jsonStart; i < cleaned.length; i++) {
        const char = cleaned[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              jsonEnd = i + 1;
              break;
            }
          }
        }
      }
      
      if (jsonEnd > jsonStart) {
        return cleaned.substring(jsonStart, jsonEnd);
      }
      
      return null;
    }
    
    let result;
    let parsedJson: string | null = null;
    
    // Метод 1: Прямой парсинг после очистки
    try {
      let cleanJson = aiResponse
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      
      // Пробуем найти JSON объект
      parsedJson = extractJSON(cleanJson);
      
      if (parsedJson) {
        result = JSON.parse(parsedJson);
        console.log("4. Успешно распознано (метод 1):", result);
      } else {
        throw new Error("JSON не найден в ответе");
      }
    } catch (e: any) {
      console.error("4.1. Ошибка парсинга (метод 1):", e.message);
      
      // Метод 2: Поиск JSON в исходном тексте
      try {
        parsedJson = extractJSON(aiResponse);
        if (parsedJson) {
          result = JSON.parse(parsedJson);
          console.log("4.2. Успешно распознано (метод 2):", result);
        } else {
          throw new Error("JSON не найден");
        }
      } catch (e2: any) {
        console.error("4.3. Ошибка парсинга (метод 2):", e2.message);
        
        // Метод 3: Попробуем найти JSON через регулярное выражение (менее надежно)
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const potentialJson = jsonMatch[0];
            // Пробуем исправить возможные проблемы
            let fixedJson = potentialJson
              .replace(/,\s*}/g, "}") // Убираем лишние запятые
              .replace(/,\s*]/g, "]")
              .replace(/([{,]\s*)(\w+)(\s*):/g, '$1"$2":'); // Добавляем кавычки к ключам если их нет
            
            result = JSON.parse(fixedJson);
            console.log("4.4. Успешно распознано (метод 3):", result);
          } else {
            throw new Error("JSON не найден в ответе");
          }
        } catch (e3: any) {
          console.error("4.5. Ошибка парсинга (метод 3):", e3.message);
          console.error("4.6. Полный ответ ИИ:", aiResponse);
          console.error("4.7. Извлеченный JSON (если был):", parsedJson);
          
          // Возвращаем дефолтные значения вместо ошибки
          console.log("4.8. Используем дефолтные значения (не удалось распарсить JSON)");
          console.log("4.9. Первые 1000 символов ответа:", aiResponse.substring(0, 1000));
          result = {
            full_name: "",
            passport_number: "",
            nationality: "",
            date_of_birth: "",
            home_address: "",
          };
        }
      }
    }
    
    // Валидация результата
    if (!result || typeof result !== 'object') {
      console.error("5. Результат не является объектом:", result);
      result = {
        full_name: "",
        passport_number: "",
        nationality: "",
        date_of_birth: "",
        home_address: "",
      };
    }
    
    console.log("6. Финальный результат:", result);
    
    return NextResponse.json({
      full_name: result.full_name || "",
      passport_number: result.passport_number || "",
      nationality: result.nationality || "",
      date_of_birth: result.date_of_birth || "",
      home_address: result.home_address || "",
    });

  } catch (error: any) {
    console.error("🔥 ОШИБКА при сканировании паспорта:", error);
    console.error("Детали ошибки:", error.message);
    console.error("Stack:", error.stack);
    
    // Более информативные сообщения об ошибках
    let errorMessage = "Failed to scan passport";
    if (error.message?.includes("API key") || error.message?.includes("authentication")) {
      errorMessage = "Invalid OpenAI API key. Please check your .env.local file.";
    } else if (error.message?.includes("rate limit")) {
      errorMessage = "OpenAI API rate limit exceeded. Please try again later.";
    } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
      errorMessage = "Network error. Please check your internet connection and OPENAI_BASE_URL.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.message,
        type: error.constructor?.name || "Unknown"
      },
      { status: 500 }
    );
  }
}


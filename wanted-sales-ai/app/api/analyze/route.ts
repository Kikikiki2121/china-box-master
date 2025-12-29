import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Настройка клиента для работы с твоим прокси
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    // Проверяем наличие API ключа
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key_here") {
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Please add your API key to .env.local file." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get("image") as File;

    if (!imageFile) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Конвертируем File в base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");
    const imageUrl = `data:image/jpeg;base64,${base64Image}`;

    console.log("1. Отправляем запрос к Gemini...");

    const completion = await openai.chat.completions.create({
      model: "gemini-2.5-pro-preview-p", // Твоя модель
      messages: [
        {
          role: "system",
          content: `You are a motorcycle identification expert. Analyze the image and return ONLY a valid JSON object. NO markdown, NO explanations, NO text before or after JSON.

CRITICAL: Your response must be ONLY this JSON format, nothing else:
{"brand":"BrandName","model":"ModelName","color":"ColorName","year":"Year","tuning":"Description"}

Rules:
- brand: Motorcycle brand in English (e.g., "Yamaha", "Honda", "Kawasaki", "Suzuki", "Ducati", "BMW")
- model: Model name in English (e.g., "R1", "CBR", "Ninja", "GSX-R")
- color: Color in Russian (e.g., "Красный", "Черный", "Синий", "Белый")
- year: Approximate year as number or string (e.g., 2020, "2020", "2015-2020")
- tuning: Brief description of modifications or features in Russian, or empty string if none

If you cannot identify something, use "Unknown" for brand/model, "Неизвестно" for color, empty string for tuning.

IMPORTANT: Return ONLY the JSON object, no markdown code blocks, no backticks, no explanations.`
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Identify this motorcycle. Return ONLY JSON: {\"brand\":\"...\",\"model\":\"...\",\"color\":\"...\",\"year\":\"...\",\"tuning\":\"...\"}" 
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl, // Передаем картинку
                detail: "high"
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1, // Низкая температура для более точных ответов
    });

    const aiResponse = completion.choices[0]?.message?.content || "{}";
    console.log("2. Ответ от ИИ (сырой, ПОЛНЫЙ):", aiResponse);
    console.log("2.1. Длина ответа:", aiResponse.length);
    console.log("2.2. Первые 500 символов:", aiResponse.substring(0, 500));
    console.log("2.3. Последние 200 символов:", aiResponse.substring(Math.max(0, aiResponse.length - 200)));

    // Очистка ответа от возможного мусора (```json ... ```)
    let cleanJson = aiResponse
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/^[^{]*/, "") // Убираем текст до первой {
      .replace(/[^}]*$/, "") // Убираем текст после последней }
      .trim();
    
    // Если после очистки ничего не осталось, пробуем найти JSON в исходном тексте
    if (!cleanJson || !cleanJson.startsWith("{")) {
      console.log("2.3. Пробуем найти JSON в исходном тексте...");
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanJson = jsonMatch[0];
        console.log("2.4. Найден JSON:", cleanJson.substring(0, 200));
      }
    }
    
    let result;
    try {
      result = JSON.parse(cleanJson);
      console.log("3. Успешно распознано:", result);
    } catch (e: any) {
      console.error("3.1. Ошибка парсинга JSON:", e.message);
      console.error("3.2. Что пытались парсить:", cleanJson.substring(0, 500));
      
      // Пробуем более агрессивную очистку
      try {
        // Ищем JSON объект с учетом вложенности
        let jsonStart = aiResponse.indexOf('{');
        if (jsonStart !== -1) {
          let braceCount = 0;
          let jsonEnd = -1;
          for (let i = jsonStart; i < aiResponse.length; i++) {
            if (aiResponse[i] === '{') braceCount++;
            if (aiResponse[i] === '}') {
              braceCount--;
              if (braceCount === 0) {
                jsonEnd = i + 1;
                break;
              }
            }
          }
          if (jsonEnd > jsonStart) {
            const extractedJson = aiResponse.substring(jsonStart, jsonEnd);
            result = JSON.parse(extractedJson);
            console.log("3.3. Успешно распарсили после извлечения JSON:", result);
          } else {
            throw new Error("Не найдена закрывающая скобка");
          }
        } else {
          throw new Error("Не найдена открывающая скобка");
        }
      } catch (e2: any) {
        console.error("3.4. Ошибка при агрессивной очистке:", e2.message);
        // Если все еще не работает, возвращаем дефолтные значения
        console.error("3.5. Используем дефолтные значения");
        result = {
          brand: "Неизвестно",
          model: "Неизвестно",
          color: "Неизвестно",
          tuning: "Не удалось распознать"
        };
      }
    }
    
    // Если result все еще не определен (на всякий случай)
    if (!result) {
      console.error("3.6. Result не определен, используем дефолтные значения");
      result = {
        brand: "Неизвестно",
        model: "Неизвестно",
        color: "Неизвестно",
        tuning: "Ошибка обработки"
      };
    }
    
    // Преобразуем в формат, который ожидает фронтенд
    return NextResponse.json({
      brand: result.brand || "Неизвестно",
      model: result.model || "Неизвестно",
      color: result.color || "Неизвестно",
      modifications: result.tuning ? [result.tuning] : [],
    });

  } catch (error: any) {
    console.error("🔥 ОШИБКА:", error);
    return NextResponse.json(
      { 
        brand: "Ошибка", 
        model: "Попробуй снова", 
        color: "См. терминал", 
        modifications: [],
        error: error.message 
      },
      { status: 500 }
    );
  }
}

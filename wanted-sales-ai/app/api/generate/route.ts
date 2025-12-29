import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
})

const stylePrompts = {
  aggressive: "Напиши агрессивное, энергичное описание с акцентом на мощность, скорость и адреналин. Используй яркие, эмоциональные выражения.",
  calm: "Напиши сдержанное, профессиональное описание. Фокус на технических характеристиках и качестве. Деловой стиль.",
  urgent: "Напиши описание, подчеркивающее срочность продажи и выгодную цену. Создай ощущение, что это отличная возможность для покупателя.",
}

export async function POST(request: NextRequest) {
  try {
    // Проверяем наличие API ключа
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key_here") {
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Please add your API key to .env.local file." },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { analysis, year, mileage, price, currency, city, condition, selfPickup, documents, style } = body

    if (!analysis || !year || !mileage || !price || !style || !city || !condition) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const stylePrompt = stylePrompts[style as keyof typeof stylePrompts] || stylePrompts.calm
    
    const conditionText = {
      excellent: "Отличное",
      good: "Хорошее",
      satisfactory: "Удовлетворительное"
    }[condition] || condition

    // Генерируем описание на русском
    const response = await openai.chat.completions.create({
      model: "gemini-2.5-pro-preview-p",
      messages: [
        {
          role: "system",
          content: `Ты обычный человек, который продает свой мотоцикл. Напиши объявление так, как бы ты написал его сам - естественно, по-человечески, без пафоса и рекламных штампов. ${stylePrompt}

КРИТИЧЕСКИ ВАЖНО - ОБЯЗАТЕЛЬНО ВКЛЮЧИ ВСЕ ЭТИ ДЕТАЛИ В ТЕКСТ ОБЪЯВЛЕНИЯ:

1. ЗАГОЛОВОК (1-2 строки):
   - Яркий, эмоциональный (например, "ПОКОРИТЕЛЬ ГОРОДСКИХ ДЖУНГЛЕЙ")

2. ОСНОВНАЯ ИНФОРМАЦИЯ (обязательно упомяни в тексте):
   - Марка: ${analysis.brand}
   - Модель: ${analysis.model}
   - Год: ${year}
   - Пробег: ${mileage} км
   - Состояние: ${conditionText}
   - Цвет: ${analysis.color}
   ${analysis.modifications.length > 0 ? `- Модификации: ${analysis.modifications.join(", ")}` : ""}

3. УСЛОВИЯ ПРОДАЖИ (ОБЯЗАТЕЛЬНО ВКЛЮЧИ В ТЕКСТ ОБЪЯВЛЕНИЯ!):
   - ЦЕНА: ${price} ${currency} - ОБЯЗАТЕЛЬНО напиши цену в тексте, например: "Продаю за ${price} ${currency}" или "Цена: ${price} ${currency}"
   ${city ? `- ГОРОД: ${city} - ОБЯЗАТЕЛЬНО напиши город в тексте, например: "Нахожусь в ${city}" или "Город: ${city}"` : ""}
   ${selfPickup ? `- САМОВЫВОЗ: возможен - ОБЯЗАТЕЛЬНО напиши в тексте, например: "Самовывоз возможен" или "Можно забрать самовывозом"` : `- ДОСТАВКА: возможна - ОБЯЗАТЕЛЬНО напиши в тексте, например: "Возможна доставка" или "Доставка по договоренности"`}
   ${documents ? `- ДОКУМЕНТЫ: все в наличии - ОБЯЗАТЕЛЬНО напиши в тексте, например: "Все документы в наличии" или "Документы готовы к переоформлению"` : `- ДОКУМЕНТЫ: уточнить - ОБЯЗАТЕЛЬНО напиши в тексте, например: "Документы уточнить при звонке"`}

ВАЖНО: Все эти детали (цена, город, самовывоз/доставка, документы) должны быть НЕПРЕМЕННО включены в сам текст объявления, а не просто перечислены списком!

ТРЕБОВАНИЯ:
- Ровно 400 слов (не больше, не меньше)
- НЕ ОБРЕЗАЙ ТЕКСТ! ПИШИ ПОЛНОСТЬЮ ДО КОНЦА!
- НЕ ЗАКАНЧИВАЙ РАНЬШЕ ВРЕМЕНИ!
- Пиши как живой человек - просто, понятно, без лишнего пафоса
- Используй разговорный стиль, но грамотно
- ОБЯЗАТЕЛЬНО включи ВСЕ указанные детали (цена, город, самовывоз/доставка, документы)
- Структурируй текст абзацами
- Без эмодзи
- Пиши так, как будто это реальный человек продает свой байк
- ЗАВЕРШИ ОПИСАНИЕ ПОЛНОСТЬЮ - не обрывай на полуслове!

Верни ТОЛЬКО текст объявления, ровно 400 слов. НЕ ОБРЕЗАЙ!`,
        },
        {
          role: "user",
          content: `Напиши объявление для продажи ${analysis.brand} ${analysis.model} ${year} года. 

ОБЯЗАТЕЛЬНО ВКЛЮЧИ ВСЕ ДЕТАЛИ:
- Пробег: ${mileage} км
- Состояние: ${conditionText}
- Цвет: ${analysis.color}
- ЦЕНА: ${price} ${currency} (ОБЯЗАТЕЛЬНО укажи в тексте!)
${city ? `- ГОРОД: ${city} (ОБЯЗАТЕЛЬНО укажи!)` : ""}
${selfPickup ? "- САМОВЫВОЗ: возможен (ОБЯЗАТЕЛЬНО упомяни!)" : "- ДОСТАВКА: возможна (упомяни)"}
${documents ? "- ДОКУМЕНТЫ: в наличии (ОБЯЗАТЕЛЬНО упомяни!)" : "- ДОКУМЕНТЫ: уточнить (упомяни)"}
${analysis.modifications.length > 0 ? `- Модификации: ${analysis.modifications.join(", ")}` : ""}

Напиши ровно 400 слов, естественно, как обычный человек. 

КРИТИЧЕСКИ ВАЖНО:
- НЕ ОБРЕЗАЙ ТЕКСТ! ПИШИ ПОЛНОСТЬЮ ДО КОНЦА!
- Обязательно включи цену, город, самовывоз/доставку и документы в текст объявления
- Заверши описание полностью - не обрывай на полуслове
- Убедись, что текст содержит ровно 400 слов и завершен`,
        },
      ],
      max_tokens: 2500,
      temperature: 0.7,
    })

    const russianDescription = response.choices[0]?.message?.content || ""

    // Генерируем переводы
    const [englishResponse, vietnameseResponse] = await Promise.all([
      openai.chat.completions.create({
        model: "gemini-2.5-pro-preview-p",
        messages: [
          {
            role: "system",
            content: "Ты профессиональный переводчик. Переведи объявление о продаже мотоцикла на английский язык, сохраняя стиль и структуру.",
          },
          {
            role: "user",
            content: russianDescription,
          },
        ],
        max_tokens: 800,
      }),
      openai.chat.completions.create({
        model: "gemini-2.5-pro-preview-p",
        messages: [
          {
            role: "system",
            content: "Ты профессиональный переводчик. Переведи объявление о продаже мотоцикла на вьетнамский язык, сохраняя стиль и структуру.",
          },
          {
            role: "user",
            content: russianDescription,
          },
        ],
        max_tokens: 800,
      }),
    ])

    const englishDescription = englishResponse.choices[0]?.message?.content || ""
    const vietnameseDescription = vietnameseResponse.choices[0]?.message?.content || ""

    return NextResponse.json({
      russian: russianDescription,
      english: englishDescription,
      vietnamese: vietnameseDescription,
    })
  } catch (error: any) {
    console.error("Generation error:", error)
    
    // Более информативные сообщения об ошибках
    let errorMessage = "Failed to generate description"
    if (error.message?.includes("API key") || error.message?.includes("authentication")) {
      errorMessage = "Invalid OpenAI API key. Please check your .env.local file."
    } else if (error.message?.includes("rate limit")) {
      errorMessage = "OpenAI API rate limit exceeded. Please try again later."
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}


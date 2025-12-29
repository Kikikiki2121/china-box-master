"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, ArrowRight, ArrowLeft, Loader2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"

type Step = "photo" | "analyzing" | "details" | "style" | "generating"

interface BikeAnalysis {
  brand: string
  model: string
  color: string
  modifications: string[]
}

export default function SellPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("photo")
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<BikeAnalysis | null>(null)
  const [year, setYear] = useState("")
  const [mileage, setMileage] = useState("")
  const [price, setPrice] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [city, setCity] = useState("")
  const [condition, setCondition] = useState<"excellent" | "good" | "satisfactory" | "">("")
  const [selfPickup, setSelfPickup] = useState(false)
  const [documents, setDocuments] = useState(false)
  const [style, setStyle] = useState<"aggressive" | "calm" | "urgent" | "">("")
  const [loading, setLoading] = useState(false)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAnalyze = async () => {
    if (!photo) return

    setStep("analyzing")
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("image", photo)

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || "Failed to analyze image"
        
        // Проверяем, не связана ли ошибка с API ключом
        if (errorMessage.includes("API key") || errorMessage.includes("authentication")) {
          throw new Error("Неверный или отсутствующий OpenAI API ключ. Проверьте файл .env.local")
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setAnalysis(data)
      setStep("details")
    } catch (error: any) {
      console.error("Analysis error:", error)
      const message = error.message || "Ошибка при анализе фото. Попробуйте еще раз."
      alert(message)
      setStep("photo")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!analysis || !year || !mileage || !price || !style || !city || !condition) return

    setStep("generating")
    setLoading(true)

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysis,
          year,
          mileage,
          price,
          currency,
          city,
          condition,
          selfPickup,
          documents,
          style,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || "Failed to generate description"
        
        // Проверяем, не связана ли ошибка с API ключом
        if (errorMessage.includes("API key") || errorMessage.includes("authentication")) {
          throw new Error("Неверный или отсутствующий OpenAI API ключ. Проверьте файл .env.local")
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      const id = Date.now().toString()

      // Сохраняем генерацию
      const generation = {
        id,
        brand: analysis.brand,
        model: analysis.model,
        createdAt: new Date().toISOString(),
        ...data,
      }

      const saved = localStorage.getItem("wanted-sales-generations")
      const generations = saved ? JSON.parse(saved) : []
      generations.unshift(generation)
      localStorage.setItem("wanted-sales-generations", JSON.stringify(generations))

      router.push(`/result/${id}`)
    } catch (error: any) {
      console.error("Generation error:", error)
      const message = error.message || "Ошибка при генерации описания. Попробуйте еще раз."
      
      // Проверяем, не связана ли ошибка с API ключом
      if (message.includes("API key") || message.includes("authentication")) {
        alert("Неверный или отсутствующий OpenAI API ключ. Проверьте файл .env.local")
      } else {
        alert(message)
      }
      
      setStep("style")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {["Фото", "Анализ", "Детали", "Стиль"].map((label, index) => {
              const steps: Step[] = ["photo", "analyzing", "details", "style"]
              const currentIndex = steps.indexOf(step)
              const isActive = index <= currentIndex
              const isCurrent = index === currentIndex

              return (
                <div key={label} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                        isActive
                          ? "bg-primary border-primary text-black"
                          : "border-gray-600 text-gray-600"
                      } ${isCurrent ? "animate-glow" : ""}`}
                    >
                      {index + 1}
                    </div>
                    <span
                      className={`text-xs mt-2 ${
                        isActive ? "text-primary" : "text-gray-600"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {index < 3 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
                        isActive ? "bg-primary" : "bg-gray-600"
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step 1: Photo Upload */}
        {step === "photo" && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">Загрузите фото</CardTitle>
              <CardDescription>
                Загрузите фото вашего мотоцикла для анализа
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {photoPreview ? (
                <div className="space-y-4">
                  <div className="relative w-full h-64 rounded-lg overflow-hidden border border-primary/50">
                    <Image
                      src={photoPreview}
                      alt="Bike preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPhoto(null)
                        setPhotoPreview(null)
                      }}
                      className="flex-1"
                    >
                      Выбрать другое
                    </Button>
                    <Button
                      onClick={handleAnalyze}
                      className="flex-1 bg-primary text-black"
                    >
                      Анализировать
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="block">
                  <div className="border-2 border-dashed border-primary/50 rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <p className="text-lg mb-2">Нажмите для загрузки фото</p>
                    <p className="text-sm text-gray-500">
                      PNG, JPG до 10MB
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Analyzing */}
        {step === "analyzing" && (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
              <p className="text-xl">Анализируем фото...</p>
              <p className="text-gray-500 mt-2">
                Определяем марку, модель и характеристики
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Details Form */}
        {step === "details" && analysis && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">Детали мотоцикла</CardTitle>
              <CardDescription>
                Проверьте и дополните информацию о вашем байке
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Марка</Label>
                  <Input value={analysis.brand} disabled className="mt-1" />
                </div>
                <div>
                  <Label>Модель</Label>
                  <Input value={analysis.model} disabled className="mt-1" />
                </div>
              </div>

              <div>
                <Label>Цвет</Label>
                <Input value={analysis.color} disabled className="mt-1" />
              </div>

              {analysis.modifications.length > 0 && (
                <div>
                  <Label>Модификации</Label>
                  <div className="mt-1 p-3 bg-secondary rounded-md">
                    <ul className="list-disc list-inside text-sm text-gray-400">
                      {analysis.modifications.map((mod, i) => (
                        <li key={i}>{mod}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="year">Год выпуска *</Label>
                <Input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2020"
                  className="mt-1"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>

              <div>
                <Label htmlFor="mileage">Пробег (км) *</Label>
                <Input
                  id="mileage"
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder="15000"
                  className="mt-1"
                  min="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Цена *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="5000"
                    className="mt-1"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Валюта *</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="currency" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="RUB">RUB (₽)</SelectItem>
                      <SelectItem value="UAH">UAH (₴)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="city">Город продажи *</Label>
                <Input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Москва"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="condition">Состояние *</Label>
                <Select value={condition} onValueChange={(v: any) => setCondition(v)}>
                  <SelectTrigger id="condition" className="mt-1">
                    <SelectValue placeholder="Выберите состояние" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Отличное</SelectItem>
                    <SelectItem value="good">Хорошее</SelectItem>
                    <SelectItem value="satisfactory">Удовлетворительное</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Дополнительная информация</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="selfPickup"
                    checked={selfPickup}
                    onCheckedChange={(checked) => setSelfPickup(checked === true)}
                  />
                  <Label htmlFor="selfPickup" className="cursor-pointer text-sm font-normal">
                    Самовывоз
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="documents"
                    checked={documents}
                    onCheckedChange={(checked) => setDocuments(checked === true)}
                  />
                  <Label htmlFor="documents" className="cursor-pointer text-sm font-normal">
                    Есть документы
                  </Label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep("photo")}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Назад
                </Button>
                <Button
                  onClick={() => setStep("style")}
                  disabled={!year || !mileage || !price || !city || !condition}
                  className="flex-1 bg-primary text-black"
                >
                  Далее
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Style Selection */}
        {step === "style" && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">Выберите стиль</CardTitle>
              <CardDescription>
                Какой стиль описания вам нужен?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                onClick={() => setStyle("aggressive")}
                className={`w-full p-6 text-left rounded-lg border-2 transition-all ${
                  style === "aggressive"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <h3 className="text-xl font-bold mb-2">Агрессивный</h3>
                <p className="text-gray-400 text-sm">
                  Энергичное описание с акцентом на мощность и скорость
                </p>
              </button>

              <button
                onClick={() => setStyle("calm")}
                className={`w-full p-6 text-left rounded-lg border-2 transition-all ${
                  style === "calm"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <h3 className="text-xl font-bold mb-2">Спокойный</h3>
                <p className="text-gray-400 text-sm">
                  Сдержанное профессиональное описание
                </p>
              </button>

              <button
                onClick={() => setStyle("urgent")}
                className={`w-full p-6 text-left rounded-lg border-2 transition-all ${
                  style === "urgent"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <h3 className="text-xl font-bold mb-2">Срочный</h3>
                <p className="text-gray-400 text-sm">
                  Подчеркивает срочность продажи и выгодную цену
                </p>
              </button>

              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep("details")}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Назад
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={!style || loading}
                  className="flex-1 bg-primary text-black"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Генерируем...
                    </>
                  ) : (
                    <>
                      Сгенерировать
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generating */}
        {step === "generating" && (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
              <p className="text-xl">Генерируем описание...</p>
              <p className="text-gray-500 mt-2">
                Создаем уникальное объявление для вашего байка
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}


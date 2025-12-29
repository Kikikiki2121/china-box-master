"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Check, ArrowLeft, Home } from "lucide-react"
import Link from "next/link"

interface Generation {
  id: string
  brand: string
  model: string
  createdAt: string
  russian: string
}

export default function ResultPage() {
  const params = useParams()
  const router = useRouter()
  const [generation, setGeneration] = useState<Generation | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("wanted-sales-generations")
    if (saved) {
      try {
        const generations: Generation[] = JSON.parse(saved)
        const found = generations.find((g) => g.id === params.id)
        if (found) {
          setGeneration(found)
        } else {
          router.push("/")
        }
      } catch (e) {
        console.error("Failed to load generation", e)
        router.push("/")
      }
    } else {
      router.push("/")
    }
  }, [params.id, router])

  const handleCopy = async () => {
    if (!generation) return
    try {
      await navigator.clipboard.writeText(generation.russian)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  if (!generation) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">
              {generation.brand} {generation.model}
            </h1>
            <p className="text-gray-400 text-sm">
              {new Date(generation.createdAt).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="outline" size="icon">
                <Home className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => router.back()}
              size="icon"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Description */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Описание</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-secondary rounded-lg p-6 min-h-[200px]">
              <pre className="whitespace-pre-wrap text-sm font-sans text-foreground">
                {generation.russian}
              </pre>
            </div>
            <Button
              onClick={handleCopy}
              className="w-full mt-4 bg-primary text-black hover:bg-primary/90"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Скопировано!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Копировать
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Link href="/sell" className="flex-1">
            <Button className="w-full bg-primary text-black hover:bg-primary/90">
              Создать новое объявление
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}


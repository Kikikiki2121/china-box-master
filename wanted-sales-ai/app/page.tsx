"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bike, Upload, Download, Loader2 } from "lucide-react"
import jsPDF from "jspdf"

interface PassportData {
  full_name: string
  passport_number: string
  nationality: string
  date_of_birth: string
  home_address: string
}

interface RentalDetails {
  // Client fields (pre-filled from passport, editable)
  full_name: string
  passport_number: string
  nationality: string
  date_of_birth: string
  home_address: string
  // Bike fields
  bike_model: string
  plate_number: string
  price_vnd: string
  price_usd: string
  deposit: string
  // Dates
  start_date: string
  end_date: string
}

export default function HomePage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [passportImage, setPassportImage] = useState<File | null>(null)
  const [passportImagePreview, setPassportImagePreview] = useState<string>("")
  const [isScanning, setIsScanning] = useState(false)
  const [passportData, setPassportData] = useState<PassportData>({
    full_name: "",
    passport_number: "",
    nationality: "",
    date_of_birth: "",
    home_address: "",
  })
  const [rentalDetails, setRentalDetails] = useState<RentalDetails>({
    full_name: "",
    passport_number: "",
    nationality: "",
    date_of_birth: "",
    home_address: "",
    bike_model: "Honda Click",
    plate_number: "",
    price_vnd: "",
    price_usd: "",
    deposit: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
  })
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [error, setError] = useState<string>("")

  // Debug: отслеживаем изменения rentalDetails
  useEffect(() => {
    console.log("📝 rentalDetails обновлен:", rentalDetails)
  }, [rentalDetails])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Очищаем предыдущую ошибку
      setError("")

      // Проверка типа файла
      if (!file.type.startsWith("image/")) {
        setError("Пожалуйста, выберите файл изображения")
        return
      }

      // Проверка размера файла (максимум 10MB)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        setError(`Размер файла превышает 10MB. Текущий размер: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
        return
      }

      setPassportImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPassportImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleScanPassport = async () => {
    if (!passportImage) return

    setIsScanning(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("image", passportImage)

      const response = await fetch("/api/scan-passport", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      console.log("📋 Получены данные от API:", data)

      if (!response.ok) {
        // Показываем детальную ошибку
        const errorMessage = data.error || "Failed to scan passport"
        const errorDetails = data.details ? `\n\nДетали: ${data.details}` : ""
        setError(`${errorMessage}${errorDetails}`)
        console.error("❌ API Error:", data)
        return
      }

      // Проверяем, что получили данные
      if (data.error) {
        setError(`${data.error}${data.details ? `\n\n${data.details}` : ""}`)
        return
      }

      // Проверяем наличие данных
      const passportInfo = {
        full_name: data.full_name || "",
        passport_number: data.passport_number || "",
        nationality: data.nationality || "",
        date_of_birth: data.date_of_birth || "",
        home_address: data.home_address || "",
      }

      console.log("✅ Обработанные данные паспорта:", passportInfo)

      // Проверяем, есть ли хотя бы какие-то данные
      const hasData = passportInfo.full_name || passportInfo.passport_number || passportInfo.nationality
      
      if (!hasData) {
        console.warn("⚠️ Данные паспорта пустые, возможно ошибка парсинга")
        setError("Не удалось извлечь данные из паспорта. Пожалуйста, заполните форму вручную.")
      } else {
        setError("")
      }

      setPassportData(passportInfo)
      
      // Pre-fill rental details with passport data
      setRentalDetails((prev) => {
        const updated = {
          ...prev,
          ...passportInfo,
        }
        console.log("🔄 Обновление rentalDetails:", updated)
        return updated
      })

      setStep(2)
    } catch (error: any) {
      console.error("Error scanning passport:", error)
      const errorMessage = error.message || "Неизвестная ошибка"
      setError(`Ошибка при сканировании паспорта: ${errorMessage}\n\nПроверьте консоль браузера для деталей.`)
    } finally {
      setIsScanning(false)
    }
  }

  const handleGeneratePDF = () => {
    setIsGeneratingPDF(true)
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      const contentWidth = pageWidth - 2 * margin
      let yPos = margin

      // Helper function to add section with background
      const addSection = (title: string, y: number) => {
        doc.setFillColor(240, 240, 240)
        doc.rect(margin, y - 5, contentWidth, 8, "F")
        doc.setFontSize(11)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(0, 0, 0)
        doc.text(title, margin + 3, y + 2)
        return y + 10
      }

      // Helper function to add field
      const addField = (label: string, value: string, y: number, labelWidth: number = 60) => {
        doc.setFontSize(9)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(60, 60, 60)
        doc.text(label, margin + 3, y)
        
        doc.setFont("helvetica", "normal")
        doc.setTextColor(0, 0, 0)
        const valueX = margin + labelWidth
        const maxWidth = pageWidth - margin - valueX
        const lines = doc.splitTextToSize(value || "_________________", maxWidth)
        doc.text(lines, valueX, y)
        return y + Math.max(6, lines.length * 5)
      }

      // Title Section
      doc.setFontSize(18)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(0, 0, 0)
      doc.text("MOTORBIKE RENTAL AGREEMENT", pageWidth / 2, yPos, { align: "center" })
      yPos += 7
      doc.setFontSize(16)
      doc.text("HỢP ĐỒNG CHO THUÊ XE MÁY", pageWidth / 2, yPos, { align: "center" })
      yPos += 12

      // Contract Number and Date
      const contractDate = new Date().toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      })
      const contractNumber = `CONTRACT-${Date.now().toString().slice(-6)}`
      
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 100, 100)
      doc.text(`Contract No. / Số Hợp Đồng: ${contractNumber}`, margin, yPos)
      doc.text(`Date / Ngày: ${contractDate}`, pageWidth - margin, yPos, { align: "right" })
      yPos += 10

      // Thick line separator
      doc.setLineWidth(1)
      doc.setDrawColor(0, 0, 0)
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 12

      // Preamble
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0, 0, 0)
      const preamble = "This agreement is made between the RENTAL COMPANY (Owner) and the CLIENT (Renter) for the rental of a motorbike."
      const preambleVi = "Hợp đồng này được ký kết giữa CÔNG TY CHO THUÊ (Chủ sở hữu) và KHÁCH HÀNG (Người thuê) cho việc thuê xe máy."
      const preambleLines = doc.splitTextToSize(preamble, contentWidth)
      doc.text(preambleLines, margin, yPos)
      yPos += preambleLines.length * 5 + 3
      const preambleViLines = doc.splitTextToSize(preambleVi, contentWidth)
      doc.text(preambleViLines, margin, yPos)
      yPos += preambleViLines.length * 5 + 8

      // Client Information Section
      yPos = addSection("1. CLIENT INFORMATION / THÔNG TIN KHÁCH HÀNG", yPos)
      
      yPos = addField("Full Name / Họ và Tên:", rentalDetails.full_name, yPos, 70)
      yPos = addField("Passport Number / Số Hộ Chiếu:", rentalDetails.passport_number, yPos, 70)
      yPos = addField("Nationality / Quốc Tịch:", rentalDetails.nationality, yPos, 70)
      yPos = addField("Date of Birth / Ngày Sinh:", rentalDetails.date_of_birth, yPos, 70)
      yPos = addField("Home Address / Địa Chỉ:", rentalDetails.home_address, yPos, 70)
      yPos += 8

      // Bike Information Section
      yPos = addSection("2. BIKE INFORMATION / THÔNG TIN XE MÁY", yPos)
      
      yPos = addField("Model / Mẫu Xe:", rentalDetails.bike_model, yPos, 70)
      yPos = addField("Plate Number / Biển Số:", rentalDetails.plate_number, yPos, 70)
      yPos += 8

      // Rental Terms Section
      yPos = addSection("3. RENTAL TERMS / ĐIỀU KHOẢN THUÊ", yPos)
      
      yPos = addField("Start Date / Ngày Bắt Đầu:", rentalDetails.start_date, yPos, 70)
      yPos = addField("End Date / Ngày Kết Thúc:", rentalDetails.end_date, yPos, 70)
      yPos += 5
      
      yPos = addField("Daily Price (VND) / Giá Ngày (VND):", rentalDetails.price_vnd, yPos, 70)
      yPos = addField("Daily Price (USD) / Giá Ngày (USD):", rentalDetails.price_usd, yPos, 70)
      yPos = addField("Security Deposit / Tiền Đặt Cọc:", rentalDetails.deposit, yPos, 70)
      yPos += 8

      // Terms and Conditions
      yPos = addSection("4. TERMS AND CONDITIONS / ĐIỀU KHOẢN VÀ ĐIỀU KIỆN", yPos)
      
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0, 0, 0)
      const terms = [
        "• The renter is responsible for any damage or loss of the motorbike.",
        "• The security deposit will be refunded upon return of the motorbike in good condition.",
        "• The renter must have a valid driving license.",
        "• Insurance coverage is the responsibility of the renter.",
      ]
      const termsVi = [
        "• Người thuê chịu trách nhiệm về mọi thiệt hại hoặc mất mát của xe máy.",
        "• Tiền đặt cọc sẽ được hoàn lại khi trả xe trong tình trạng tốt.",
        "• Người thuê phải có bằng lái xe hợp lệ.",
        "• Bảo hiểm là trách nhiệm của người thuê.",
      ]
      
      terms.forEach((term, i) => {
        const lines = doc.splitTextToSize(term, contentWidth - 10)
        doc.text(lines, margin + 5, yPos)
        yPos += lines.length * 4.5
      })
      yPos += 3
      termsVi.forEach((term, i) => {
        const lines = doc.splitTextToSize(term, contentWidth - 10)
        doc.text(lines, margin + 5, yPos)
        yPos += lines.length * 4.5
      })
      yPos += 10

      // Check if we need a new page
      if (yPos > pageHeight - 60) {
        doc.addPage()
        yPos = margin
      }

      // Signature Section
      yPos = addSection("5. SIGNATURES / CHỮ KÝ", yPos)
      yPos += 5

      // Client Signature (Left)
      const signatureY = yPos
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0, 0, 0)
      doc.text("CLIENT / KHÁCH HÀNG", margin, signatureY)
      yPos += 8
      
      // Signature line for client
      doc.setLineWidth(0.5)
      doc.line(margin, yPos, margin + (contentWidth / 2) - 10, yPos)
      yPos += 6
      doc.setFontSize(8)
      doc.text(rentalDetails.full_name || "_________________", margin, yPos)
      yPos += 5
      doc.setFontSize(7)
      doc.setTextColor(100, 100, 100)
      doc.text("Signature / Chữ Ký", margin, yPos)
      yPos += 10
      doc.setFontSize(7)
      doc.setTextColor(0, 0, 0)
      doc.text(`Date / Ngày: ${contractDate}`, margin, yPos)

      // Owner/Rental Company Signature (Right)
      yPos = signatureY
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0, 0, 0)
      doc.text("OWNER / CHỦ SỞ HỮU", margin + (contentWidth / 2) + 10, yPos)
      yPos += 8
      
      // Signature line for owner
      doc.setLineWidth(0.5)
      doc.line(margin + (contentWidth / 2) + 10, yPos, pageWidth - margin, yPos)
      yPos += 6
      doc.setFontSize(8)
      doc.text("_________________", margin + (contentWidth / 2) + 10, yPos)
      yPos += 5
      doc.setFontSize(7)
      doc.setTextColor(100, 100, 100)
      doc.text("Signature / Chữ Ký", margin + (contentWidth / 2) + 10, yPos)
      yPos += 10
      doc.setFontSize(7)
      doc.setTextColor(0, 0, 0)
      doc.text(`Date / Ngày: ${contractDate}`, margin + (contentWidth / 2) + 10, yPos)

      // Footer
      const footerY = pageHeight - 15
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text("This is a computer-generated document. / Đây là tài liệu được tạo tự động.", pageWidth / 2, footerY, { align: "center" })

      // Save PDF
      const fileName = `rental_agreement_${rentalDetails.passport_number || contractNumber}.pdf`
      doc.save(fileName)
      
      setStep(3)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Ошибка при генерации PDF. Попробуйте еще раз.")
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 mt-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bike className="h-10 w-10 text-gray-800" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              RentalFlow
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Генератор договоров аренды байков
          </p>
        </div>

        {/* Step 1: Passport Upload */}
        {step === 1 && (
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-2xl">Шаг 1: Загрузка фото паспорта</CardTitle>
              <CardDescription>
                Загрузите фотографию паспорта клиента для автоматического извлечения данных
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                {passportImagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={passportImagePreview}
                      alt="Passport preview"
                      className="max-w-full max-h-96 mx-auto rounded-lg shadow-md"
                    />
                    <p className="text-sm text-gray-600">{passportImage?.name}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-16 w-16 mx-auto text-gray-400" />
                    <div>
                      <Label htmlFor="passport-upload" className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-700 font-medium">
                          Нажмите для загрузки
                        </span>
                        <span className="text-gray-500"> или перетащите файл сюда</span>
                      </Label>
                      <Input
                        id="passport-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, JPEG до 10MB</p>
                  </div>
                )}
              </div>

              {passportImage && (
                <>
            <Button
                    onClick={handleScanPassport}
                    disabled={isScanning}
                    className="w-full h-12 text-lg"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Сканирование...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-5 w-5" />
                        Сканировать паспорт
                      </>
                    )}
            </Button>
                  {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800 font-medium mb-1">Ошибка:</p>
                      <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
        </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Rental Details Form */}
        {step === 2 && (
          <Card className="bg-white border-gray-200">
                    <CardHeader>
              <CardTitle className="text-2xl">Шаг 2: Детали аренды</CardTitle>
                      <CardDescription>
                Заполните информацию о клиенте и байке. {passportData.full_name || passportData.passport_number ? "Данные из паспорта предзаполнены." : "Если данные из паспорта не загрузились, заполните вручную."}
                      </CardDescription>
                    </CardHeader>
            <CardContent className="space-y-6">
              {/* Client Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  Информация о клиенте
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-gray-700">
                      Полное имя
                      {passportData.full_name && (
                        <span className="ml-2 text-xs text-green-600">✓ Загружено</span>
                      )}
                    </Label>
                    <Input
                      id="full_name"
                      value={rentalDetails.full_name}
                      onChange={(e) =>
                        setRentalDetails({ ...rentalDetails, full_name: e.target.value })
                      }
                      className="bg-white text-gray-900 border-gray-300 focus:border-blue-500"
                      placeholder="Введите полное имя"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passport_number" className="text-gray-700">
                      Номер паспорта
                      {passportData.passport_number && (
                        <span className="ml-2 text-xs text-green-600">✓ Загружено</span>
                      )}
                    </Label>
                    <Input
                      id="passport_number"
                      value={rentalDetails.passport_number}
                      onChange={(e) =>
                        setRentalDetails({ ...rentalDetails, passport_number: e.target.value })
                      }
                      className="bg-white text-gray-900 border-gray-300 focus:border-blue-500"
                      placeholder="Введите номер паспорта"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nationality" className="text-gray-700">Национальность</Label>
                    <Input
                      id="nationality"
                      value={rentalDetails.nationality}
                      onChange={(e) =>
                        setRentalDetails({ ...rentalDetails, nationality: e.target.value })
                      }
                      className="bg-white text-gray-900 border-gray-300 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth" className="text-gray-700">Дата рождения</Label>
                    <Input
                      id="date_of_birth"
                      value={rentalDetails.date_of_birth}
                      onChange={(e) =>
                        setRentalDetails({ ...rentalDetails, date_of_birth: e.target.value })
                      }
                      className="bg-white text-gray-900 border-gray-300 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="home_address" className="text-gray-700">Домашний адрес</Label>
                    <Input
                      id="home_address"
                      value={rentalDetails.home_address}
                      onChange={(e) =>
                        setRentalDetails({ ...rentalDetails, home_address: e.target.value })
                      }
                      className="bg-white text-gray-900 border-gray-300 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bike Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  Информация о байке
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bike_model" className="text-gray-700">Модель</Label>
                    <Input
                      id="bike_model"
                      value={rentalDetails.bike_model}
                      onChange={(e) =>
                        setRentalDetails({ ...rentalDetails, bike_model: e.target.value })
                      }
                      className="bg-white text-gray-900 border-gray-300 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plate_number" className="text-gray-700">Номер (Plate Number)</Label>
                    <Input
                      id="plate_number"
                      value={rentalDetails.plate_number}
                      onChange={(e) =>
                        setRentalDetails({ ...rentalDetails, plate_number: e.target.value })
                      }
                      className="bg-white text-gray-900 border-gray-300 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price_vnd" className="text-gray-700">Цена (VND)</Label>
                    <Input
                      id="price_vnd"
                      value={rentalDetails.price_vnd}
                      onChange={(e) =>
                        setRentalDetails({ ...rentalDetails, price_vnd: e.target.value })
                      }
                      className="bg-white text-gray-900 border-gray-300 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price_usd" className="text-gray-700">Цена (USD)</Label>
                    <Input
                      id="price_usd"
                      value={rentalDetails.price_usd}
                      onChange={(e) =>
                        setRentalDetails({ ...rentalDetails, price_usd: e.target.value })
                      }
                      className="bg-white text-gray-900 border-gray-300 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deposit" className="text-gray-700">Депозит</Label>
                    <Input
                      id="deposit"
                      value={rentalDetails.deposit}
                      onChange={(e) =>
                        setRentalDetails({ ...rentalDetails, deposit: e.target.value })
                      }
                      className="bg-white text-gray-900 border-gray-300 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Rental Dates */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                  Даты аренды
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date" className="text-gray-700">Начало (сегодня)</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={rentalDetails.start_date}
                      onChange={(e) =>
                        setRentalDetails({ ...rentalDetails, start_date: e.target.value })
                      }
                      className="bg-white text-gray-900 border-gray-300 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date" className="text-gray-700">Конец</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={rentalDetails.end_date}
                      onChange={(e) =>
                        setRentalDetails({ ...rentalDetails, end_date: e.target.value })
                      }
                      className="bg-white text-gray-900 border-gray-300 focus:border-blue-500"
                    />
                  </div>
            </div>
          </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Назад
                </Button>
                <Button
                  onClick={handleGeneratePDF}
                  disabled={isGeneratingPDF}
                  className="flex-1"
                >
                  {isGeneratingPDF ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Генерация...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Скачать Договор (PDF)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-2xl text-green-600">Договор успешно создан!</CardTitle>
              <CardDescription>
                PDF файл был загружен на ваше устройство.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => {
                  setStep(1)
                  setPassportImage(null)
                  setPassportImagePreview("")
                  setPassportData({
                    full_name: "",
                    passport_number: "",
                    nationality: "",
                    date_of_birth: "",
                    home_address: "",
                  })
                  setRentalDetails({
                    full_name: "",
                    passport_number: "",
                    nationality: "",
                    date_of_birth: "",
                    home_address: "",
                    bike_model: "Honda Click",
                    plate_number: "",
                    price_vnd: "",
                    price_usd: "",
                    deposit: "",
                    start_date: new Date().toISOString().split("T")[0],
                    end_date: "",
                  })
                }}
                className="w-full"
              >
                Создать новый договор
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

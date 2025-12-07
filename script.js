// Telegram Web App initialization
let tg = window.Telegram.WebApp;
tg.expand();

// Get DOM elements
const lengthInput = document.getElementById('length');
const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const weightInput = document.getElementById('weight');
const quantityInput = document.getElementById('quantity');
const calculateBtn = document.getElementById('calculateBtn');

// Modal elements
const modalOverlay = document.getElementById('modalOverlay');
const packingList = document.getElementById('packingList');
const closeBtn = document.getElementById('closeBtn');
const shareBtn = document.getElementById('shareBtn');

// Check elements
const checkDate = document.getElementById('checkDate');
const reportNumber = document.getElementById('reportNumber');
const checkDimensions = document.getElementById('checkDimensions');
const checkSingleCBM = document.getElementById('checkSingleCBM');
const checkQuantity = document.getElementById('checkQuantity');
const checkTotalCBM = document.getElementById('checkTotalCBM');
const checkTotalWeight = document.getElementById('checkTotalWeight');
const checkDensity = document.getElementById('checkDensity');
const cargoStamp = document.getElementById('cargoStamp');
const stampText = document.getElementById('stampText');
const barcodeNumber = document.getElementById('barcodeNumber');

// Store calculation results
let calculationData = null;

// Calculate on button click
calculateBtn.addEventListener('click', calculate);

// Close modal
closeBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        closeModal();
    }
});

// Share functionality
shareBtn.addEventListener('click', shareReport);

// Keyboard handling for inputs
const inputs = [lengthInput, widthInput, heightInput, weightInput, quantityInput];
inputs.forEach((input, index) => {
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (index < inputs.length - 1) {
                inputs[index + 1].focus();
            } else {
                calculate();
            }
        }
    });
});

// Main calculation function
function calculate() {
    // Get values
    const length = parseFloat(lengthInput.value) || 0;
    const width = parseFloat(widthInput.value) || 0;
    const height = parseFloat(heightInput.value) || 0;
    const weight = parseFloat(weightInput.value) || 0;
    const quantity = parseInt(quantityInput.value) || 0;

    // Validate inputs
    if (length <= 0 || width <= 0 || height <= 0 || weight <= 0 || quantity <= 0) {
        alert('⚠️ Пожалуйста, заполните все поля!');
        return;
    }

    // Calculate single box CBM (converting cm to m³)
    const singleCBM = (length * width * height) / 1000000;

    // Calculate totals
    const totalCBM = singleCBM * quantity;
    const totalWeight = weight * quantity;

    // Calculate density (kg/m³)
    const density = totalCBM > 0 ? totalWeight / totalCBM : 0;

    // Determine cargo type
    let cargoType = 'STANDBY';
    let cargoClass = '';

    if (density > 167) {
        cargoType = 'HEAVY CARGO';
        cargoClass = 'heavy';
    } else if (density > 0) {
        cargoType = 'VOLUMETRIC';
        cargoClass = 'volumetric';
    }

    // Store calculation data
    calculationData = {
        length,
        width,
        height,
        weight,
        quantity,
        singleCBM,
        totalCBM,
        totalWeight,
        density,
        cargoType,
        cargoClass
    };

    // Show modal with results
    showModal();

    // Haptic feedback for Telegram
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

// Show modal with calculation results
function showModal() {
    if (!calculationData) return;

    const data = calculationData;
    
    // Set date and report number
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    checkDate.textContent = dateStr;
    
    // Generate random report number
    const reportNum = Math.floor(100000 + Math.random() * 900000);
    reportNumber.textContent = reportNum;
    barcodeNumber.textContent = reportNum.toString().padStart(12, '0');

    // Fill check data
    checkDimensions.textContent = `${data.length} × ${data.width} × ${data.height} cm`;
    checkSingleCBM.textContent = `${data.singleCBM.toFixed(6)} m³`;
    checkQuantity.textContent = `${data.quantity} шт`;
    checkTotalCBM.textContent = `${data.totalCBM.toFixed(3)} m³`;
    checkTotalWeight.textContent = `${data.totalWeight.toFixed(2)} kg`;
    checkDensity.textContent = `${data.density.toFixed(2)} kg/m³`;

    // Set cargo stamp
    stampText.textContent = data.cargoType;
    cargoStamp.classList.remove('heavy', 'volumetric');
    if (data.cargoClass) {
        cargoStamp.classList.add(data.cargoClass);
    }

    // Show modal with animation
    modalOverlay.classList.add('active');
}

// Close modal
function closeModal() {
    modalOverlay.classList.remove('active');
    
    // Haptic feedback
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

// Share report function
async function shareReport() {
    if (!calculationData) return;

    const data = calculationData;
    
    // Create beautiful text message with emojis
    const shareText = `
📦 CARGO REPORT - CHB MASTER

📐 Размеры: ${data.length} × ${data.width} × ${data.height} cm
📏 Объем коробки: ${data.singleCBM.toFixed(6)} m³
📊 Количество: ${data.quantity} шт

━━━━━━━━━━━━━━━━━━━━
📦 Общий объем: ${data.totalCBM.toFixed(3)} CBM
⚖️ Общий вес: ${data.totalWeight.toFixed(2)} kg
📈 Плотность: ${data.density.toFixed(2)} kg/m³

${data.density > 167 ? '🔴 HEAVY CARGO' : '🔵 VOLUMETRIC CARGO'}

━━━━━━━━━━━━━━━━━━━━
🚢 China Box Master
Cargo Calculator v2.1
`.trim();

    // Try to use Web Share API
    if (navigator.share) {
        try {
            await navigator.share({
                title: '📦 Cargo Report - CHB Master',
                text: shareText
            });
            
            // Haptic feedback
            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }
        } catch (err) {
            // User cancelled or error occurred
            if (err.name !== 'AbortError') {
                console.log('Share error:', err);
                fallbackShare(shareText);
            }
        }
    } else {
        // Fallback for browsers without Share API
        fallbackShare(shareText);
    }
}

// Fallback share function (copy to clipboard)
function fallbackShare(text) {
    // Copy to clipboard
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            alert('✅ Отчет скопирован в буфер обмена!\n\nТеперь вы можете отправить его клиенту.');
            
            // Haptic feedback
            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }
        }).catch(err => {
            console.error('Copy failed:', err);
            alert('❌ Ошибка копирования. Попробуйте еще раз.');
        });
    } else {
        // Very old fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            alert('✅ Отчет скопирован в буфер обмена!');
        } catch (err) {
            console.error('Copy failed:', err);
            alert('❌ Ошибка копирования.');
        }
        document.body.removeChild(textarea);
    }
}

// Telegram theme colors integration
if (tg.themeParams) {
    document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#1a1a1a');
    document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#ffffff');
}

// Prevent zoom on iOS
document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
});

// Focus first input on load
window.addEventListener('load', () => {
    setTimeout(() => {
        lengthInput.focus();
    }, 300);
});

// Initialize app
console.log('China Box Master v2.0 - Cyber Logistics UI');
console.log('Telegram WebApp SDK:', tg.version || 'Not detected');
console.log('Share API available:', !!navigator.share);

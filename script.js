// Telegram Web App initialization
let tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
}

// Global State
const state = {
    currency: 'USD',
    exchangeRate: 1,
    deliveryMethod: null,
    customRate: 0,
    rateType: 'kg',
    boxes: [],
    boxIdCounter: 1
};

// Currency symbols
const currencySymbols = {
    USD: '$',
    CNY: '¥',
    RUB: '₽'
};

// Delivery presets
const deliveryPresets = {
    air: { rate: 5.5, type: 'kg', emoji: '✈️', name: 'AIR' },
    truck: { rate: 3.8, type: 'kg', emoji: '🚛', name: 'TRUCK' },
    sea: { rate: 280, type: 'cbm', emoji: '🚢', name: 'SEA' }
};

// DOM Elements
const currencyButtons = document.querySelectorAll('.currency-btn');
const exchangeRateBlock = document.getElementById('exchangeRateBlock');
const exchangeRateInput = document.getElementById('exchangeRate');
const targetCurrencySpan = document.getElementById('targetCurrency');
const presetButtons = document.querySelectorAll('.preset-btn');
const customRateInput = document.getElementById('customRate');
const rateTypeSelect = document.getElementById('rateType');
const btnAddBox = document.getElementById('btnAddBox');
const boxesContainer = document.getElementById('boxesContainer');
const btnCalculate = document.getElementById('btnCalculate');
const btnHistory = document.getElementById('btnHistory');
const historyModal = document.getElementById('historyModal');
const btnCloseHistory = document.getElementById('btnCloseHistory');
const historyList = document.getElementById('historyList');
const manifestModal = document.getElementById('manifestModal');
const btnCloseManifest = document.getElementById('btnCloseManifest');
const btnShareManifest = document.getElementById('btnShareManifest');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initCurrencySelector();
    initPresetButtons();
    initCustomRate();
    addBox(); // Add first box by default
    loadHistory();
});

// Currency Selector
function initCurrencySelector() {
    currencyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const currency = btn.dataset.currency;
            selectCurrency(currency);
        });
    });

    exchangeRateInput.addEventListener('input', () => {
        state.exchangeRate = parseFloat(exchangeRateInput.value) || 1;
    });
}

function selectCurrency(currency) {
    state.currency = currency;
    
    currencyButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.currency === currency);
    });

    if (currency === 'USD') {
        exchangeRateBlock.style.display = 'none';
        state.exchangeRate = 1;
    } else {
        exchangeRateBlock.style.display = 'block';
        targetCurrencySpan.textContent = currency;
        
        // Set default exchange rates
        if (currency === 'CNY' && !exchangeRateInput.value) {
            exchangeRateInput.value = '7.2';
            state.exchangeRate = 7.2;
        } else if (currency === 'RUB' && !exchangeRateInput.value) {
            exchangeRateInput.value = '95';
            state.exchangeRate = 95;
        }
    }
}

// Preset Buttons
function initPresetButtons() {
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            selectPreset(type);
        });
    });
}

function selectPreset(type) {
    state.deliveryMethod = type;
    const preset = deliveryPresets[type];
    
    presetButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    customRateInput.value = preset.rate;
    rateTypeSelect.value = preset.type;
    state.customRate = preset.rate;
    state.rateType = preset.type;
}

// Custom Rate
function initCustomRate() {
    customRateInput.addEventListener('input', () => {
        state.customRate = parseFloat(customRateInput.value) || 0;
        // Deselect presets
        presetButtons.forEach(btn => btn.classList.remove('active'));
        state.deliveryMethod = 'custom';
    });

    rateTypeSelect.addEventListener('change', () => {
        state.rateType = rateTypeSelect.value;
    });
}

// Box Management
function addBox() {
    const boxId = state.boxIdCounter++;
    const box = {
        id: boxId,
        length: 0,
        width: 0,
        height: 0,
        weight: 0,
        quantity: 1
    };
    
    state.boxes.push(box);
    renderBox(box);
}

function renderBox(box) {
    const boxElement = document.createElement('div');
    boxElement.className = 'box-item';
    boxElement.dataset.id = box.id;
    
    boxElement.innerHTML = `
        <div class="box-header">
            <span class="box-number">BOX #${box.id}</span>
            <button class="btn-delete-box" onclick="deleteBox(${box.id})">✕</button>
        </div>
        <div class="box-inputs">
            <div class="input-field">
                <label>Length (cm)</label>
                <input type="number" data-field="length" data-id="${box.id}" 
                       placeholder="0" step="0.1" min="0" value="${box.length || ''}">
            </div>
            <div class="input-field">
                <label>Width (cm)</label>
                <input type="number" data-field="width" data-id="${box.id}" 
                       placeholder="0" step="0.1" min="0" value="${box.width || ''}">
            </div>
            <div class="input-field">
                <label>Height (cm)</label>
                <input type="number" data-field="height" data-id="${box.id}" 
                       placeholder="0" step="0.1" min="0" value="${box.height || ''}">
            </div>
        </div>
        <div class="box-inputs-bottom">
            <div class="input-field">
                <label>Weight (kg)</label>
                <input type="number" data-field="weight" data-id="${box.id}" 
                       placeholder="0" step="0.1" min="0" value="${box.weight || ''}">
            </div>
            <div class="input-field">
                <label>Quantity</label>
                <input type="number" data-field="quantity" data-id="${box.id}" 
                       placeholder="1" step="1" min="1" value="${box.quantity || 1}">
            </div>
        </div>
    `;
    
    boxesContainer.appendChild(boxElement);
    attachBoxInputListeners(boxElement);
}

function attachBoxInputListeners(boxElement) {
    const inputs = boxElement.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const boxId = parseInt(e.target.dataset.id);
            const field = e.target.dataset.field;
            const value = parseFloat(e.target.value) || 0;
            
            const box = state.boxes.find(b => b.id === boxId);
            if (box) {
                box[field] = value;
            }
        });
    });
}

function deleteBox(boxId) {
    if (state.boxes.length <= 1) {
        alert('⚠️ You must have at least one box!');
        return;
    }
    
    state.boxes = state.boxes.filter(b => b.id !== boxId);
    const boxElement = document.querySelector(`[data-id="${boxId}"]`).closest('.box-item');
    boxElement.remove();
}

btnAddBox.addEventListener('click', addBox);

// Calculate
btnCalculate.addEventListener('click', calculate);

function calculate() {
    // Validate boxes
    if (state.boxes.length === 0) {
        alert('⚠️ Please add at least one box!');
        return;
    }

    const validBoxes = state.boxes.filter(box => 
        box.length > 0 && box.width > 0 && box.height > 0 && 
        box.weight > 0 && box.quantity > 0
    );

    if (validBoxes.length === 0) {
        alert('⚠️ Please fill in all box dimensions!');
        return;
    }

    // Validate rate
    if (state.customRate <= 0) {
        alert('⚠️ Please select a delivery method or enter a custom rate!');
        return;
    }

    // Calculate totals
    let totalWeight = 0;
    let totalCBM = 0;
    const items = [];

    validBoxes.forEach(box => {
        const cbm = (box.length * box.width * box.height) / 1000000;
        const boxTotalCBM = cbm * box.quantity;
        const boxTotalWeight = box.weight * box.quantity;
        
        totalCBM += boxTotalCBM;
        totalWeight += boxTotalWeight;
        
        items.push({
            dimensions: `${box.length}×${box.width}×${box.height}cm`,
            cbm: cbm.toFixed(6),
            weight: box.weight,
            quantity: box.quantity,
            totalCBM: boxTotalCBM.toFixed(6),
            totalWeight: boxTotalWeight.toFixed(2)
        });
    });

    const density = totalCBM > 0 ? totalWeight / totalCBM : 0;

    // Calculate price in USD
    let priceUSD = 0;
    if (state.rateType === 'kg') {
        priceUSD = totalWeight * state.customRate;
    } else {
        priceUSD = totalCBM * state.customRate;
    }

    // Convert to selected currency
    const finalPrice = priceUSD * state.exchangeRate;

    const result = {
        items,
        totalWeight,
        totalCBM,
        density,
        priceUSD,
        finalPrice,
        currency: state.currency,
        deliveryMethod: state.deliveryMethod,
        rate: state.customRate,
        rateType: state.rateType,
        exchangeRate: state.exchangeRate,
        timestamp: Date.now()
    };

    // Save to history
    saveToHistory(result);

    // Show manifest
    showManifest(result);

    // Haptic feedback
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

// Show Manifest
function showManifest(result) {
    const now = new Date();
    const dateStr = now.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const manifestId = Math.floor(100000 + Math.random() * 900000);
    
    document.getElementById('manifestDate').textContent = dateStr;
    document.getElementById('manifestId').textContent = manifestId;
    
    // Items list
    const itemsList = document.getElementById('manifestItemsList');
    itemsList.innerHTML = result.items.map((item, index) => `
        <div class="manifest-item">
            BOX #${index + 1}: ${item.dimensions} | ${item.weight}kg × ${item.quantity} = ${item.totalWeight}kg, ${item.totalCBM}m³
        </div>
    `).join('');
    
    // Totals
    document.getElementById('manifestTotalWeight').textContent = `${result.totalWeight.toFixed(2)} kg`;
    document.getElementById('manifestTotalCBM').textContent = `${result.totalCBM.toFixed(3)} m³`;
    document.getElementById('manifestDensity').textContent = `${result.density.toFixed(2)} kg/m³`;
    
    // Method
    let methodText = 'CUSTOM';
    if (result.deliveryMethod && deliveryPresets[result.deliveryMethod]) {
        const preset = deliveryPresets[result.deliveryMethod];
        methodText = `${preset.emoji} ${preset.name}`;
    }
    document.getElementById('manifestMethod').textContent = methodText;
    
    // Price
    const symbol = currencySymbols[result.currency];
    document.getElementById('manifestPrice').textContent = `${symbol}${result.finalPrice.toFixed(2)}`;
    document.getElementById('manifestCurrency').textContent = result.currency;
    
    // Store for sharing
    window.currentManifest = result;
    
    // Show modal
    manifestModal.classList.add('active');
}

btnCloseManifest.addEventListener('click', () => {
    manifestModal.classList.remove('active');
});

manifestModal.addEventListener('click', (e) => {
    if (e.target === manifestModal) {
        manifestModal.classList.remove('active');
    }
});

// Share Manifest (Send Order)
btnShareManifest.addEventListener('click', shareManifest);

function shareManifest() {
    const result = window.currentManifest;
    if (!result) {
        alert('⚠️ Нет данных для отправки!');
        return;
    }
    
    // Подготовка данных заявки
    const orderData = {
        totalWeight: result.totalWeight,
        totalVolume: result.totalCBM,
        totalPrice: result.finalPrice,
        currency: result.currency,
        density: result.density,
        deliveryMethod: result.deliveryMethod || 'custom',
        rate: result.rate,
        rateType: result.rateType,
        exchangeRate: result.exchangeRate,
        items: result.items.map((item, index) => ({
            boxNumber: index + 1,
            dimensions: item.dimensions,
            weight: item.weight,
            quantity: item.quantity,
            totalWeight: item.totalWeight,
            totalVolume: item.totalCBM
        })),
        timestamp: result.timestamp,
        date: new Date(result.timestamp).toLocaleString('ru-RU')
    };
    
    if (tg && tg.sendData) {
        const data = JSON.stringify({
            action: "order",
            data: orderData
        });
        
        // Haptic feedback
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
        
        // Отправить данные боту
        tg.sendData(data);
        
        // Закрыть приложение
        tg.close();
    } else {
        // Fallback для тестирования вне Telegram
        console.log('Order data:', orderData);
        alert('🚀 Заявка отправлена!\n\nИтого: ' + currencySymbols[result.currency] + result.finalPrice.toFixed(2) + ' ' + result.currency + '\n\nЭта функция работает только в Telegram Bot.');
    }
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        alert('✅ Manifest copied to clipboard!\n\nYou can now share it with your client.');
        
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    } catch (err) {
        console.error('Copy failed:', err);
        alert('❌ Failed to copy. Please try again.');
    }
}

// History Management
function saveToHistory(result) {
    let history = JSON.parse(localStorage.getItem('cbm_history') || '[]');
    
    history.unshift({
        timestamp: result.timestamp,
        finalPrice: result.finalPrice,
        currency: result.currency,
        totalWeight: result.totalWeight,
        totalCBM: result.totalCBM,
        items: result.items.length,
        deliveryMethod: result.deliveryMethod,
        boxes: state.boxes.map(b => ({...b}))
    });
    
    // Keep only last 10
    history = history.slice(0, 10);
    
    localStorage.setItem('cbm_history', JSON.stringify(history));
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem('cbm_history') || '[]');
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <div class="icon">📭</div>
                <p>No calculation history yet.<br>Start calculating to see your history here.</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = history.map((item, index) => {
        const date = new Date(item.timestamp);
        const dateStr = date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const symbol = currencySymbols[item.currency];
        
        return `
            <div class="history-item" onclick="restoreFromHistory(${index})">
                <div class="history-item-header">
                    <span class="history-date">${dateStr}</span>
                    <span class="history-price">${symbol}${item.finalPrice.toFixed(2)}</span>
                </div>
                <div class="history-details">
                    ${item.items} items • ${item.totalWeight.toFixed(1)}kg • ${item.totalCBM.toFixed(3)}m³
                </div>
            </div>
        `;
    }).join('');
}

function restoreFromHistory(index) {
    const history = JSON.parse(localStorage.getItem('cbm_history') || '[]');
    const item = history[index];
    
    if (!item || !item.boxes) return;
    
    // Clear current boxes
    state.boxes = [];
    boxesContainer.innerHTML = '';
    state.boxIdCounter = 1;
    
    // Restore boxes
    item.boxes.forEach(boxData => {
        const boxId = state.boxIdCounter++;
        const box = {
            id: boxId,
            length: boxData.length,
            width: boxData.width,
            height: boxData.height,
            weight: boxData.weight,
            quantity: boxData.quantity
        };
        
        state.boxes.push(box);
        renderBox(box);
    });
    
    // Close history modal
    historyModal.classList.remove('active');
    
    // Show notification
    alert('✅ Calculation restored from history!');
    
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
}

// History Modal
btnHistory.addEventListener('click', () => {
    loadHistory();
    historyModal.classList.add('active');
});

btnCloseHistory.addEventListener('click', () => {
    historyModal.classList.remove('active');
});

historyModal.addEventListener('click', (e) => {
    if (e.target === historyModal) {
        historyModal.classList.remove('active');
    }
});

// Prevent zoom on iOS
document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
});

// Telegram Action Buttons
const btnGetAddress = document.getElementById('btnGetAddress');
const btnSendOrder = document.getElementById('btnSendOrder');

// Get Warehouse Address Handler
btnGetAddress.addEventListener('click', () => {
    if (tg && tg.sendData) {
        const data = JSON.stringify({ action: "get_address" });
        
        // Haptic feedback
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
        
        // Send data to bot
        tg.sendData(data);
        
        // Close the web app
        tg.close();
    } else {
        // Fallback for testing outside Telegram
        console.log('Telegram WebApp not available');
        alert('📍 Request sent: GET WAREHOUSE ADDRESS\n\nThis feature works only in Telegram Bot.');
    }
});

// Send Order to Manager Handler
btnSendOrder.addEventListener('click', () => {
    // Validate that we have calculated data
    if (!window.currentManifest) {
        alert('⚠️ Please calculate your order first!\n\nClick "CALCULATE MANIFEST" button to create an order.');
        
        if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
        return;
    }
    
    const manifest = window.currentManifest;
    
    // Prepare order data
    const orderData = {
        totalWeight: manifest.totalWeight,
        totalVolume: manifest.totalCBM,
        totalPrice: manifest.finalPrice,
        currency: manifest.currency,
        density: manifest.density,
        deliveryMethod: manifest.deliveryMethod || 'custom',
        rate: manifest.rate,
        rateType: manifest.rateType,
        exchangeRate: manifest.exchangeRate,
        items: manifest.items.map((item, index) => ({
            boxNumber: index + 1,
            dimensions: item.dimensions,
            weight: item.weight,
            quantity: item.quantity,
            totalWeight: item.totalWeight,
            totalVolume: item.totalCBM
        })),
        timestamp: manifest.timestamp,
        date: new Date(manifest.timestamp).toLocaleString('ru-RU')
    };
    
    if (tg && tg.sendData) {
        const data = JSON.stringify({
            action: "order",
            data: orderData
        });
        
        // Haptic feedback
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
        
        // Send data to bot
        tg.sendData(data);
        
        // Close the web app
        tg.close();
    } else {
        // Fallback for testing outside Telegram
        console.log('Order data:', orderData);
        alert('🚀 Order sent to manager!\n\nTotal: ' + currencySymbols[manifest.currency] + manifest.finalPrice.toFixed(2) + ' ' + manifest.currency + '\n\nThis feature works only in Telegram Bot.');
    }
});

// Initialize console log
console.log('China Box Master v5.0 - Neo-Logistics Terminal');
console.log('Telegram WebApp SDK:', tg?.version || 'Not detected');
console.log('Share API available:', !!navigator.share);

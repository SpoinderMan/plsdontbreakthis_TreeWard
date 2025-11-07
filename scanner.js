// Bill management
let currentBill = [];
let billActive = false;
let tempFile = null;  // Store file for processing

// Start a new bill
function startBill() {
    currentBill = [];
    billActive = true;
    tempFile = null;
    
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('scannerSection').style.display = 'block';
    document.getElementById('billSection').style.display = 'block';
    document.getElementById('progressSection').style.display = 'block';
    updateProgressBar(); // Initialize progress

    document.getElementById('startBillBtn').disabled = false;
    document.getElementById('endBillBtn').disabled = false;
    document.getElementById('clearBillBtn').disabled = false;
    document.getElementById('preview').style.display = 'none';
    
    updateBillDisplay();
    console.log('✅ New bill started');
}

// End bill and show results
function endBill() {
    if (currentBill.length === 0) {
        alert('❌ Add at least one item to the bill!');
        return;
    }
    
    billActive = false;
    
    // Calculate totals
    const totalCarbon = currentBill.reduce((sum, item) => sum + item.carbonFootprint, 0);
    const totalPoints = currentBill.reduce((sum, item) => sum + item.pointsAwarded, 0);
    
    // Show results modal
    document.getElementById('modalTotalPoints').textContent = totalPoints;
    document.getElementById('modalTotalCarbon').textContent = `${Math.round(totalCarbon)}g CO2e`;
    document.getElementById('resultsModal').classList.add('active');
    
    console.log('📊 Bill ended:', { items: currentBill.length, totalCarbon, totalPoints });
}

// Clear current bill
function clearBill() {
    if (!confirm('Clear all items from bill?')) return;
    currentBill = [];
    updateBillDisplay();
}

// Close results modal
function closeModal() {
    document.getElementById('resultsModal').classList.remove('active');
}

// Save bill (to backend or localStorage)
function saveBill() {
    const bill = {
        timestamp: new Date().toISOString(),
        items: currentBill,
        totalCarbon: currentBill.reduce((sum, item) => sum + item.carbonFootprint, 0),
        totalPoints: currentBill.reduce((sum, item) => sum + item.pointsAwarded, 0)
    };
    
    // For now, save to localStorage (we'll move to backend later)
    let bills = JSON.parse(localStorage.getItem('bills') || '[]');
    bills.push(bill);
    localStorage.setItem('bills', JSON.stringify(bills));
    
    console.log('💾 Bill saved:', bill);
    alert('✅ Bill saved successfully!');
    
    closeModal();
    resetUI();
}

// Reset UI to initial state
function resetUI() {
    billActive = false;
    currentBill = [];
    document.getElementById('scannerSection').style.display = 'none';
    document.getElementById('billSection').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('startBillBtn').disabled = false;
    document.getElementById('endBillBtn').disabled = true;
    document.getElementById('clearBillBtn').disabled = true;
    document.getElementById('preview').style.display = 'none';
    updateBillDisplay();
}

// Handle image upload/capture
function handleImage(event) {
    if (!billActive) {
        alert('⚠️ Start a bill first!');
        return;
    }
    
    const file = event.target.files[0];
    if (!file) return;
    
    const resultDiv = document.getElementById('result') || createResultDiv();
    resultDiv.textContent = '⏳ Scanning...';
    
    const imageUrl = URL.createObjectURL(file);
    const preview = document.getElementById('preview');
    preview.src = imageUrl;
    preview.style.display = 'block';
    
    scanBarcode(imageUrl);
}

// Scan barcode from image
function scanBarcode(imageSrc) {
    Quagga.decodeSingle({
        src: imageSrc,
        decoder: {
            readers: ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader', 'code_128_reader']
        },
        locate: true
    }, function(result) {
        if (result && result.codeResult) {
            const barcode = result.codeResult.code;
            console.log('✅ Barcode detected:', barcode);
            addItemToBill(barcode);
        } else {
            alert('❌ No barcode detected. Try again with better lighting.');
        }
    });
}

// Add item to bill (or increment qty if exists)
function addItemToBill(barcode) {
    // Check if barcode already in bill
    const existingItem = currentBill.find(item => item.barcode === barcode);
    
    if (existingItem) {
        // Just increment quantity
        existingItem.quantity += 1;
        console.log(`📦 Incremented ${existingItem.itemName} to qty ${existingItem.quantity}`);
    } else {
        // New item - fetch from backend/API
        lookupProduct(barcode);
    }
}

// Lookup product (will call backend API once set up)
async function lookupProduct(barcode) {
    console.log(`🔍 Looking up barcode: ${barcode}`);
    
    // PLACEHOLDER - Replace with real API call to your backend
    // For now, using dummy data for testing
    const dummyProduct = {
        barcode: barcode,
        itemName: `Product ${barcode}`,
        ecoscore_score: Math.floor(Math.random() * 100),
        ecoscore_grade: ['A', 'B', 'C', 'D', 'E'][Math.floor(Math.random() * 5)]
    };
    
    // TODO: Replace with real API:
    // const response = await fetch(`http://localhost:3000/api/product/${barcode}`);
    // const product = await response.json();
    
    addToCurrentBill(dummyProduct);
}

// Add product to current bill
function addToCurrentBill(product) {
    // Convert ecoscore to carbon estimate (you'll replace with real data)
    const carbonMap = { A: 10, B: 30, C: 50, D: 75, E: 100 };
    const carbonFootprint = carbonMap[product.ecoscore_grade] || 50;
    
    // Calculate points based on carbon (example: lower carbon = more points)
    const pointsMap = { A: 50, B: 30, C: 15, D: 5, E: 0 };
    const pointsAwarded = pointsMap[product.ecoscore_grade] || 10;
    
    const newItem = {
        barcode: product.barcode,
        itemName: product.itemName,
        quantity: 1,
        carbonFootprint: carbonFootprint,
        pointsAwarded: pointsAwarded,
        grade: product.ecoscore_grade
    };
    
    currentBill.push(newItem);
    console.log('✅ Added to bill:', newItem);
    updateBillDisplay();
}

// Update quantity
function updateQuantity(barcode, delta) {
    const item = currentBill.find(i => i.barcode === barcode);
    if (item) {
        item.quantity += delta;
        if (item.quantity < 1) {
            removeFromBill(barcode);
        } else {
            updateBillDisplay();
        }
    }
}

// Remove item from bill
function removeFromBill(barcode) {
    currentBill = currentBill.filter(item => item.barcode !== barcode);
    updateBillDisplay();
}

// Update bill display
function updateBillDisplay() {
    const itemsHtml = currentBill.map(item => {
        const carbonClass = item.carbonFootprint < 30 ? 'low-carbon' : 
                           item.carbonFootprint < 60 ? 'medium-carbon' : 'high-carbon';
        
        return `
            <div class="bill-item ${carbonClass}">
                <div class="item-info">
                    <div class="item-name">${item.itemName}</div>
                    <div class="item-details">
                        Barcode: ${item.barcode} | Grade: <strong>${item.grade}</strong>
                    </div>
                </div>
                <div class="item-controls">
                    <button class="qty-btn" onclick="updateQuantity('${item.barcode}', -1)">−</button>
                    <div class="qty-display">${item.quantity}</div>
                    <button class="qty-btn" onclick="updateQuantity('${item.barcode}', 1)">+</button>
                </div>
                <div class="item-score">
                    <div class="carbon-value">${item.carbonFootprint}g</div>
                    <div class="points-value">+${item.pointsAwarded}pts</div>
                </div>
                <button class="delete-btn" onclick="removeFromBill('${item.barcode}')">Delete</button>
            </div>
        `;
    }).join('');
    
    document.getElementById('billItems').innerHTML = itemsHtml || '<div class="empty-state">No items yet</div>';
    
    // Update header stats
    const totalCarbon = currentBill.reduce((sum, item) => sum + (item.carbonFootprint * item.quantity), 0);
    const totalPoints = currentBill.reduce((sum, item) => sum + (item.pointsAwarded * item.quantity), 0);
    const itemCount = currentBill.reduce((sum, item) => sum + item.quantity, 0);
    
    document.getElementById('itemCount').textContent = itemCount;
    document.getElementById('totalCarbon').textContent = `${Math.round(totalCarbon)}g`;
    document.getElementById('totalPoints').textContent = totalPoints;
}

// Helper to create result div if it doesn't exist
function createResultDiv() {
    let div = document.getElementById('result');
    if (!div) {
        div = document.createElement('div');
        div.id = 'result';
        document.querySelector('.scanner-section').appendChild(div);
    }
    return div;
}

// Average customer greenpoints (EDIT THIS VALUE)
const AVG_CUSTOMER_GREENPOINTS = 50;

// Update progress bar
function updateProgressBar() {
    const currentPoints = currentBill.reduce((sum, item) => sum + (item.pointsAwarded * item.quantity), 0);
    
    // Update display
    document.getElementById('currentPoints').textContent = currentPoints;
    document.getElementById('avgPoints').textContent = AVG_CUSTOMER_GREENPOINTS;
    
    // Calculate percentage
    const percentage = Math.min((currentPoints / AVG_CUSTOMER_GREENPOINTS) * 100, 100);
    
    // Update circle
    const circumference = 2 * Math.PI * 65; // radius = 65
    const offset = circumference - (percentage / 100) * circumference;
    document.getElementById('progressFill').style.strokeDashoffset = offset;
    
    // Update color and encouragement text
    updateEncouragementText(currentPoints);
}

// Update encouragement text based on progress
function updateEncouragementText(currentPoints) {
    const textEl = document.getElementById('encouragementText');
    const percentage = (currentPoints / AVG_CUSTOMER_GREENPOINTS) * 100;
    
    let text = '';
    let className = '';
    
    if (percentage === 0) {
        text = '🌱 Click "Start New Bill" to begin scanning';
        className = '';
    } else if (percentage < 40) {
        text = '💪 Keep scanning! Try eco-friendly options for more points!';
        className = 'low';
    } else if (percentage < 70) {
        text = '🌿 Good progress! You\'re building a greener cart!';
        className = 'medium';
    } else if (percentage < 100) {
        text = '🌟 Excellent! You\'re almost at the average eco-shopper!';
        className = 'medium';
    } else if (percentage === 100) {
        text = '🏆 AMAZING! You\'ve reached the average! You\'re an eco-champion!';
        className = 'high';
    } else {
        text = '⭐ WOW! You\'re above average! Inspire others to shop green!';
        className = 'high';
    }
    
    textEl.textContent = text;
    textEl.className = 'encouragement-text ' + className;
}

// Update bill display (modified)
function updateBillDisplay() {
    const itemsHtml = currentBill.map(item => {
        const carbonClass = item.carbonFootprint < 30 ? 'low-carbon' : 
                           item.carbonFootprint < 60 ? 'medium-carbon' : 'high-carbon';
        
        return `
            <div class="bill-item ${carbonClass}">
                <div class="item-info">
                    <div class="item-name">${item.itemName}</div>
                    <div class="item-details">
                        Barcode: ${item.barcode} | Grade: <strong>${item.grade}</strong>
                    </div>
                </div>
                <div class="item-controls">
                    <button class="qty-btn" onclick="updateQuantity('${item.barcode}', -1)">−</button>
                    <div class="qty-display">${item.quantity}</div>
                    <button class="qty-btn" onclick="updateQuantity('${item.barcode}', 1)">+</button>
                </div>
                <div class="item-score">
                    <div class="carbon-value">${item.carbonFootprint}g</div>
                    <div class="points-value">+${item.pointsAwarded}pts</div>
                </div>
                <button class="delete-btn" onclick="removeFromBill('${item.barcode}')">Delete</button>
            </div>
        `;
    }).join('');
    
    document.getElementById('billItems').innerHTML = itemsHtml || '<div class="empty-state">No items yet</div>';
    
    // Update header stats
    const totalCarbon = currentBill.reduce((sum, item) => sum + (item.carbonFootprint * item.quantity), 0);
    const totalPoints = currentBill.reduce((sum, item) => sum + (item.pointsAwarded * item.quantity), 0);
    const itemCount = currentBill.reduce((sum, item) => sum + item.quantity, 0);
    
    document.getElementById('itemCount').textContent = itemCount;
    document.getElementById('totalCarbon').textContent = `${Math.round(totalCarbon)}g`;
    document.getElementById('totalPoints').textContent = totalPoints;
    
    // UPDATE PROGRESS BAR
    updateProgressBar();
}

// Export bill as JSON
function exportBill() {
    if (currentBill.length === 0) {
        alert('❌ No items in bill to export!');
        return;
    }
    
    const totalCarbon = currentBill.reduce((sum, item) => sum + (item.carbonFootprint * item.quantity), 0);
    const totalPoints = currentBill.reduce((sum, item) => sum + (item.pointsAwarded * item.quantity), 0);
    const itemCount = currentBill.reduce((sum, item) => sum + item.quantity, 0);
    
    const billData = {
        timestamp: new Date().toISOString(),
        summary: {
            totalItems: itemCount,
            totalCarbonFootprint: Math.round(totalCarbon),
            totalGreenpoints: totalPoints,
            averageCarbonPerItem: Math.round(totalCarbon / itemCount)
        },
        items: currentBill.map(item => ({
            barcode: item.barcode,
            itemName: item.itemName,
            quantity: item.quantity,
            grade: item.grade,
            carbonFootprint: item.carbonFootprint,
            pointsAwarded: item.pointsAwarded,
            subtotalCarbon: item.carbonFootprint * item.quantity,
            subtotalPoints: item.pointsAwarded * item.quantity
        }))
    };
    
    // Download as JSON file
    const jsonString = JSON.stringify(billData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bill_${new Date().toISOString().split('T')[0]}_${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('📥 Bill exported:', billData);
}

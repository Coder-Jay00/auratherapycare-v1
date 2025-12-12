// AuraTherapyCare - Customer Dashboard
// Manages customer interface, attendance viewing, and monthly invoice export

let currentUser = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Protect page - only customers can access
    currentUser = protectPage('customer');
    if (!currentUser) return;

    // Display customer name
    document.getElementById('customerName').textContent = currentUser.name;
    document.getElementById('customerWelcomeName').textContent = currentUser.name;

    // Initialize dashboard
    await initializeDashboard();
});

function initializeDashboard() {
    // Update stats
    updateCustomerStats();
    
    // Display current month
    displayCurrentMonth();
    
    // Load attendance data
    loadAttendanceCalendar();
    loadAttendanceList();
    
    // Setup export button
    setupExportButton();
}

async function updateCustomerStats() {
    const stats = await getCustomerStats(currentUser.id);

    document.getElementById('totalSessionsThisMonth').textContent = stats.totalSessions;
    document.getElementById('totalCostThisMonth').textContent = formatCurrency(stats.totalCost);
    document.getElementById('lastVisitDate').textContent = stats.lastVisit ? formatDate(stats.lastVisit) : 'N/A';
}

function displayCurrentMonth() {
    const today = new Date();
    const monthName = getMonthName(today.getMonth());
    const year = today.getFullYear();
    
    document.getElementById('currentMonthDisplay').textContent = `${monthName} ${year}`;
}

async function loadAttendanceCalendar() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const records = await getAttendanceRecords({
        customerId: currentUser.id,
        month: currentMonth,
        year: currentYear
    });
    
    // Group records by date
    const recordsByDate = {};
    records.forEach(record => {
        if (!recordsByDate[record.date]) {
            recordsByDate[record.date] = [];
        }
        recordsByDate[record.date].push(record);
    });
    
    // Generate calendar grid
    const calendarGrid = document.getElementById('attendanceCalendarGrid');
    calendarGrid.innerHTML = '';
    
    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Add day headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.style.fontWeight = '600';
        header.style.textAlign = 'center';
        header.style.padding = '8px';
        header.style.color = 'var(--text-medium)';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        calendarGrid.appendChild(emptyCell);
    }
    
    // Add day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayRecords = recordsByDate[dateStr] || [];
        
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        
        if (dayRecords.length > 0) {
            dayCell.classList.add('has-session');
        }
        
        dayCell.innerHTML = `
            <div class="calendar-day-number">${day}</div>
            ${dayRecords.length > 0 ? `<div class="calendar-day-sessions">${dayRecords.length} session${dayRecords.length > 1 ? 's' : ''}</div>` : ''}
        `;
        
        calendarGrid.appendChild(dayCell);
    }
}

async function loadAttendanceList() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const records = await getAttendanceRecords({
        customerId: currentUser.id,
        month: currentMonth,
        year: currentYear
    });

    const listContent = document.getElementById('attendanceListContent');

    if (records.length === 0) {
        listContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>No sessions recorded for this month</p>
            </div>
        `;
        return;
    }

    // Group by date
    const recordsByDate = {};
    records.forEach(record => {
        if (!recordsByDate[record.date]) {
            recordsByDate[record.date] = [];
        }
        recordsByDate[record.date].push(record);
    });

    // Sort dates in descending order
    const sortedDates = Object.keys(recordsByDate).sort((a, b) => new Date(b) - new Date(a));

    let html = '';
    sortedDates.forEach(date => {
        const dayRecords = recordsByDate[date];
        const dayTotal = dayRecords.reduce((sum, r) => sum + r.price, 0);

        html += `
            <div class="attendance-item">
                <div>
                    <div class="attendance-date">${formatDate(date)}</div>
                    <div class="attendance-therapy">
                        ${dayRecords.map(r => `${r.therapy_type} (${formatCurrency(r.price)})`).join(', ')}
                    </div>
                </div>
                <div class="attendance-price">${formatCurrency(dayTotal)}</div>
            </div>
        `;
    });

    listContent.innerHTML = html;
}

// ===== EXPORT FUNCTIONALITY =====
function setupExportButton() {
    const exportButton = document.getElementById('exportButton');
    const exportAvailabilityText = document.getElementById('exportAvailabilityText');
    const exportNote = document.getElementById('exportNote');
    
    const previousMonth = getPreviousMonth();
    
    exportButton.disabled = false;
    exportAvailabilityText.innerHTML = `
        <i class="fas fa-check-circle" style="color: #66BB6A;"></i>
        Export is available! Generate invoice for <strong>${previousMonth.name}</strong>
    `;
    exportNote.textContent = 'Click the button above to download your monthly invoice as PDF';
}

async function exportMonthlyInvoice() {
    const previousMonth = getPreviousMonth();
    const invoiceData = await getMonthlyInvoiceData(
        currentUser.id,
        previousMonth.month,
        previousMonth.year
    );
    
    if (invoiceData.records.length === 0) {
        alert(`No sessions found for ${previousMonth.name}. Nothing to export.`);
        return;
    }
    
    // Generate PDF
    generateInvoicePDF(invoiceData);
    
    // Show success modal
    showExportSuccessModal(invoiceData);
}

function generateInvoicePDF(invoiceData) {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
        alert('PDF library not loaded. Please check your network connection.');
        return;
    }
    const doc = new jsPDF();
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;
    
    // Header - Company Info
    doc.setFillColor(74, 144, 226);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('AuraTheracare', margin, 20);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Therapy Attendance & Billing', margin, 28);
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    yPosition = 50;
    
    // Invoice Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Monthly Invoice', margin, yPosition);
    yPosition += 15;
    
    // Customer Information
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Patient Information:', margin, yPosition);
    yPosition += 7;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`Name: ${invoiceData.customer.name}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Email: ${invoiceData.customer.email}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Phone: ${invoiceData.customer.phone}`, margin, yPosition);
    yPosition += 10;
    
    // Invoice Period
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text('Invoice Period:', margin, yPosition);
    yPosition += 7;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    const monthName = getMonthName(invoiceData.month);
    doc.text(`${monthName} ${invoiceData.year}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Generated on: ${formatDate(new Date().toISOString().split('T')[0])}`, margin, yPosition);
    yPosition += 15;
    
    // Session Details Table
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text('Session Details:', margin, yPosition);
    yPosition += 10;
    
    // Prepare table data
    const tableData = [];
    const recordsByDate = invoiceData.recordsByDate;
    const sortedDates = Object.keys(recordsByDate).sort();
    
    sortedDates.forEach(date => {
        const dayRecords = recordsByDate[date];
        dayRecords.forEach(record => {
            const therapy = record.therapyType || record.therapy_type;
            tableData.push([
                formatDate(record.date),
                String(therapy),
                `₹${record.price.toLocaleString('en-IN')}`
            ]);
        });
    });
    
    // Add table using autoTable plugin if available, else fallback
    if (typeof doc.autoTable === 'function') {
        doc.autoTable({
            startY: yPosition,
            head: [['Date', 'Therapy Type', 'Amount']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [74, 144, 226],
                textColor: 255,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 10,
                cellPadding: 5
            },
            alternateRowStyles: {
                fillColor: [248, 250, 251]
            }
        });
        yPosition = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : yPosition) + 15;
    } else {
        const xDate = margin;
        const xTherapy = margin + 70;
        const xAmount = pageWidth - margin - 20;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text('Date', xDate, yPosition);
        doc.text('Therapy Type', xTherapy, yPosition);
        doc.text('Amount', xAmount, yPosition);
        yPosition += 8;
        doc.setFont(undefined, 'normal');
        tableData.forEach(row => {
            if (yPosition > pageHeight - margin - 20) {
                doc.addPage();
                yPosition = margin;
            }
            doc.text(row[0], xDate, yPosition);
            doc.text(row[1], xTherapy, yPosition);
            doc.text(row[2], xAmount, yPosition, { align: 'right' });
            yPosition += 6;
        });
        yPosition += 12;
    }
    
    // Summary Box
    const summaryBoxX = pageWidth - margin - 80;
    const summaryBoxY = yPosition;
    const summaryBoxWidth = 80;
    const summaryBoxHeight = 35;
    
    // Draw summary box
    doc.setFillColor(248, 250, 251);
    doc.rect(summaryBoxX, summaryBoxY, summaryBoxWidth, summaryBoxHeight, 'F');
    doc.setDrawColor(74, 144, 226);
    doc.rect(summaryBoxX, summaryBoxY, summaryBoxWidth, summaryBoxHeight);
    
    // Summary text
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('Total Sessions:', summaryBoxX + 5, summaryBoxY + 10);
    doc.text('Total Amount:', summaryBoxX + 5, summaryBoxY + 20);
    
    doc.setFontSize(11);
    doc.text(`${invoiceData.totalSessions}`, summaryBoxX + summaryBoxWidth - 15, summaryBoxY + 10, { align: 'right' });
    
    doc.setFontSize(12);
    doc.setTextColor(74, 144, 226);
    doc.text(`₹${invoiceData.totalAmount.toLocaleString('en-IN')}`, summaryBoxX + summaryBoxWidth - 5, summaryBoxY + 20, { align: 'right' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Footer
    const footerY = pageHeight - 30;
    doc.setFontSize(9);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for choosing AuraTherapyCare for your therapy needs.', pageWidth / 2, footerY, { align: 'center' });
    doc.text('For any queries, please contact your therapist.', pageWidth / 2, footerY + 5, { align: 'center' });
    
    // Add page border
    doc.setDrawColor(200, 200, 200);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10);
    
    // Save PDF
    const fileName = `AuraTheracare_Invoice_${invoiceData.customer.name.replace(/\s+/g, '_')}_${monthName}_${invoiceData.year}.pdf`;
    doc.save(fileName);
}

function showExportSuccessModal(invoiceData) {
    const modal = document.getElementById('exportModal');
    const messageEl = document.getElementById('exportModalMessage');
    
    const monthName = getMonthName(invoiceData.month);
    
    messageEl.innerHTML = `
        Your monthly invoice for <strong>${monthName} ${invoiceData.year}</strong> has been generated successfully!
        <br><br>
        <strong>Total Sessions:</strong> ${invoiceData.totalSessions}<br>
        <strong>Total Amount:</strong> ${formatCurrency(invoiceData.totalAmount)}
        <br><br>
        The PDF has been downloaded to your device.
    `;
    
    modal.classList.add('show');
}

function closeExportModal() {
    document.getElementById('exportModal').classList.remove('show');
}

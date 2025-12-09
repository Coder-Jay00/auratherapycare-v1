// AuraTherapyCare - Data Management
// This file handles all data storage and retrieval using API calls to the server

// Pricing Configuration
const THERAPY_PRICES = {
    'Biolite': 300,
    'Terahertz': 400
};

// API Base URL
const API_BASE = '';

// Helper function to get auth token
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Helper function to make authenticated API calls
async function apiCall(endpoint, options = {}) {
    const token = getAuthToken();
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}



// Generate unique record ID
function generateRecordId() {
    return 'record-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// User Management Functions
function registerUser(userData) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Check if email already exists
    if (users.some(user => user.email === userData.email)) {
        return { success: false, message: 'Email already registered' };
    }
    
    const newUser = {
        id: 'customer-' + Date.now(),
        name: userData.name,
        email: userData.email,
        password: userData.password,
        phone: userData.phone,
        role: 'customer', // Always customer for new registrations
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    return { success: true, message: 'Registration successful', user: newUser };
}

function loginUser(email, password) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Store current user session
        const sessionUser = { ...user };
        delete sessionUser.password; // Don't store password in session
        localStorage.setItem('currentUser', JSON.stringify(sessionUser));
        return { success: true, user: sessionUser };
    }
    
    return { success: false, message: 'Invalid email or password' };
}

function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

function logoutUser() {
    localStorage.removeItem('currentUser');
}

function getAllCustomers() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.filter(user => user.role === 'customer');
}

function getUserById(userId) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.find(user => user.id === userId);
}

// Attendance Record Functions
async function addAttendanceRecord(record) {
    try {
        const data = await apiCall('/api/attendance', {
            method: 'POST',
            body: JSON.stringify({
                customerId: record.customerId,
                date: record.date,
                therapyType: record.therapyType,
                price: THERAPY_PRICES[record.therapyType]
            })
        });

        return { success: true, record: data };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

async function addMultipleAttendanceRecords(customerId, date, therapyTypes, recordedBy) {
    const results = [];

    for (const therapyType of therapyTypes) {
        const result = await addAttendanceRecord({
            customerId,
            date,
            therapyType,
            recordedBy
        });

        if (result.success) {
            results.push(result.record);
        }
    }

    return { success: results.length > 0, records: results };
}

async function getAttendanceRecords(filters = {}) {
    try {
        let endpoint = '/api/attendance/';

        if (filters.customerId) {
            endpoint += filters.customerId;
        } else {
            // If no customerId, we need all attendance records (therapist only)
            // This would require a new endpoint, for now return empty array
            console.warn('Getting all attendance records not implemented');
            return [];
        }

        const records = await apiCall(endpoint);

        // Apply additional filters
        let filteredRecords = records;

        if (filters.date) {
            filteredRecords = filteredRecords.filter(r => r.date === filters.date);
        }

        if (filters.month !== undefined && filters.year !== undefined) {
            filteredRecords = filteredRecords.filter(r => {
                const recordDate = new Date(r.date);
                return recordDate.getMonth() === filters.month &&
                       recordDate.getFullYear() === filters.year;
            });
        }

        if (filters.startDate && filters.endDate) {
            filteredRecords = filteredRecords.filter(r => {
                const recordDate = new Date(r.date);
                return recordDate >= new Date(filters.startDate) &&
                       recordDate <= new Date(filters.endDate);
            });
        }

        // Sort by date (most recent first)
        filteredRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        return filteredRecords;
    } catch (error) {
        console.error('Error fetching attendance records:', error);
        return [];
    }
}

async function deleteAttendanceRecord(recordId) {
    // Note: This would require a DELETE endpoint, which isn't implemented yet
    console.warn('Delete attendance record not implemented');
    return { success: false, message: 'Delete not implemented' };
}

async function getAttendanceByDate(customerId, date) {
    const records = await getAttendanceRecords({ customerId });
    return records.filter(r => r.date === date);
}

// Statistics Functions
function getCustomerStats(customerId) {
    const records = getAttendanceRecords({ customerId });
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Current month records
    const currentMonthRecords = records.filter(r => {
        const recordDate = new Date(r.date);
        return recordDate.getMonth() === currentMonth && 
               recordDate.getFullYear() === currentYear;
    });
    
    // Calculate totals
    const totalSessions = currentMonthRecords.length;
    const totalCost = currentMonthRecords.reduce((sum, r) => sum + r.price, 0);
    
    // Last visit
    const lastVisit = records.length > 0 ? records[0].date : null;
    
    return {
        totalSessions,
        totalCost,
        lastVisit,
        currentMonthRecords
    };
}

function getTherapistStats() {
    const customers = getAllCustomers();
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let totalSessions = 0;
    let totalRevenue = 0;
    
    customers.forEach(customer => {
        const records = getAttendanceRecords({
            customerId: customer.id,
            month: currentMonth,
            year: currentYear
        });
        
        totalSessions += records.length;
        totalRevenue += records.reduce((sum, r) => sum + r.price, 0);
    });
    
    return {
        totalClients: customers.length,
        totalSessions,
        totalRevenue
    };
}

async function getRevenueBreakdown(month, year) {
    const customers = await getAllCustomers();
    const breakdown = [];

    let totalBiolite = 0;
    let totalTerahertz = 0;
    let bioliteCount = 0;
    let terahertzCount = 0;

    for (const customer of customers) {
        const records = await getAttendanceRecords({
            customerId: customer._id || customer.id,
            month,
            year
        });

        const bioliteRecords = records.filter(r => r.therapy_type === 'Biolite');
        const terahertzRecords = records.filter(r => r.therapy_type === 'Terahertz');

        const bioliteTotal = bioliteRecords.length * THERAPY_PRICES.Biolite;
        const terahertzTotal = terahertzRecords.length * THERAPY_PRICES.Terahertz;

        totalBiolite += bioliteTotal;
        totalTerahertz += terahertzTotal;
        bioliteCount += bioliteRecords.length;
        terahertzCount += terahertzRecords.length;

        if (records.length > 0) {
            breakdown.push({
                customerId: customer._id || customer.id,
                customerName: customer.name,
                bioliteCount: bioliteRecords.length,
                terahertzCount: terahertzRecords.length,
                totalSessions: records.length,
                totalAmount: bioliteTotal + terahertzTotal
            });
        }
    }

    return {
        biolite: { count: bioliteCount, amount: totalBiolite },
        terahertz: { count: terahertzCount, amount: totalTerahertz },
        total: {
            count: bioliteCount + terahertzCount,
            amount: totalBiolite + totalTerahertz
        },
        breakdown
    };
}

// Export Functions
function getMonthlyInvoiceData(customerId, month, year) {
    const customer = getUserById(customerId);
    const records = getAttendanceRecords({
        customerId,
        month,
        year
    });
    
    // Group records by date
    const recordsByDate = {};
    records.forEach(record => {
        if (!recordsByDate[record.date]) {
            recordsByDate[record.date] = [];
        }
        recordsByDate[record.date].push(record);
    });
    
    const invoiceData = {
        customer,
        month,
        year,
        records,
        recordsByDate,
        totalSessions: records.length,
        totalAmount: records.reduce((sum, r) => sum + r.price, 0),
        generatedAt: new Date().toISOString()
    };
    
    return invoiceData;
}

// Utility Functions
function formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN');
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function getMonthName(monthIndex) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
}

function isExportAvailable() {
    const today = new Date();
    return today.getDate() >= 4;
}

function getPreviousMonth() {
    const today = new Date();
    const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return {
        month: previousMonth.getMonth(),
        year: previousMonth.getFullYear(),
        name: getMonthName(previousMonth.getMonth()) + ' ' + previousMonth.getFullYear()
    };
}

// Data management functions are now API-based

// AuraTherapyCare - Data Management
// This file handles all data storage and retrieval using API calls to the server

// Pricing Configuration
const THERAPY_PRICES = {
    'Biolite': 300,
    'Terahertz': 400
};

function resolveApiBase() {
    var fromWindow = window.__API_BASE__;
    if (fromWindow) return fromWindow;
    var params = new URLSearchParams(window.location.search);
    var fromQuery = params.get('api_base');
    if (fromQuery) {
        try { localStorage.setItem('API_BASE', fromQuery); } catch(e) {}
        return fromQuery;
    }
    var fromStorage = null;
    try { fromStorage = localStorage.getItem('API_BASE'); } catch(e) {}
    if (fromStorage) return fromStorage;
    var isLocal = /^localhost$|^127\\.0\\.0\\.1$/.test(window.location.hostname);
    if (!isLocal) {
        var meta = document.querySelector('meta[name=\"api-base\"]');
        var fromMeta = meta && meta.getAttribute('content');
        if (fromMeta) {
            try { localStorage.setItem('API_BASE', fromMeta); } catch(e) {}
            return fromMeta;
        }
    }
    return window.location.origin;
}
const API_BASE = resolveApiBase();

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
        },
        mode: 'cors'
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
async function registerUser(userData) {
    try {
        const response = await apiCall('/api/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });

        // Store auth token
        if (response.token) {
            localStorage.setItem('authToken', response.token);
        }

        return {
            success: true,
            message: 'Registration successful',
            user: response.user
        };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

async function loginUser(email, password) {
    try {
        const response = await apiCall('/api/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        // Store auth token
        if (response.token) {
            localStorage.setItem('authToken', response.token);
        }

        return {
            success: true,
            user: response.user
        };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

function getCurrentUser() {
    const token = getAuthToken();
    if (!token) return null;

    try {
        // Decode JWT token to get user info (simple decode, not verify)
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
            id: payload.id,
            name: payload.name,
            email: payload.email,
            role: payload.role
        };
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
}

function logoutUser() {
    localStorage.removeItem('authToken');
}

async function getAllCustomers() {
    try {
        const users = await apiCall('/api/users');
        return users.filter(user => user.role === 'customer');
    } catch (error) {
        console.error('Error fetching customers:', error);
        return [];
    }
}

async function deleteUser(userId) {
    try {
        await apiCall(`/api/users/${userId}`, {
            method: 'DELETE'
        });
        return { success: true, message: 'User deleted successfully' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

async function getUserById(userId) {
    try {
        // For customers, we can get from the users list
        const users = await apiCall('/api/users');
        return users.find(user => user._id === userId || user.id === userId);
    } catch (error) {
        console.error('Error fetching user:', error);
        return null;
    }
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
async function getCustomerStats(customerId) {
    const records = await getAttendanceRecords({ customerId });
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

async function getTherapistStats() {
    const customers = await getAllCustomers();
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let totalSessions = 0;
    let totalRevenue = 0;

    for (const customer of customers) {
        const records = await getAttendanceRecords({
            customerId: customer._id || customer.id,
            month: currentMonth,
            year: currentYear
        });

        totalSessions += records.length;
        totalRevenue += records.reduce((sum, r) => sum + r.price, 0);
    }

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
async function getMonthlyInvoiceData(customerId, month, year) {
    const customer = await getUserById(customerId);
    const records = await getAttendanceRecords({
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

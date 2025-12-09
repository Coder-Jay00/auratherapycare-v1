// AuraTherapyCare - Authentication
// Handles login and registration functionality

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const currentUser = getCurrentUser();
    if (currentUser && window.location.pathname.includes('index.html')) {
        redirectToDashboard(currentUser.role);
    }

    // Login Form Handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Registration Form Handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    // Clear previous errors
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');

    // Validate inputs
    if (!email || !password) {
        showError(errorDiv, 'Please enter both email and password');
        return;
    }

    // Attempt login
    const result = await loginUser(email, password);

    if (result.success) {
        // Redirect to appropriate dashboard
        redirectToDashboard(result.user.role);
    } else {
        showError(errorDiv, result.message);
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const phone = document.getElementById('registerPhone').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    const errorDiv = document.getElementById('registerError');
    const successDiv = document.getElementById('registerSuccess');

    // Clear previous messages
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
    successDiv.textContent = '';
    successDiv.classList.remove('show');

    // Validate inputs
    if (!name || !email || !phone || !password || !confirmPassword) {
        showError(errorDiv, 'Please fill in all fields');
        return;
    }

    if (!isValidEmail(email)) {
        showError(errorDiv, 'Please enter a valid email address');
        return;
    }

    if (password.length < 6) {
        showError(errorDiv, 'Password must be at least 6 characters long');
        return;
    }

    if (password !== confirmPassword) {
        showError(errorDiv, 'Passwords do not match');
        return;
    }

    // Attempt registration
    const result = await registerUser({
        name,
        email,
        phone,
        password
    });

    if (result.success) {
        showSuccess(successDiv, 'Registration successful! Redirecting to dashboard...');

        // Reset form
        document.getElementById('registerForm').reset();

        // Redirect to appropriate dashboard
        setTimeout(() => {
            redirectToDashboard(result.user.role);
        }, 2000);
    } else {
        showError(errorDiv, result.message);
    }
}

function redirectToDashboard(role) {
    if (role === 'therapist') {
        window.location.href = 'therapist-dashboard.html';
    } else if (role === 'customer') {
        window.location.href = 'customer-dashboard.html';
    }
}

function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
}

function showSuccess(element, message) {
    element.textContent = message;
    element.classList.add('show');
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function logout() {
    logoutUser();
    window.location.href = 'index.html';
}

// Protect dashboard pages
function protectPage(requiredRole) {
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
        window.location.href = 'index.html';
        return null;
    }
    
    if (requiredRole && currentUser.role !== requiredRole) {
        window.location.href = 'index.html';
        return null;
    }
    
    return currentUser;
}

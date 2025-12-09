const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Change in production

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Database setup
const db = new sqlite3.Database('./auracare.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Attendance table
    db.run(`CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      therapy_type TEXT NOT NULL,
      price REAL NOT NULL,
      recorded_by INTEGER NOT NULL,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES users (id),
      FOREIGN KEY (recorded_by) REFERENCES users (id)
    )`);

    // Insert admin user if not exists
    const adminEmail = 'coderjt25@gmail.com';
    const adminPassword = 'jayadmin2024';
    const adminName = 'Jay Thakkar';

    db.get('SELECT id FROM users WHERE email = ?', [adminEmail], (err, row) => {
      if (err) {
        console.error('Error checking admin user:', err.message);
      } else if (!row) {
        bcrypt.hash(adminPassword, 10, (err, hashedPassword) => {
          if (err) {
            console.error('Error hashing admin password:', err.message);
          } else {
            db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
              [adminName, adminEmail, hashedPassword, 'therapist'], (err) => {
              if (err) {
                console.error('Error inserting admin user:', err.message);
              } else {
                console.log('Admin user created successfully.');
              }
            });
          }
        });
      }
    });
  });
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// Routes

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    bcrypt.compare(password, user.password, (err, isValid) => {
      if (err) {
        return res.status(500).json({ error: 'Password comparison error' });
      }

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    });
  });
});

// Register
app.post('/api/register', (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  db.get('SELECT id FROM users WHERE email = ?', [email], (err, existingUser) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        return res.status(500).json({ error: 'Password hashing error' });
      }

      db.run('INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
        [name, email, hashedPassword, phone, 'customer'], function(err) {
        if (err) {
          return res.status(500).json({ error: 'User registration failed' });
        }

        const token = jwt.sign(
          { id: this.lastID, email, role: 'customer', name },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.status(201).json({
          token,
          user: {
            id: this.lastID,
            name,
            email,
            role: 'customer'
          }
        });
      });
    });
  });
});

// Get all users (therapist only)
app.get('/api/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'therapist') {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.all('SELECT id, name, email, phone, role, created_at FROM users ORDER BY name', [], (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(users);
  });
});

// Get user profile
app.get('/api/profile', authenticateToken, (req, res) => {
  db.get('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  });
});

// Add attendance (therapist only)
app.post('/api/attendance', authenticateToken, (req, res) => {
  if (req.user.role !== 'therapist') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { customerId, date, therapyType, price } = req.body;

  if (!customerId || !date || !therapyType || !price) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  db.run('INSERT INTO attendance (customer_id, date, therapy_type, price, recorded_by) VALUES (?, ?, ?, ?, ?)',
    [customerId, date, therapyType, price, req.user.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to add attendance' });
    }
    res.status(201).json({ id: this.lastID, message: 'Attendance added successfully' });
  });
});

// Get attendance for a customer
app.get('/api/attendance/:customerId', authenticateToken, (req, res) => {
  const { customerId } = req.params;

  // Allow therapists to view any customer's attendance, customers only their own
  if (req.user.role !== 'therapist' && req.user.id != customerId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.all('SELECT * FROM attendance WHERE customer_id = ? ORDER BY date DESC', [customerId], (err, records) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(records);
  });
});

// Get attendance for current month
app.get('/api/attendance/month/:customerId/:month/:year', authenticateToken, (req, res) => {
  const { customerId, month, year } = req.params;

  if (req.user.role !== 'therapist' && req.user.id != customerId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const startDate = `${year}-${month.padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  db.all('SELECT * FROM attendance WHERE customer_id = ? AND date BETWEEN ? AND ? ORDER BY date',
    [customerId, startDate, endDate], (err, records) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(records);
  });
});

// Get revenue data (therapist only)
app.get('/api/revenue/:month/:year', authenticateToken, (req, res) => {
  if (req.user.role !== 'therapist') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { month, year } = req.params;
  const startDate = `${year}-${month.padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  db.all(`
    SELECT u.name, u.id as customer_id,
           SUM(CASE WHEN a.therapy_type = 'Biolite' THEN 1 ELSE 0 END) as biolite_count,
           SUM(CASE WHEN a.therapy_type = 'Terahertz' THEN 1 ELSE 0 END) as terahertz_count,
           SUM(a.price) as total_amount
    FROM users u
    LEFT JOIN attendance a ON u.id = a.customer_id AND a.date BETWEEN ? AND ?
    WHERE u.role = 'customer'
    GROUP BY u.id, u.name
    ORDER BY u.name
  `, [startDate, endDate], (err, revenue) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Calculate totals
    const totals = revenue.reduce((acc, item) => ({
      biolite_count: acc.biolite_count + (item.biolite_count || 0),
      terahertz_count: acc.terahertz_count + (item.terahertz_count || 0),
      total_amount: acc.total_amount + (item.total_amount || 0)
    }), { biolite_count: 0, terahertz_count: 0, total_amount: 0 });

    res.json({ revenue, totals });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auracare', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB.');
  initializeDatabase();
}).catch(err => {
  console.error('Error connecting to MongoDB:', err.message);
});

// Define MongoDB schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  role: { type: String, required: true, default: 'customer' },
  created_at: { type: Date, default: Date.now }
});

const attendanceSchema = new mongoose.Schema({
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  therapy_type: { type: String, required: true },
  price: { type: Number, required: true },
  recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recorded_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);

// Initialize database
async function initializeDatabase() {
  try {
    // Check if admin user exists
    const adminEmail = 'coderjt25@gmail.com';
    const adminPassword = 'jayadmin2024';
    const adminName = 'Jay Thakkar';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const adminUser = new User({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: 'therapist'
      });
      await adminUser.save();
      console.log('Admin user created successfully.');
    }
  } catch (err) {
    console.error('Error initializing database:', err.message);
  }
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
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Register
app.post('/api/register', async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'customer'
    });

    const savedUser = await newUser.save();

    const token = jwt.sign(
      { id: savedUser._id, email, role: 'customer', name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: savedUser._id,
        name,
        email,
        role: 'customer'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'User registration failed' });
  }
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
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id, 'name email phone role created_at');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
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

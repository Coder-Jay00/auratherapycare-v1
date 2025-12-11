const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Change in production

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

const sseClients = new Set();
function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(msg); } catch (e) {}
  }
}
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
  res.write(`event: connected\ndata: {}\n\n`);
  sseClients.add(res);
  req.on('close', () => { sseClients.delete(res); });
});
setInterval(() => {
  for (const res of sseClients) {
    try { res.write(`:\n\n`); } catch (e) {}
  }
}, 30000);

// Database connection cache for serverless
let cachedDb = null;
let User = null;
let Attendance = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    if (!cachedDb) {
      const uri = process.env.MONGODB_URI || 'mongodb+srv://coderjt25_db_user:FEFg67BbbS0Y9kZ5@auratherapycare.yynkfxs.mongodb.net/';
      cachedDb = await mongoose.connect(uri, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      const dbName = mongoose.connection.name;
      const target = uri.startsWith('mongodb+srv://') ? 'Atlas SRV' : 'Direct host';
      console.log(`MongoDB connected: db="${dbName}", target=${target}`);
    }

    // Define models only once
    if (!User) {
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

      User = mongoose.model('User', userSchema);
      Attendance = mongoose.model('Attendance', attendanceSchema);

      // Initialize database
      await initializeDatabase();
    }

    return cachedDb;
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    throw err;
  }
}

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
    await connectToDatabase();
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
    console.error('Login error:', err);
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
    await connectToDatabase();
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
    broadcast('user_registered', { id: savedUser._id, name, email });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'User registration failed' });
  }
});

// Get all users (therapist only)
app.get('/api/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'therapist') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    await connectToDatabase();
    const users = await User.find({}, 'name email phone role created_at').sort({ name: 1 });
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    await connectToDatabase();
    const user = await User.findById(req.user.id, 'name email phone role created_at');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete user (therapist only)
app.delete('/api/users/:userId', authenticateToken, async (req, res) => {
  if (req.user.role !== 'therapist') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { userId } = req.params;

  // Prevent deleting the therapist themselves
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    await connectToDatabase();
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete all attendance records for this user
    await Attendance.deleteMany({ customer_id: userId });

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.json({ message: 'User and associated data deleted successfully' });
    broadcast('user_deleted', { id: userId });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Add attendance (therapist only)
app.post('/api/attendance', authenticateToken, async (req, res) => {
  if (req.user.role !== 'therapist') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { customerId, date, therapyType, price } = req.body;

  if (!customerId || !date || !therapyType || !price) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    await connectToDatabase();
    const attendance = new Attendance({
      customer_id: customerId,
      date,
      therapy_type: therapyType,
      price,
      recorded_by: req.user.id
    });

    const savedAttendance = await attendance.save();
    broadcast('attendance_added', { customerId, date, therapyType, price });
    res.status(201).json({
      id: savedAttendance._id,
      message: 'Attendance added successfully'
    });
  } catch (err) {
    console.error('Add attendance error:', err);
    res.status(500).json({ error: 'Failed to add attendance' });
  }
});

// Get attendance for a customer
app.get('/api/attendance/:customerId', authenticateToken, async (req, res) => {
  const { customerId } = req.params;

  // Allow therapists to view any customer's attendance, customers only their own
  if (req.user.role !== 'therapist' && req.user.id != customerId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    await connectToDatabase();
    const records = await Attendance.find({ customer_id: customerId })
      .populate('recorded_by', 'name')
      .sort({ date: -1 });
    res.json(records);
  } catch (err) {
    console.error('Get attendance error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get attendance for current month
app.get('/api/attendance/month/:customerId/:month/:year', authenticateToken, async (req, res) => {
  const { customerId, month, year } = req.params;

  if (req.user.role !== 'therapist' && req.user.id != customerId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const startDate = `${year}-${month.padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  try {
    await connectToDatabase();
    const records = await Attendance.find({
      customer_id: customerId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    res.json(records);
  } catch (err) {
    console.error('Get attendance month error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get revenue data (therapist only)
app.get('/api/revenue/:month/:year', authenticateToken, async (req, res) => {
  if (req.user.role !== 'therapist') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { month, year } = req.params;
  const startDate = `${year}-${month.padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  try {
    await connectToDatabase();
    const customers = await User.find({ role: 'customer' }).sort({ name: 1 });

    const revenue = [];
    let totals = { biolite_count: 0, terahertz_count: 0, total_amount: 0 };

    for (const customer of customers) {
      const records = await Attendance.find({
        customer_id: customer._id,
        date: { $gte: startDate, $lte: endDate }
      });

      const bioliteCount = records.filter(r => r.therapy_type === 'Biolite').length;
      const terahertzCount = records.filter(r => r.therapy_type === 'Terahertz').length;
      const totalAmount = records.reduce((sum, r) => sum + r.price, 0);

      if (records.length > 0) {
        revenue.push({
          customerName: customer.name,
          customer_id: customer._id,
          biolite_count: bioliteCount,
          terahertz_count: terahertzCount,
          total_sessions: records.length,
          total_amount: totalAmount
        });
      }

      totals.biolite_count += bioliteCount;
      totals.terahertz_count += terahertzCount;
      totals.total_amount += totalAmount;
    }

    res.json({ revenue, totals });
  } catch (err) {
    console.error('Get revenue error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Export for Vercel serverless functions
module.exports = app;

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  });
}

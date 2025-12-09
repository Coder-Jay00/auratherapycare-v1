const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Change in production

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Database setup
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://coderjt25_db_user:FEFg67BbbS0Y9kZ5@auratherapycare.yynkfxs.mongodb.net/').then(() => {
  console.log('Connected to MongoDB Atlas.');
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
app.get('/api/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'therapist') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const users = await User.find({}, 'name email phone role created_at').sort({ name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
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
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete all attendance records for this user
    await Attendance.deleteMany({ customer_id: userId });

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.json({ message: 'User and associated data deleted successfully' });
  } catch (err) {
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
    const attendance = new Attendance({
      customer_id: customerId,
      date,
      therapy_type: therapyType,
      price,
      recorded_by: req.user.id
    });

    const savedAttendance = await attendance.save();
    res.status(201).json({
      id: savedAttendance._id,
      message: 'Attendance added successfully'
    });
  } catch (err) {
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
    const records = await Attendance.find({ customer_id: customerId })
      .populate('recorded_by', 'name')
      .sort({ date: -1 });
    res.json(records);
  } catch (err) {
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
    const records = await Attendance.find({
      customer_id: customerId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    res.json(records);
  } catch (err) {
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
    res.status(500).json({ error: 'Database error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Database connection closed.');
  process.exit(0);
});

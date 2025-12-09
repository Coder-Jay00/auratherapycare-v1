# AuraTheracare - Therapy Attendance & Billing Tracker

A professional, secure, and fully responsive web application for managing client therapy attendance and calculating monthly billing for both customers and therapists.

## 🎯 Project Overview

**Project Name:** AuraTherapyCare
**Purpose:** Healthcare practitioners can efficiently manage therapy sessions and billing, while clients can track their attendance and export monthly invoices.

**Target Audience:** Healthcare practitioners (Therapists) and their clients (Customers)

## ✨ Key Features

### 🔐 Authentication System
- **Real email/password authentication** with role-based access control
- **Pre-configured Admin Account** (ready to use immediately)
- **Customer-only registration** (therapists use pre-configured account)
- Secure login/logout functionality
- Session management with localStorage

### 👨‍⚕️ Therapist Dashboard Features
- **Client Management**
  - View all registered clients
  - Search and filter clients
  - View client attendance history
  - Track individual client billing
  
- **Attendance Logging**
  - Interactive calendar view for attendance tracking
  - **Multiple therapies per day support**
  - Dual therapy checkboxes (can select Biolite, Terahertz, or both)
  - Visual indicators showing number of sessions per day
  - Add, view, and delete attendance records
  
- **Revenue Tracking**
  - Monthly revenue overview
  - Therapy-wise breakdown (Biolite vs Terahertz)
  - Client-wise revenue breakdown
  - Customizable month selection

### 👤 Customer Dashboard Features
- **Session Overview**
  - Total sessions count for current month
  - Total cost for current month
  - Last visit date display
  
- **Attendance Calendar**
  - Visual calendar showing all sessions
  - Day-wise session count display
  - Detailed session list with therapy types and costs
  
- **Monthly Invoice Export**
  - **Smart availability logic**: Disabled until 4th of month
  - **Exports previous month's data** from 4th onwards
  - Professional PDF generation with complete session details
  - Automatic download to device
  - Shows days remaining until export is available

### 💰 Fixed Pricing Model
- **Biolite Therapy:** ₹300 per session
- **Terahertz Therapy:** ₹400 per session

## 🔑 Login Credentials

### Admin/Therapist Account (Pre-configured)

### Test Customer Accounts
All test customer accounts use the password: **password123**

1. **Priya Sharma**
   - Email: priya@example.com
   - Password: password123

2. **Rahul Mehta**
   - Email: rahul@example.com
   - Password: password123

3. **Anjali Patel**
   - Email: anjali@example.com
   - Password: password123

4. **Vikram Singh**
   - Email: vikram@example.com
   - Password: password123

5. **Sneha Desai**
   - Email: sneha@example.com
   - Password: password123

## 📁 Project Structure

```
AuraTherapyCare/
├── index.html                    # Login page
├── register.html                 # Customer registration page
├── therapist-dashboard.html      # Therapist interface
├── customer-dashboard.html       # Customer interface
├── css/
│   └── style.css                # Complete styling (calming color palette)
├── js/
│   ├── data.js                  # Data management & localStorage handling
│   ├── auth.js                  # Authentication logic
│   ├── therapist-dashboard.js   # Therapist functionality
│   └── customer-dashboard.js    # Customer functionality
└── README.md                    # This file
```

## 🚀 Getting Started

### Option 1: Open Directly in Browser
1. Open `index.html` in any modern web browser
2. Use the login credentials provided above
3. Start using the application immediately!

### Option 2: Local Server (Recommended)
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js http-server
npx http-server

# Then open: http://localhost:8000
```

## 📖 Usage Instructions

### For Therapists

1. **Login**
   - Go to the login page
   - Use admin credentials

2. **View Clients**
   - Dashboard shows all registered clients
   - Search clients using the search box
   - View individual client attendance history
   - Track monthly sessions and costs per client

3. **Log Attendance**
   - Click "Attendance Calendar" in sidebar
   - Select a client from the dropdown
   - Click on any date in the calendar
   - Check one or both therapy types:
     - ☐ Biolite (₹300)
     - ☐ Terahertz (₹400)
   - Click "Save Attendance"
   - Multiple sessions can be added for the same day

4. **Track Revenue**
   - Click "Monthly Revenue" in sidebar
   - Select desired month
   - View breakdown by therapy type
   - See client-wise revenue details

5. **Manage Records**
   - View any client's attendance history
   - Delete incorrect records if needed

### For Customers

1. **Register/Login**
   - New customers: Click "Register as a Customer"
   - Fill in details and create account
   - Existing customers: Login with your credentials

2. **View Dashboard**
   - See your current month's session count
   - View total cost for the month
   - Check your last visit date

3. **Check Attendance**
   - Scroll to "Current Month Attendance" section
   - View calendar with your session dates
   - See detailed list of all sessions with dates and costs

4. **Export Monthly Invoice**
   - Available from the 4th day of each month
   - Exports previous month's complete data
   - Click "Export Monthly Invoice" button
   - PDF automatically downloads with:
     - Patient information
     - Complete session details
     - Date-wise breakdown
     - Total sessions and amount

## 🎨 Design Features

### Color Palette (Calming Healthcare Theme)
- **Primary Blue:** #4A90E2 (Trust, professionalism)
- **Secondary Green:** #7FCDBB (Healing, wellness)
- **Accent Teal:** #41B3A3 (Balance, serenity)
- **Background White:** #FFFFFF (Cleanliness, clarity)
- **Light Gray:** #F8FAFB (Subtle contrast)

### Responsive Design
- ✅ Desktop optimized (1920px+)
- ✅ Laptop friendly (1024px+)
- ✅ Tablet compatible (768px+)
- ✅ Mobile responsive (320px+)

### Accessibility
- Semantic HTML structure
- ARIA labels where appropriate
- High contrast text
- Clear focus indicators
- Readable fonts (Inter family)

## 🛠️ Technical Stack

- **Frontend:** Pure HTML5, CSS3, JavaScript (ES6+)
- **Calendar:** FullCalendar library v6.1.10
- **PDF Generation:** jsPDF v2.5.1 with autoTable plugin
- **Icons:** Font Awesome 6.4.0
- **Fonts:** Google Fonts (Inter)
- **Storage:** Browser localStorage (no backend required)

## 📊 Data Management

### User Data Structure
```javascript
{
  id: "unique-id",
  name: "Full Name",
  email: "email@example.com",
  password: "hashed-password",
  phone: "+91 XXXXX XXXXX",
  role: "customer" | "therapist",
  createdAt: "ISO-timestamp"
}
```

### Attendance Record Structure
```javascript
{
  id: "unique-record-id",
  customerId: "customer-id",
  date: "YYYY-MM-DD",
  therapyType: "Biolite" | "Terahertz",
  price: 300 | 400,
  recordedBy: "therapist-id",
  recordedAt: "ISO-timestamp"
}
```

## 🔒 Security Features

- Passwords stored in localStorage (for demo purposes)
- Session management with automatic logout
- Role-based access control (RBAC)
- Protected routes for dashboards
- Input validation on all forms

**Note:** This is a demo application using localStorage. For production use, implement:
- Backend API with proper authentication
- Database for secure data storage
- Password hashing (bcrypt)
- JWT tokens for session management
- HTTPS encryption

## 📱 Browser Compatibility

- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera
- ⚠️ IE11 (Limited support)

## 🐛 Known Limitations

1. **Data Persistence:** Uses localStorage - data is stored locally in the browser
2. **No Backend:** All data is client-side only
3. **Single Device:** Data doesn't sync across devices
4. **No Email Sending:** Export feature generates PDF only (no actual email)

## 🔄 Future Enhancements

- [ ] Backend API integration
- [ ] Real email notifications
- [ ] SMS reminders for appointments
- [ ] Multi-therapist support
- [ ] Appointment scheduling
- [ ] Payment gateway integration
- [ ] Data export to Excel/CSV
- [ ] Analytics dashboard
- [ ] Dark mode support

## 📄 License

This project is created for healthcare practice management. Free to use and modify for personal and educational purposes.

## 👨‍💻 Developer Information

**Developed for:** AuraTherapyCare Healthcare Services
**Version:** 1.0.0  
**Last Updated:** December 2024

## 🆘 Support & Troubleshooting

### Common Issues

**Q: I can't see my attendance records**  
A: Make sure you're viewing the correct month. Current month shows in the dashboard by default.

**Q: Export button is disabled**  
A: Export becomes available only from the 4th day of each month for the previous month's data.

**Q: Lost my data after clearing browser**  
A: Data is stored in localStorage. Clearing browser data will remove all records.

**Q: Can't login as therapist**  
A: Use the exact credentials: coderjt25@gmail.com / jayadmin2024

**Q: Multiple sessions not showing**  
A: Calendar shows a badge with session count. Click "View" to see all sessions for a date.

### Getting Help

For issues or questions:
1. Check this README thoroughly
2. Verify login credentials
3. Check browser console for errors (F12)
4. Clear browser cache and try again

## 🎉 Acknowledgments

- **FullCalendar** - Interactive calendar component
- **jsPDF** - PDF generation library
- **Font Awesome** - Icon library
- **Google Fonts** - Inter font family

---

**Ready to use!** Open `index.html` and start managing your therapy practice efficiently! 🏥✨

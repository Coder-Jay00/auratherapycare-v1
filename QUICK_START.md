# 🚀 AuraTheracare - Quick Start Guide

## 📋 Login Credentials

### 👨‍⚕️ Therapist/Admin Account
**For security reasons, admin credentials have been removed from this documentation.**

To obtain admin access:
- Contact your system administrator
- Configure credentials via environment variables
- See `DEPLOYMENT_GUIDE.md` for setup instructions

### 👥 Test Customer Accounts
**Test account credentials have been removed for security.**

For testing:
- Create new customer accounts via the registration page
- Use the registration form at `/register.html`
- All new accounts are created with customer role

## ⚡ 3-Minute Setup

### Step 1: Open the Application
Simply open `index.html` in your web browser. That's it! No installation needed.

### Step 2: Login as Therapist
```
1. Use: id/pass
2. You'll see the Therapist Dashboard with 5 test clients
```

### Step 3: Try Key Features

#### ✅ View Clients
- Already on the Clients page
- See all 5 test customers with sample data
- Use search box to filter

#### ✅ Log Attendance (Multiple Sessions Per Day!)
1. Click "Attendance Calendar" in sidebar
2. Select a client (e.g., Priya Sharma)
3. Click any date on the calendar
4. Check **one or both** therapy types:
   - ☐ Biolite (₹300)
   - ☐ Terahertz (₹400)
5. Click "Save Attendance"
6. Calendar shows badge with session count!

#### ✅ View Revenue
1. Click "Monthly Revenue" in sidebar
2. See breakdown by therapy type
3. Change month to view historical data

### Step 4: Login as Customer
```
1. Logout (top-right button)
2. Create a new customer account via registration
3. Login with your new credentials
4. See customer dashboard with attendance and invoices
```

### Step 5: Export Invoice (If Available)
- **Available from 4th of month** for previous month
- Click "Export Monthly Invoice" button
- Professional PDF downloads automatically!

## 🎯 Key Features to Test

### Multiple Sessions Same Day ⭐
```
The BIG feature: Can add both Biolite AND Terahertz on same date!
- Select client in calendar
- Click a date
- Check BOTH therapy checkboxes
- Save → Creates 2 separate records
- Calendar shows "2" badge
```

### Smart Export Logic 🗓️
```
Before 4th: Button disabled with countdown
On/After 4th: Button enabled, exports previous month
Example: On April 5th → Export all March data
```

### Visual Calendar Indicators 📅
```
- Single therapy: Shows "1 session"
- Both therapies: Shows "2 sessions"
- Multiple days: Each has its own count
- Color coding: Blue (Biolite), Orange (Terahertz)
```

## 🎨 Interface Overview

### Therapist Dashboard
```
├── Clients Tab (Default)
│   ├── Client list with stats
│   ├── Search functionality
│   └── View attendance history
│
├── Attendance Calendar Tab
│   ├── Select client dropdown
│   ├── Interactive calendar
│   ├── Click date → Modal with dual checkboxes
│   └── Visual session indicators
│
└── Monthly Revenue Tab
    ├── Therapy-wise breakdown
    ├── Client-wise breakdown
    └── Month selector
```

### Customer Dashboard
```
├── Welcome Section
│   └── Personalized greeting
│
├── Stats Overview
│   ├── Total sessions this month
│   ├── Total cost this month
│   └── Last visit date
│
├── Export Section ⭐
│   ├── Availability status
│   ├── Export button (smart logic)
│   └── Previous month's invoice PDF
│
└── Attendance Section
    ├── Visual calendar
    └── Detailed session list
```

## 💡 Pro Tips

1. **Multiple Sessions:** You can add multiple therapy sessions for the same client on the same day - just check both boxes!

2. **Calendar Navigation:** Use the calendar navigation (prev/next/today) to view different months and add historical data.

3. **Search Clients:** Type any part of name, email, or phone to quickly find clients.

4. **Delete Records:** View any client's attendance history and delete incorrect entries.

5. **Test Export:** Change your system date to 4th or later to test the export feature if today's date is before 4th.

6. **Sample Data:** The app comes with sample attendance data for all 5 test customers - explore it!

## 🔄 Test Workflow

### Complete Therapist Workflow
```
1. Login as therapist
2. View existing clients → ✅
3. Select a client in calendar → ✅
4. Add BOTH therapies for today → ✅
5. Check calendar shows "2" badge → ✅
6. View revenue page → ✅
7. See updated totals → ✅
```

### Complete Customer Workflow
```
1. Login as customer (priya@example.com)
2. View dashboard stats → ✅
3. Check current month sessions → ✅
4. Check export button status → ✅
5. (If available) Export PDF invoice → ✅
```

## 🎓 Learning the System

### For New Therapists
```
Start Here:
1. Login with admin credentials
2. Explore the Clients tab first
3. Click "View" on any client to see their history
4. Try adding attendance via calendar
5. Check the revenue breakdown
```

### For New Customers
```
Start Here:
1. Login with any test customer account
2. Explore your dashboard
3. Check your session history
4. Try the export feature (if available)
```

## 📊 Sample Data Included

The application comes pre-loaded with:
- ✅ 5 test customer accounts
- ✅ 3-8 sessions per customer
- ✅ Mix of Biolite and Terahertz therapies
- ✅ Some days with BOTH therapies
- ✅ Data spanning current and previous month

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't login | Use exact credentials (case-sensitive) |
| No data showing | Check if viewing correct month |
| Export disabled | Must be 4th of month or later |
| Calendar empty | Select a client first |
| Sessions not saving | Check both therapy boxes are working |

## 🎉 You're Ready!

The application is fully functional and ready to use. All features work out of the box:

✅ Authentication system  
✅ Multiple therapy sessions per day  
✅ Interactive calendar  
✅ Revenue tracking  
✅ PDF invoice export  
✅ Sample test data  
✅ Responsive design  

**Just open `index.html` and start exploring!** 🚀

---

Need more details? Check the complete [README.md](README.md) file.

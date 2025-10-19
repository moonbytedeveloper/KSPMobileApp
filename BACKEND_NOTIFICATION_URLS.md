# Backend Notification URLs for erp.kspconsults.com

## 🚀 Universal URLs for Backend Notifications

Your backend should send these universal URLs in notification payloads:

### **Base URL:** `https://erp.kspconsults.com`

---

## 📱 **Main App Screens**

### **Home/Dashboard**
```json
{
  "notification": {
    "title": "Welcome to KSP",
    "body": "Check your dashboard for updates"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/main"
  }
}
```

### **Profile**
```json
{
  "notification": {
    "title": "Profile Update",
    "body": "Your profile has been updated"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/profile"
  }
}
```

---

## ⏰ **Timesheet Notifications**

### **Timesheet Management**
```json
{
  "notification": {
    "title": "Timesheet Reminder",
    "body": "Don't forget to submit your timesheet"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/timesheet"
  }
}
```

### **Timesheet Approval**
```json
{
  "notification": {
    "title": "Timesheet Approval",
    "body": "You have timesheets pending approval"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/timesheet/approval"
  }
}
```

### **Pending Timesheets**
```json
{
  "notification": {
    "title": "Pending Timesheets",
    "body": "You have pending timesheets to review"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/timesheet/pending"
  }
}
```

### **Worklist Management**
```json
{
  "notification": {
    "title": "Worklist Update",
    "body": "Your worklist has been updated"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/timesheet/manage-worklist"
  }
}
```

---

## 💰 **Expense Notifications**

### **Expense Management**
```json
{
  "notification": {
    "title": "Expense Reminder",
    "body": "Submit your expense reports"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/expense"
  }
}
```

### **Expense Approval**
```json
{
  "notification": {
    "title": "Expense Approval",
    "body": "You have expenses pending approval"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/expense/approval"
  }
}
```

### **Add Expense**
```json
{
  "notification": {
    "title": "New Expense",
    "body": "Add your new expense"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/expense/add"
  }
}
```

---

## 🏢 **Business Development Notifications**

### **Business Development**
```json
{
  "notification": {
    "title": "Business Development",
    "body": "Check new opportunities"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/business-development"
  }
}
```

### **Lead Management**
```json
{
  "notification": {
    "title": "New Lead",
    "body": "You have a new lead to follow up"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/leads"
  }
}
```

### **Lead Follow-up**
```json
{
  "notification": {
    "title": "Lead Follow-up",
    "body": "Follow up on your leads"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/leads/follow-up"
  }
}
```

### **Lead Proposal**
```json
{
  "notification": {
    "title": "Lead Proposal",
    "body": "New proposal ready for review"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/leads/proposal"
  }
}
```

---

## 👥 **HRA Notifications**

### **HRA Attendance**
```json
{
  "notification": {
    "title": "Attendance Update",
    "body": "Check your attendance records"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/hra"
  }
}
```

### **Leave Management**
```json
{
  "notification": {
    "title": "Leave Request",
    "body": "You have a new leave request"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/leave/manage"
  }
}
```

### **Leave Application**
```json
{
  "notification": {
    "title": "Apply Leave",
    "body": "Apply for your leave"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/leave/apply"
  }
}
```

### **View Attendance**
```json
{
  "notification": {
    "title": "Attendance Report",
    "body": "View attendance details"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/hra/view-attendance"
  }
}
```

---

## 👑 **Admin Notifications**

### **Admin Dashboard**
```json
{
  "notification": {
    "title": "Admin Dashboard",
    "body": "Check admin dashboard for updates"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/admin"
  }
}
```

### **All Leads**
```json
{
  "notification": {
    "title": "All Leads",
    "body": "Review all leads in the system"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/admin/leads"
  }
}
```

### **All Proposals**
```json
{
  "notification": {
    "title": "All Proposals",
    "body": "Review all proposals"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/admin/proposals"
  }
}
```

### **Payment Status**
```json
{
  "notification": {
    "title": "Payment Status",
    "body": "Check payment status updates"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/admin/payments"
  }
}
```

### **Employee Reports**
```json
{
  "notification": {
    "title": "Employee Report",
    "body": "View employee working reports"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/admin/employees"
  }
}
```

### **Hours Report**
```json
{
  "notification": {
    "title": "Hours Report",
    "body": "View total hours reported"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/admin/hours"
  }
}
```

### **Invoice Report**
```json
{
  "notification": {
    "title": "Invoice Report",
    "body": "View invoice reports"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/admin/invoices"
  }
}
```

---

## 🎯 **Other Notifications**

### **Holiday**
```json
{
  "notification": {
    "title": "Holiday Notice",
    "body": "Check upcoming holidays"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/holiday"
  }
}
```

### **Notifications**
```json
{
  "notification": {
    "title": "New Notification",
    "body": "You have a new notification"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/notifications"
  }
}
```

### **Total Project**
```json
{
  "notification": {
    "title": "Project Update",
    "body": "Check total project status"
  },
  "data": {
    "universalLink": "https://erp.kspconsults.com/total-project"
  }
}
```

---

## 🔧 **Alternative Notification Formats**

### **Using Screen Name (Alternative)**
```json
{
  "notification": {
    "title": "Timesheet Reminder",
    "body": "Submit your timesheet"
  },
  "data": {
    "screen": "Timesheet",
    "params": "{\"userId\":\"123\",\"action\":\"submit\"}"
  }
}
```

### **Using Deep Link (Alternative)**
```json
{
  "notification": {
    "title": "Quick Access",
    "body": "Open app directly"
  },
  "data": {
    "deepLink": "kspapp://timesheet"
  }
}
```

---

## 📋 **Backend Implementation Example**

### **Node.js/Express Example:**
```javascript
const sendNotification = async (userId, title, body, screen) => {
  const notificationPayload = {
    notification: {
      title: title,
      body: body
    },
    data: {
      universalLink: `https://erp.kspconsults.com/${screen}`
    }
  };
  
  // Send to FCM
  await admin.messaging().sendToDevice(userToken, notificationPayload);
};
```

### **PHP Example:**
```php
function sendNotification($userId, $title, $body, $screen) {
    $payload = [
        'notification' => [
            'title' => $title,
            'body' => $body
        ],
        'data' => [
            'universalLink' => "https://erp.kspconsults.com/{$screen}"
        ]
    ];
    
    // Send to FCM
    sendFCMNotification($userToken, $payload);
}
```

---

## 🎯 **Quick Reference URLs**

| Screen | URL |
|--------|-----|
| Home | `https://erp.kspconsults.com/main` |
| Timesheet | `https://erp.kspconsults.com/timesheet` |
| Expense | `https://erp.kspconsults.com/expense` |
| Profile | `https://erp.kspconsults.com/profile` |
| Admin | `https://erp.kspconsults.com/admin` |
| Business Dev | `https://erp.kspconsults.com/business-development` |
| HRA | `https://erp.kspconsults.com/hra` |
| Leave | `https://erp.kspconsults.com/leave` |

These URLs will automatically navigate users to the correct screens in your app when they tap the notifications! 🚀

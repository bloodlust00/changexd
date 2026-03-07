# How to Run ChangeX Dashboard

## Prerequisites
- Node.js installed on your PC
- MongoDB installed and running

## Quick Start

### Option 1: Using the provided scripts

#### Step 1: Start MongoDB (if not already running)
MongoDB should be running on `localhost:27017`

#### Step 2: Start the Backend Server
1. Open PowerShell or Command Prompt
2. Navigate to the server directory:
   ```powershell
   cd C:\Users\Honey\changex-dashboard\server
   ```
3. Start the server:
   ```powershell
   node server.js
   ```
   
   You should see:
   ```
   🚀 Server running on http://localhost:3000
   ✅ Connected to MongoDB
   ```

#### Step 3: Open the Website
1. Open another PowerShell window or navigate to the main directory:
   ```powershell
   cd C:\Users\Honey\changex-dashboard
   ```
2. Open the website in your default browser:
   ```powershell
   Start-Process index.html
   ```
   
   Or simply double-click `index.html` in File Explorer

---

### Option 2: Using Background Process (recommended)

#### Start Server in Background
```powershell
cd C:\Users\Honey\changex-dashboard\server
Start-Process node -ArgumentList "server.js" -WindowStyle Hidden
```

#### Open Website
```powershell
Start-Process "C:\Users\Honey\changex-dashboard\index.html"
```

---

## Stopping the Server

### Find the Node process:
```powershell
Get-Process node
```

### Stop the server:
```powershell
Stop-Process -Name node
```

Or if you have multiple Node processes:
```powershell
Get-Process node | Where-Object {$_.Path -like "*changex*"} | Stop-Process
```

---

## Troubleshooting

### Server won't start
- Make sure MongoDB is running
- Check if port 3000 is already in use:
  ```powershell
  netstat -ano | findstr :3000
  ```

### Dependencies missing
If you see errors about missing packages, install dependencies:
```powershell
cd C:\Users\Honey\changex-dashboard\server
npm.cmd install
```

### PowerShell execution policy error
Use `npm.cmd` instead of `npm`:
```powershell
npm.cmd install
npm.cmd start
```

---

## Default Credentials (if needed)
You can create an account using the signup page or login with existing credentials.

---

## Features Now Working
✅ Backend API server on http://localhost:3000
✅ MongoDB authentication system
✅ **Logout button** - Clears session and redirects to login
✅ User signup/login functionality

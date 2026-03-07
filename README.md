# ChangeX Dashboard

A factory changeover management dashboard with authentication.

## Project Structure

```
changex-dashboard/
├── index.html              # Home/Dashboard page
├── login.html              # Login page
├── signup.html             # Sign up page
├── running-line.html       # Running Line Changeover page
├── factory-detail.html     # Factory detail view
├── upcoming.html           # Upcoming Changeovers page
├── live-tracking.html      # Live CO Tracking page
├── alerts.html             # Alerts page
├── styles.css              # Stylesheet
├── README.md               # This file
└── server/                 # Backend server
    ├── server.js           # Express server with MongoDB
    ├── package.json        # Node.js dependencies
    └── .env.example        # Environment variables template
```

## Setup Instructions

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (local) OR [MongoDB Atlas](https://www.mongodb.com/atlas) (cloud)

### 2. Install MongoDB (Local)

**Windows:**
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Run the installer and follow the setup wizard
3. MongoDB will run as a Windows service automatically

**Or use MongoDB Atlas (Cloud):**
1. Create a free account at https://www.mongodb.com/atlas
2. Create a cluster and get your connection string
3. Update the `MONGODB_URI` in `.env`

### 3. Setup Backend Server

```bash
# Navigate to server folder
cd changex-dashboard/server

# Install dependencies
npm install

# Create .env file (copy from example)
copy .env.example .env

# Start the server
npm start
```

The server will run on `http://localhost:3000`

### 4. Open the Dashboard

Simply open `login.html` in your browser, or use a local server:

```bash
# Using Python (if installed)
python -m http.server 8080

# Using Node.js
npx serve
```

Then navigate to `http://localhost:8080/login.html`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/signup` | Create new user account |
| POST | `/api/login` | User login (returns JWT token) |
| GET | `/api/profile` | Get user profile (protected) |
| GET | `/api/health` | Health check |

## Demo Mode

If the backend server is not running, the login form will automatically redirect to the dashboard in "demo mode" after 1.5 seconds.

## Technologies Used

- **Frontend:** HTML5, CSS3, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens), bcrypt

## Features

- ✅ User authentication (signup/login)
- ✅ Dashboard with factory statistics
- ✅ Factory detail views with line information
- ✅ Upcoming changeovers tracking
- ✅ Live changeover tracking with progress bars
- ✅ Alerts system
- ✅ Responsive design
- ✅ Professional UI with hover effects

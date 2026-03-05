# Food Donation & Management Platform

A full-stack web application designed to facilitate food donation and distribution. This platform connects donors with surplus food to NGOs and volunteers, helping to reduce food waste and feed those in need. It features a real-time map for pickups, a dashboard for managing donations, and analytics for tracking impact.

## ✨ Features

-   **User Roles:** Donor, Volunteer, NGO, and Admin roles with different permissions.
-   **Donations:** Donors can create and manage food donations.
-   **Robust Routing & Geocoding:** Automatically handles pickup coordinates using external mapping services dynamically.
-   **Pickups:** Volunteers can view available pending donations and schedule pickups.
-   **Live Map:** Real-time map to visualize donation locations via WebSockets.
-   **Admin Dashboard:** Admins can manage users, donations, and view analytics.
-   **Notifications:** Users receive notifications about donation status and pickups.

## 🛠️ Tech Stack

### Backend
-   **Runtime:** [Node.js](https://nodejs.org/) (v18+)
-   **Framework:** [Express.js](https://expressjs.com/)
-   **Database:** [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/) (using Transactions)
-   **Authentication:** JSON Web Tokens (JWT)
-   **Task Scheduling:** Node-Cron for reliable background tasks
-   **Real-time:** Socket.io

### Frontend
-   **Framework:** Vanilla JavaScript, HTML5, CSS3
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Mapping:** Mapbox / Leaflet mapping library

## 📂 Project Structure

```text
food-management-system/
├── backend/          # Backend server code
│   ├── controllers/  # Route request handlers
│   ├── middleware/   # Express middleware (Auth, Error Handling, Validation)
│   ├── models/       # Mongoose schemas
│   ├── routes/       # REST API routes
│   ├── config/       # DB, environment, and logger configurations
│   ├── services/     # Core business logic (Geocoding, Donations, Cron Jobs)
│   ├── sockets/      # Socket.io event configurations
│   └── server.js     # Main server entry point
└── frontend/         # Served client application (HTML, CSS, JS)
    ├── css/
    ├── images/
    ├── js/
    └── *.html
```

## 🚀 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/en/download/) (v18 or higher)
-   [npm](https://www.npmjs.com/get-npm)
-   [MongoDB](https://www.mongodb.com/try/download/community) installed and running, or a MongoDB Atlas cluster.

### 1. Clone the Repository

```bash
git clone https://github.com/Shivakumar-stack/food-management-system.git
cd food-management-system
```

### 2. Install Dependencies & Run

#### Backend Setup

Open a terminal in the root directory:

```bash
npm install
npm start
```

The backend server will run on `http://localhost:5000` and automatically serve the API.

#### Frontend Setup

Open a separate terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
npm run serve
```

The frontend will start a live-server precisely on `http://localhost:5500`. Navigate to this URL in your browser.

## 🛡️ Recent Architectural Improvements

- **Service Layer Pattern**: Heavy business logic (such as donor policy validations, scoring priority, and geocoding) has been abstracted from controllers into modular `/services` for high cohesion and testability.
- **Mongoose Transactions**: Critical, multi-collection database mutations (like claiming a pickup) are enveloped in robust transactions for strict atomicity and safe rollbacks.
- **Node-cron Scheduler**: Background loops for auto-expiring old donations have been abstracted into a designated cron service instead of polluting the app lifecycle.
- **Granular Rate Limiting**: Targeted API request restrictions explicitly added over Authentication routes to curb brute-force login attempts.
- **DRY Validation Request Handling**: Validation mapping extracted to centralized express middleware functions out of local controllers.

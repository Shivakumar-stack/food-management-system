# Food Donation & Management Platform

A full-stack web application designed to facilitate food donation and distribution. This platform connects donors with surplus food to NGOs and volunteers, helping to reduce food waste and feed those in need. It features a real-time map for pickups, a dashboard for managing donations, and analytics for tracking impact.

## ✨ Features

-   **User Roles:** Donor, Volunteer, NGO, and Admin roles with different permissions.
-   **Donations:** Donors can create and manage food donations.
-   **Pickups:** Volunteers can view available donations and schedule pickups.
-   **Live Map:** Real-time map to visualize donation locations.
-   **Admin Dashboard:** Admins can manage users, donations, and view analytics.
-   **Notifications:** Users receive notifications about donation status and pickups.

## 🛠️ Tech Stack

### Backend
-   **Runtime:** [Node.js](https://nodejs.org/)
-   **Framework:** [Express.js](https://expressjs.com/)
-   **Database:** [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
-   **Authentication:** JSON Web Tokens (JWT)

### Frontend
-   **Framework:** Vanilla JavaScript, HTML5, CSS3
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Mapping:** [Mapbox](https://www.mapbox.com/) or a similar mapping library

## 📂 Project Structure

```
food-management-system/
├── backend/
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Express middleware
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API routes
│   ├── config/           # DB, env, logger configuration
│   └── server.js         # Main server entry point
└── frontend/
    ├── js/               # JavaScript files for each page
    ├── css/              # CSS files
    ├── images/           # Image assets
    └── *.html            # HTML files for each page
```

## 🚀 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/en/download/) (v14 or higher)
-   [npm](https://www.npmjs.com/get-npm)
-   [MongoDB](https://www.mongodb.com/try/download/community) installed and running, or a MongoDB Atlas cluster.

### 1. Clone the Repository

```bash
git clone https://github.com/Shivakumar-stack/food-management-system.git
cd food-management-system
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory. You can use `.env.example` as a template:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

### 4. Running the Application

1.  **Start the Backend Server:**
    ```bash
    cd ../backend
    npm start
    ```
    The server will be running on `http://localhost:5000`.

2.  **Start the Frontend:**
    Open the `.html` files in the `frontend` directory in your browser. For a better experience with live reloading during development, you can use a simple live server.

    ```bash
    # If you have live-server installed globally
    cd ../frontend
    live-server
    ```


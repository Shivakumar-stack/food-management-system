
# FoodBridge: Food Donation & Management Platform

[![CI](https://github.com/Shivakumar-stack/food-management-system/actions/workflows/ci.yml/badge.svg)](https://github.com/Shivakumar-stack/food-management-system/actions/workflows/ci.yml)

FoodBridge is a full-stack web application designed to connect food donors (restaurants, hotels, individuals) with NGOs and volunteers. The platform facilitates the efficient collection and distribution of surplus food to those in need, reducing food waste and helping communities.

## ✨ Features

- **Role-Based Access Control:** Separate registration and dashboards for Donors, Volunteers, NGOs, and Administrators.
- **Donation Management:** Donors can easily create, track, and manage their food donations.
- **Volunteer Coordination:** Volunteers can browse available donations, accept pickup tasks, and update delivery status.
- **NGO Claiming System:** NGOs can view and claim available donations to distribute to their communities.
- **Admin Dashboard:** Administrators have access to system-wide analytics, user management, and overall activity monitoring.
- **Interactive Live Map:** A real-time map view shows the location of available food donations, helping volunteers and NGOs to respond quickly.
- **Notification System:** Users receive timely notifications about donation status, pickup assignments, and claims.

## 📸 Screenshots

*(Add screenshots of your application here. For example: Home Page, Donor Dashboard, Volunteer View, Admin Analytics)*

---

## 🛠️ Tech Stack

### Backend
- **Framework:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JSON Web Tokens (JWT)
- **Linting:** ESLint

### Frontend
- **Templating:** HTML
- **Styling:** Tailwind CSS
- **Client-side JS:** Vanilla JavaScript (Fetch API)

### DevOps
- **CI/CD:** GitHub Actions

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v14 or later)
- [MongoDB](https://www.mongodb.com/try/download/community) (local instance or a cloud-hosted solution like MongoDB Atlas)
- `npm` (comes with Node.js)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Shivakumar-stack/food-management-system.git
    cd food-management-system
    ```

2.  **Setup Backend:**
    ```bash
    cd backend
    npm install
    ```
    - Create a `.env` file in the `backend` directory by copying the example:
      ```bash
      cp .env.example .env
      ```
    - Update the `.env` file with your configuration:
      ```
      NODE_ENV=development
      PORT=5000
      MONGO_URI=<YOUR_MONGODB_CONNECTION_STRING>
      JWT_SECRET=<YOUR_JWT_SECRET>
      JWT_EXPIRES_IN=30d
      ```

3.  **Setup Frontend:**
    *(The frontend seems to be static HTML/CSS/JS, so no build step is explicitly required based on the project structure. If you have a build process, add the steps here.)*

---

##  Usage

1.  **Start the backend server:**
    ```bash
    cd backend
    npm start
    ```
    The server will be running at `http://localhost:5000`.

2.  **Open the frontend:**
    - Open the `index.html` file from the `frontend` directory in your web browser.
    - The application should now be running and connected to your local backend.

---

## 📁 Folder Structure

```
food-management-system/
├── .github/              # GitHub Actions CI workflow
├── backend/
│   ├── controllers/      # Application logic (request handlers)
│   ├── models/           # Mongoose data models
│   ├── routes/           # Express API routes
│   ├── middleware/       # Custom middleware (auth, error handling)
│   ├── config/           # DB connection, environment variables
│   ├── .env.example      # Example environment variables
│   └── server.js         # Backend entry point
└── frontend/
    ├── css/              # Tailwind CSS and custom styles
    ├── js/               # Frontend JavaScript files
    └── *.html            # HTML pages
```

---

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute, please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.

---

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

# 🚨 HAERMS — Highway Accident Emergency Response Management System

> A real-time, web-based emergency coordination platform that connects **Citizens**, **Police**, **Ambulance**, and **Hospital** units for rapid highway accident response.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

---

## 📘 About

Highway accidents require immediate and coordinated response from police, ambulance, and hospitals. Delay in response time increases fatality risk.

**HAERMS** eliminates manual control room dependency by providing:

- 🚀 **Faster emergency response** via automated dispatch
- 📡 **Real-time communication** using WebSockets (Socket.IO)
- 📍 **GPS-based location tracking** with Haversine nearest-resource algorithm
- 📋 **Digital incident lifecycle logging** from report to closure

---

## 🏗️ System Architecture

```
Citizen (SOS Report)
        ↓
Backend API (Node.js + Express)
        ↓
Auto Assignment Engine (Haversine formula)
        ↓
Police Dashboard  +  Ambulance Dashboard
        ↓
Hospital Panel
        ↓
Incident Closed & Logged
```

---

## 🧩 Modules

| Module | Description |
|---|---|
| **🆘 Citizen Portal** | SOS button with auto GPS capture, accident type selection, real-time tracking |
| **🚔 Police Dashboard** | Real-time assignment alerts, status updates (Assigned → Arrived → Secured) |
| **🚑 Ambulance Dashboard** | Dispatch alerts, ETA updates, patient condition reporting, hospital transport |
| **🏥 Hospital Panel** | Incoming emergency notifications, bed availability, admission confirmation |
| **👑 Admin Dashboard** | Global incident overview, manual dispatch override, response analytics |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML, CSS (Glassmorphism Dark Theme), JavaScript |
| **Backend** | Node.js + Express.js |
| **Database** | MongoDB (Atlas) |
| **Real-Time** | Socket.IO |
| **Maps** | OpenStreetMap + Leaflet.js |
| **Authentication** | JWT (JSON Web Tokens) |
| **AI Integration** | Google Gemini API |

---

## 📂 Project Structure

```
govt-project/
├── public/                  # Frontend (static HTML/CSS/JS)
│   ├── index.html           # Login / Register page
│   ├── citizen.html         # Citizen SOS portal
│   ├── police.html          # Police patrol dashboard
│   ├── ambulance.html       # Ambulance crew dashboard
│   ├── hospital.html        # Hospital staff panel
│   ├── admin.html           # Admin oversight dashboard
│   ├── login.html           # Alternate login page
│   ├── css/style.css        # Global design system
│   └── js/
│       ├── auth.js          # Auth helpers (JWT, API requests)
│       └── socket.js        # Socket.IO client setup
│
├── server/                  # Backend (Node.js + Express)
│   ├── server.js            # Main entry point
│   ├── .env                 # Environment variables
│   ├── package.json
│   ├── models/
│   │   ├── User.js          # User schema (Citizen/Police/Ambulance/Hospital/Admin)
│   │   ├── Incident.js      # Incident lifecycle schema
│   │   └── Hospital.js      # Hospital info & bed availability
│   ├── routes/
│   │   ├── auth.js          # Register / Login endpoints
│   │   ├── incidents.js     # Incident CRUD & status management
│   │   ├── hospitals.js     # Hospital data endpoints
│   │   └── users.js         # User management endpoints
│   ├── middleware/
│   │   └── auth.js          # JWT verification middleware
│   └── utils/
│       └── seed.js          # Database seeder (demo data)
│
├── SRS.md                   # Software Requirements Specification
├── README.md                # This file
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or later)
- **MongoDB** (Atlas cloud or local instance)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/PraveenKumarinstaking/govt-project.git
cd govt-project
```

### 2. Install Dependencies

```bash
cd server
npm install
```

### 3. Configure Environment

Create a `.env` file inside the `server/` directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Seed Demo Data

```bash
npm run seed
```

This populates the database with demo users and hospitals around Chennai, Tamil Nadu.

### 5. Start the Server

```bash
npm start
```

The application will be available at **http://localhost:5000**

---

## 🔑 Demo Credentials

All demo accounts use password: **`1234`**

| Role | Email | Dashboard |
|---|---|---|
| 🧑 Citizen | `citizen@demo.com` | SOS Portal |
| 🚔 Police | `police1@demo.com` | Patrol Dashboard |
| 🚑 Ambulance | `ambulance1@demo.com` | Ambulance Dashboard |
| 🏥 Hospital | `hospital@demo.com` | Hospital Panel |
| 👑 Admin | `admin@demo.com` | Admin Dashboard |

---

## 🔄 Incident Lifecycle

```
NEW → ASSIGNED → IN_PROGRESS → PATIENT_ADMITTED → CLOSED
```

1. **Citizen** clicks SOS → GPS auto-captured → incident created
2. **Backend** calculates nearest police & ambulance (Haversine formula)
3. **Real-time** WebSocket notifications sent to assigned units
4. **Police** arrive, secure scene, update status
5. **Ambulance** transports patient → hospital alerted
6. **Hospital** confirms admission → incident closed

---

## 🔒 Security Features

- 🔐 JWT-based authentication
- 🛡️ Role-based access control (RBAC)
- ✅ Input validation & sanitization
- 🔒 CORS protection
- 📝 Incident audit trail with timestamps

---

## 🗺️ Nearest Resource Algorithm

The system uses the **Haversine formula** to calculate the geographic distance between two GPS coordinates:

```
Distance = 2R × arcsin(√a)
```

Where **R = 6,371 km** (Earth's radius). The system selects the available resource with the minimum distance to the incident.

---

## 📈 Future Enhancements

- 🤖 AI-based accident detection via CCTV
- 🧠 Machine learning severity prediction
- 🚦 Traffic control system integration
- 📱 Native mobile application
- 🛸 Drone surveillance integration

---

## 🎯 Applications

- National Highways Authority of India (NHAI)
- Smart City Mission projects
- Tamil Nadu Government Highways
- Emergency Management Systems
- Disaster Response Coordination

---

## 📄 License

This project is developed for academic and government use.

---

<p align="center">
  <strong>Built with ❤️ for safer highways</strong><br>
  <em>Highway Accident Emergency Response Management System</em>
</p>

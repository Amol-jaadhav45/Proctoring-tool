<div align="center">

#  ProctAI — AI-Powered Exam Proctoring System

**Real-time AI proctoring with face detection, gaze tracking, object detection, and live WebRTC monitoring.**

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Convex](https://img.shields.io/badge/Convex-Backend-FF6B35?logo=convex&logoColor=white)](https://convex.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## 📖 Overview

ProctAI is a full-stack AI-powered online exam proctoring system designed to ensure exam integrity through real-time monitoring. It combines **computer vision AI** (face detection, gaze analysis, prohibited object detection) with **live video streaming** via WebRTC, all managed through an intuitive dashboard for students, proctors, and administrators.

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🔐 **Role-Based Auth** | Separate flows for Students, Proctors (Instructors), and Admins |
| 🧠 **AI Violation Detection** | Face missing, multiple faces, gaze aversion, prohibited objects (phones) |
| 📹 **Live WebRTC Monitoring** | Proctors can watch student camera feeds in real-time via MediaSoup SFU |
| 📊 **Credibility Scoring** | Dynamic risk scoring based on AI events with configurable policies |
| 📝 **Exam Management** | Create, schedule, and manage MCQ-based exams with timed sessions |
| 🔔 **Real-Time Notifications** | Instant alerts for violations, warnings, and proctor actions |
| 🎯 **Pre-Exam Verification** | Liveness check + ID card verification before exam starts |
| 📈 **Analytics Dashboard** | Comprehensive insights for admins with charts and statistics |
| 🏫 **Institute Management** | Multi-institute support with branches |
| 📧 **Email Invitations** | Invite proctors/admins via email with Resend integration |

---

## 🏗️ Architecture

```
proctoring-system/
├── client/          → React 19 + Vite + Tailwind CSS (Frontend SPA)
├── server/          → Express + Socket.IO + MediaSoup (Signaling & WebRTC)
├── convex/          → Convex Backend (Database, Auth, Mutations, Queries)
├── ai-worker/       → Python AI Worker (YOLOv8 + MediaPipe + OpenCV)
├── .env.example     → Environment variables template
├── nixpacks.toml    → Railway/Nixpacks deployment config
└── package.json     → Monorepo root (npm workspaces)
```

### Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Zustand, React Router v7 |
| **Backend API** | Express.js, Socket.IO, MediaSoup (WebRTC SFU) |
| **Database** | Convex (real-time backend-as-a-service) |
| **AI/ML** | YOLOv8 (object detection), MediaPipe (face mesh + gaze), OpenCV |
| **Real-Time** | WebRTC (MediaSoup), Socket.IO, Redis Pub/Sub |
| **Auth** | Custom role-based auth via Convex |
| **Email** | Resend API |
| **Deployment** | Railway / Nixpacks |

### Data Flow

```
Student Browser                                                     Proctor Browser
      │                                                                    │
      ├── Camera frames ──→ [Server (Socket.IO)] ──→ Redis Pub/Sub ────┐  │
      │                            │                                    │  │
      │                            ├── WebRTC (MediaSoup SFU) ─────────┼──┤
      │                            │                                    │
      │                     [AI Worker (Python)]                        │
      │                       ├── Face Detection (MediaPipe)            │
      │                       ├── Object Detection (YOLOv8)             │
      │                       └── Results ──→ Redis ──→ Server ──→ Convex DB
      │                                                                 │
      └── Exam Data ──→ [Convex Backend] ←── Queries/Mutations ────────┘
```

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** ≥ 20.x ([Download](https://nodejs.org/))
- **npm** ≥ 9.x (comes with Node.js)
- **Python** ≥ 3.10 ([Download](https://python.org/)) — for AI worker
- **Redis** (optional, for AI event bus) — ([Download](https://redis.io/download/))
- **Convex Account** — ([Sign up free](https://dashboard.convex.dev/))

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Amol-jaadhav45/proctai.git
cd proctai
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies (client + server)
npm install
```

### 3. Set Up Convex Backend

```bash
# Login to Convex
npx convex login

# Initialize & deploy the backend
npx convex dev
```

This will create your Convex deployment and give you the `CONVEX_URL`.

### 4. Configure Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

**Root `.env`:**
```env
# Convex
CONVEX_DEPLOYMENT=dev:your-deployment-name
CONVEX_URL=https://your-project.convex.cloud

# Client (must have VITE_ prefix for Vite)
VITE_CONVEX_URL=https://your-project.convex.cloud
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

**Server** — copy `server/.env.example` → `server/.env`:
```bash
cp server/.env.example server/.env
```
```env
PORT=4000
CONVEX_URL=https://your-project.convex.cloud
# Optional:
# REDIS_URL=redis://localhost:6379
```

**Client** — create `client/.env.local`:
```env
VITE_CONVEX_URL=https://your-project.convex.cloud
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

### 5. Start Development Servers

```bash
# Start both client (Vite) + server (Express) concurrently
npm run dev
```

This runs:
- **Client**: `http://localhost:5173` (Vite dev server)
- **Server**: `http://localhost:4000` (Express + Socket.IO)

> **Tip:** Run `npx convex dev` in a separate terminal to keep the Convex backend synced during development.

### 6. Set Up AI Worker (Optional)

The AI worker processes video frames for proctoring analysis. It requires Python and optionally Redis.

```bash
cd ai-worker

# Create virtual environment
python -m venv .venv
source .venv/bin/activate   # Linux/macOS
# .venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt

# Run in simulation mode (no Redis needed)
AI_WORKER_MODE=simulate python worker.py

# Run in real inference mode (requires Redis)
AI_WORKER_MODE=inference REDIS_URL=redis://localhost:6379 python worker.py
```

**AI Worker Modes:**
| Mode | Description |
|------|-------------|
| `simulate` | Generates random AI events for testing (default) |
| `inference` | Processes real video frames with YOLOv8 + MediaPipe |

---

## 👥 User Roles

### 🎓 Student
- Sign up, take exams, view results
- Pre-exam verification (liveness check + ID card)
- Camera monitored during exam
- View credibility score and violation history

### 👁️ Proctor (Instructor)
- Create and manage exams
- Monitor students in real-time via live video feeds
- Issue warnings, flag sessions, or terminate exams
- Review session reports and violations

### 🛡️ Admin
- Full system administration
- User management (invite proctors, manage roles)
- Institute and branch management
- System-wide analytics and audit logs
- Configure exam policies and risk thresholds

---

## 🔧 Available Scripts

### Root (Monorepo)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client + server in development mode |
| `npm run build` | Build both client and server for production |
| `npm start` | Start the production server |
| `npx convex dev` | Start Convex development backend |
| `npx convex deploy` | Deploy Convex to production |

### Client

| Command | Description |
|---------|-------------|
| `npm run dev --workspace=client` | Start Vite dev server |
| `npm run build --workspace=client` | Build for production |
| `npm run lint --workspace=client` | Run ESLint |
| `npm run test --workspace=client` | Run Vitest tests |

### Server

| Command | Description |
|---------|-------------|
| `npm run dev --workspace=server` | Start with nodemon (hot reload) |
| `npm run build --workspace=server` | Compile TypeScript |
| `npm start --workspace=server` | Start production server |

---

## 🚢 Deployment

### Railway (Recommended)

The project includes a `nixpacks.toml` for easy Railway deployment:

1. Push your code to GitHub
2. Create a new project on [Railway](https://railway.app/)
3. Connect your GitHub repo
4. Set the environment variables in Railway dashboard:
   - `CONVEX_URL`
   - `VITE_CONVEX_URL`
   - `NODE_ENV=production`
   - `PORT` (Railway auto-assigns)
5. Deploy!

### Convex Backend

```bash
# Deploy Convex functions to production
npx convex deploy
```

Set Convex environment variables in the [Convex Dashboard](https://dashboard.convex.dev/):
- `RESEND_API_KEY` — for sending invite emails
- `FROM_EMAIL` — sender email address

---

## 📁 Project Structure

```
client/src/
├── components/       → Reusable UI components
├── contexts/         → React context providers
├── hooks/            → Custom React hooks
├── pages/            → Page components (routes)
│   ├── LoginPage        → Student/Proctor/Admin login
│   ├── SignupPage       → User registration
│   ├── Dashboard        → Student dashboard
│   ├── ExamPage         → Exam-taking interface
│   ├── PreExamFlow      → Pre-exam verification
│   ├── ProctorDashboard → Proctor monitoring hub
│   ├── AdminDashboard   → Admin control panel
│   ├── LiveProctoringView → Real-time student monitoring
│   └── ...
├── services/         → API and backend service layers
├── store/            → Zustand state management
├── types/            → TypeScript type definitions
└── utils/            → Utility functions

server/src/
├── routes/           → Express API routes
├── services/         → Business logic (SFU, violations, etc.)
├── middleware/        → Express middleware
├── config/           → Server configuration
└── types/            → TypeScript types

convex/
├── schema.ts         → Database schema definition
├── auth.ts           → Authentication mutations/queries
├── exams.ts          → Exam CRUD operations
├── sessions.ts       → Exam session management
├── violations.ts     → Violation tracking
├── monitoring.ts     → Live monitoring queries
├── analytics.ts      → Dashboard analytics
├── notifications.ts  → Notification system
└── ...

ai-worker/
├── worker.py         → Main AI inference worker
├── requirements.txt  → Python dependencies
└── yolov8n.pt        → YOLOv8 Nano model weights
```

---

## 🔒 Security

- All passwords are hashed before storage
- Role-based access control (RBAC) on all routes and mutations
- Immutable audit logs with integrity hashing
- Environment variables for all secrets (never committed to git)
- CORS protection with configurable origins
- Session locking to prevent tampering

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---



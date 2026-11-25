# SMART LIBRARY MANAGEMENT SYSTEM
## Advanced MERN Stack + Neo4j Graph Database Application
**University Level Laboratory Practical & Project Implementation**

---

### 1. Executive Summary & Architecture Overview

The **Smart Library Management System** is a dual-database academic web application engineered to manage university circulation, cataloging, members, and relational graph knowledge.

It employs **Polyglot Persistence**:
- **MongoDB (Document Database)**: Acts as the primary transactional system of record for Books, Authors, Members, and Borrow Records.
- **Neo4j (Property Graph Database)**: Stores and queries deep relationships:
  - `(:Author)-[:WROTE]->(:Book)`
  - `(:Member)-[:BORROWED {issueDate, dueDate, status, fineAmount}]->(:Book)`
- **Node-Cron Engine**: Automated daily daemon running at `09:00 Asia/Kolkata` evaluating overdue loans and dispatching email reminders.
- **Nodemailer SMTP Service**: Transports issue confirmations, return receipts, and overdue notices with Ethereal fallback.

---

### 2. Core Business Rules

#### A. 7-Calendar-Day Loan Duration
- When a book is issued, `issueDate = server clock (Date.now())`.
- Due date is strictly calculated as `issueDate + 7 calendar days`.
- Enforced on the server clock; frontend client timestamps are never trusted.

#### B. ₹5 / Overdue Calendar Day Late Fine Matrix
- Books returned on or before `dueDate` incur **₹0 fine** (0 overdue days).
- The first overdue day starts on the calendar day immediately following `dueDate`.
- Late fee: `fineAmount = max(0, calendarDaysBetween(dueDate, returnDate)) * 5`.

| Return Timing | Overdue Days | Fine Amount |
| :--- | :---: | :---: |
| On or before Due Date | 0 | **₹0** |
| 1 day late | 1 | **₹5** |
| 3 days late | 3 | **₹15** |
| 10 days late | 10 | **₹50** |

*Note: Calculations strictly evaluate calendar midnight boundaries in the `Asia/Kolkata` timezone rather than elapsed 24-hour periods.*

---

### 3. Application Structure

```
LibMag/
├── client/                     # React + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx      # DB health pills (MongoDB & Neo4j) & Quick Seed
│   │   │   ├── Sidebar.jsx     # Navigation menu with overdue badge
│   │   │   ├── StatCard.jsx    # Metric counter cards
│   │   │   └── Modal.jsx       # CRUD dialog modals
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx   # Analytics, KPIs, and Recent Activity
│   │   │   ├── Books.jsx       # Books catalog, search, stock tracking
│   │   │   ├── Authors.jsx     # Author profiles and publications
│   │   │   ├── Members.jsx     # Student/faculty registration & activation
│   │   │   ├── IssueReturn.jsx # Issue desk (+7 days preview) & Return desk
│   │   │   ├── BorrowHistory.jsx # Audit ledger with status filters
│   │   │   ├── OverdueBooks.jsx# Live overdue monitor & reminder triggers
│   │   │   ├── GraphExplorer.jsx# Force-directed interactive Neo4j graph viewer
│   │   │   └── EmailLogs.jsx   # Nodemailer audit log
│   │   └── services/api.js     # Axios API client
│   └── package.json
│
├── server/                     # Node.js + Express Backend
│   ├── config/
│   │   ├── db.js               # Mongoose MongoDB connection
│   │   └── neo4j.js            # Official Neo4j Bolt driver pool
│   ├── models/
│   │   ├── Author.js           # Author document schema
│   │   ├── Book.js             # Book document schema (copy validation)
│   │   ├── Member.js           # Member document schema
│   │   └── BorrowRecord.js     # Loan transaction schema
│   ├── controllers/            # Author, Book, Member, Borrow, Graph controllers
│   ├── routes/                 # RESTful Express routers
│   ├── services/
│   │   ├── graphService.js     # Cypher MERGE, MATCH, and graph sync engine
│   │   └── emailService.js     # Nodemailer HTML templates & simulation
│   ├── jobs/
│   │   └── overdueScheduler.js # Daily 09:00 AM Asia/Kolkata cron job
│   ├── utils/
│   │   ├── dateUtils.js        # Strict calendar date & fine calculation
│   │   └── seedData.js         # Realistic university library seed script
│   ├── server.js               # Express application entry point
│   └── .env                    # Environment variables
│
├── start-all.bat               # 1-Click Windows system launcher
├── VIVA_GUIDE.md               # Oral examination & Viva answers
└── DEMO_SCRIPT.md              # Step-by-step practical presentation script
```

---

### 4. Setup & Running Instructions

#### Prerequisites
- Node.js LTS (v18+)
- MongoDB Community Server or MongoDB Atlas
- Neo4j Desktop, Neo4j Community, or Neo4j AuraDB (Optional; built-in graceful fallback included)

#### Quick Start (1-Click)
Run `start-all.bat` from the root directory.

#### Manual Startup

**Terminal 1: Start Backend**
```bash
cd server
npm install
npm run seed       # Seeds university textbooks, authors, members & demo loans
npm start          # Runs Express on http://localhost:5000
```

**Terminal 2: Start Frontend**
```bash
cd client
npm install
npm run dev        # Runs Vite React app on http://localhost:5173
```

---

### 5. API Reference Checklist

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend and service health check |
| `GET` | `/api/dashboard/stats` | KPI counters, copy counts, category stats |
| `POST` | `/api/dashboard/seed` | Seed database from UI |
| `GET` | `/api/books` | Search and list books |
| `POST` | `/api/books` | Create book and sync to Neo4j |
| `PUT` | `/api/books/:id` | Update book |
| `DELETE` | `/api/books/:id` | Safe delete (rejects if active loans exist) |
| `GET` | `/api/authors` | List authors with publication counts |
| `POST` | `/api/authors` | Create author and sync to Neo4j |
| `DELETE` | `/api/authors/:id` | Safe delete (rejects if books on loan) |
| `GET` | `/api/members` | List members with active loan counts |
| `POST` | `/api/members` | Register member and sync to Neo4j |
| `DELETE` | `/api/members/:id` | Safe delete (rejects if active loans exist) |
| `POST` | `/api/borrow/issue` | Issue book (auto +7 days due date, validates copy) |
| `PUT` | `/api/borrow/return/:id`| Idempotent return, calculates ₹5/day fine, restores copy |
| `GET` | `/api/borrow` | Complete borrow history ledger |
| `GET` | `/api/borrow/overdue` | List active overdue loans with estimated fines |
| `POST` | `/api/borrow/overdue/send-reminder/:id` | Send on-demand overdue reminder email |
| `POST` | `/api/borrow/trigger-cron-scan` | Trigger the daily 09:00 AM cron scan |
| `GET` | `/api/graph/relationships` | Fetch graph nodes & edges for visual explorer |
| `POST` | `/api/graph/sync` | Rebuild & sync Neo4j graph from MongoDB |
| `POST` | `/api/graph/query` | Execute raw Cypher query for viva demo |
| `GET` | `/api/graph/status` | Real-time MongoDB & Neo4j connectivity status |

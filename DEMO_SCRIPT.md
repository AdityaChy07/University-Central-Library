# Final Lab Demonstration Script
## Step-by-Step Presentation Walkthrough for Evaluators & Viva

Follow this exact walkthrough during your viva and lab practical evaluation to showcase every required university feature in under 5 minutes.

---

### Step 0: First-Page Identity Verification Gate (Security Gate)
1. Open the application:
   - Frontend: [http://localhost:5173](http://localhost:5173)
2. Explain the **Identity Verification Gate**:
   - Unauthenticated visitors cannot bypass this gate to browse library assets or members.
   - Point to the 3 Quick-Login Persona buttons or enter credentials manually:
     - 🛡️ **Chief Librarian**: `LIB-ADMIN` / `admin123`
     - 🎓 **Professor / Teacher**: `TEA-101` / `teacher123` (45-Day Research Retention Privilege)
     - 🎒 **Student**: `STU-201` / `student123` (7-Day Rule, ₹20 Fine Demo, Live UPI Scanner)

---

### Step 1: Student Dashboard & Real-Time UPI QR Scanner
1. Click **Student** quick-login (`STU-201`).
2. Show the tailored **Student Portal**:
   - **Active Loans Table**: Shows CLRS Algorithms issued for 7 calendar days.
   - **Overdue Alert Banner**: Shows 4 days overdue, fine calculated at ₹20 (₹5/day).
   - **Desire Book Availability & Allocation Date Tracker**:
     - Search the academic catalog.
     - Explain the **"Expected Allocation Date"**: If copies reach 0, the backend algorithm analyzes active borrower due dates and tells the student the exact date the book will become available for reissue!
3. Click **"Scan & Pay Fine"**:
   - A modal displays an **NPCI Dynamic UPI QR Code** with pre-filled amount (₹20) and VPA (`central.library@upi`).
   - Evaluator Question: *"Can students really scan this with PhonePe/GPay?"*
   - Answer: *"Yes! It uses the official NPCI UPI specification (`upi://pay?pa=...&am=20`). Any UPI app scans it. For live university accounts, the VPA is configured in `.env` without exposing private bank details."*
4. Enter 12-digit UPI UTR Number (e.g. `UPI-UTR-987654321012`) and click **Confirm & Pay**:
   - The fine status immediately changes to **PAID**.
   - Generates a **Digital University Clearance Slip / Receipt** with barcode, timestamp, and Print/Download button.

---

### Step 2: Teacher Dashboard (45-Day Retention Rule)
1. Click Logout in top-right, then log in as Teacher (`TEA-101`).
2. Show the tailored **Faculty Research Portal**:
   - Point out the **Faculty Privilege Badge**: *"45-Day Extended Loan Tenure"* (Section 15 faculty rule).
   - Show Computer Networks loan: issued on Nov 13, strictly due on Dec 28 (exactly 45 calendar days).
   - Show that zero fines apply during the 45-day research window.

---

### Step 3: Librarian Dashboard & Exclusive Member Management
1. Click Logout, then log in as Librarian (`LIB-ADMIN`).
2. Point out that the Librarian has administrative privileges:
   - Central KPIs, Graph Sync, Issue/Return desk, and Email Logs.
3. Navigate to **Members (`/members`)**:
   - Explain that **only the Librarian** has permissions to add, edit, or remove Students and Teachers.
   - If a Student or Teacher attempts to access this page or its backend API, they receive an immediate HTTP 403 Forbidden.
   - Click **Register New Member**: select role (Student vs Teacher), department, and credentials.

---

### Step 4: Graph Explorer Demonstration (Dual-Database Polyglot Architecture)
1. Navigate to **Graph Explorer** (`/graph-explorer`):
   - Show the interactive force-directed graph:
     - 🟣 **Author nodes** (Purple)
     - 🟡 **Book nodes** (Amber)
     - 🟢 **Member nodes** (Emerald)
   - Point out the relationships:
     - `[:WROTE]` arrows connecting Authors to Books.
     - `[:BORROWED]` arrows connecting Members to Books.
2. Click on any node:
   - Show the **Cypher Node Inspector** on the right updating in real time with ISBN, copies, and MongoDB IDs.
3. Open **Cypher Query Terminal**:
   - Run preset query:
     ```cypher
     MATCH (a:Author)-[r:WROTE]->(b:Book) RETURN a.name AS Author, b.title AS Book
     ```
   - Show results table returned directly from the graph engine.

---

### Step 5: Issue & Return Desk (Section 16, Bullet 4)
1. Navigate to **Issue / Return** (`/issue-return`):
2. Select Member (`TEA-101` or `STU-201`) and select a book.
   - Point out the dynamic due date preview:
     - When a **Teacher** is selected: due date automatically previews **45 days ahead**.
     - When a **Student** is selected: due date previews **7 days ahead**.
3. Issue the book:
   - Notice Available Copies decreases by 1 in MongoDB.
   - Notice a `[:BORROWED]` relationship is simultaneously created in Neo4j.
   - Notice confirmation email is dispatched via Nodemailer.
4. Return a book:
   - Click Return on an active loan.
   - Notice Available Copies increments by 1.
   - Notice `status` changes to `RETURNED`.
   - Test Idempotency: try to return the same record twice — system rejects it with an error.

---

### Step 6: Automated Cron Job & Overdue Email Reminders (Section 16, Bullet 5)
1. Navigate to **Email Logs** (`/email-logs`):
2. Point out the configured daily schedule: `0 9 * * *` (09:00 AM Asia/Kolkata).
3. Click **"Run Cron Scan Now"**:
   - The scheduler scans all active loans where `dueDate < Today`.
   - Fines are updated at ₹5/day.
   - Automated reminder emails are dispatched with Ethereal inbox view links.
   - Point out that duplicate emails are suppressed on the same calendar day.

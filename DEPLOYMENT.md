# Deployment Guide: Render (Backend) + Vercel (Frontend)

This guide walks you through deploying the **Smart Library Management System** with the backend on **Render** and frontend on **Vercel**.

---

## 1. Cloud Databases Setup (Free Tiers)

Before deploying the backend, ensure your cloud database credentials are ready:

### A. MongoDB Atlas (Cloud MongoDB)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up for a free M0 cluster.
2. In **Database Access**, create a user (e.g. `libadmin` with a secure password).
3. In **Network Access**, add IP `0.0.0.0/0` (Allow access from anywhere).
4. Click **Connect** -> **Connect your application** -> Copy the connection string:
   ```
   mongodb+srv://libadmin:<password>@cluster0.abcde.mongodb.net/library_management?retryWrites=true&w=majority
   ```

### B. Neo4j AuraDB (Cloud Neo4j)
1. Go to [Neo4j AuraDB](https://neo4j.com/cloud/platform/aura-graph-database/) and create a free AuraDB instance.
2. Download your connection credentials (URI e.g., `neo4j+s://<id>.databases.neo4j.io`, username `neo4j`, and generated password).

---

## 2. Deploying Backend to Render

1. Push your repository to GitHub.
2. Log in to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
3. Select your GitHub repository.
4. Configure the Web Service:
   - **Name**: `libmag-server` (or your choice)
   - **Region**: Closest to you (e.g., Singapore or Frankfurt)
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Under **Environment Variables**, add:
   | Key | Value |
   | :--- | :--- |
   | `PORT` | `10000` (or `5000`) |
   | `JWT_SECRET` | `super_secure_jwt_secret_university_2026` |
   | `MONGODB_URI` | `mongodb+srv://...` (your Atlas URI) |
   | `NEO4J_URI` | `neo4j+s://...` (your AuraDB URI) |
   | `NEO4J_USERNAME`| `neo4j` |
   | `NEO4J_PASSWORD`| `your_auradb_password` |
   | `NEO4J_DATABASE`| `neo4j` |
   | `TIMEZONE` | `Asia/Kolkata` |
   | `CLIENT_URL` | `https://your-vercel-app.vercel.app` |
   | `SMTP_HOST` | `smtp.gmail.com` (or leave empty for test fallback) |
   | `SMTP_PORT` | `587` |
   | `SMTP_USER` | `your_email@gmail.com` |
   | `SMTP_PASS` | `your_gmail_app_password` |
   | `MAIL_FROM` | `"Smart Library" <your_email@gmail.com>` |
6. Click **Deploy Web Service**.
7. Once deployed, note down your Render service URL, e.g.:
   `https://libmag-server.onrender.com`
8. *(Optional)* Seed data on Render: Open the Render **Shell** tab and run:
   ```bash
   node utils/seedData.js
   ```
   *(Or click "Seed Demo Data" directly inside the frontend once deployed!)*

---

## 3. Deploying Frontend to Vercel

1. Log in to [Vercel](https://vercel.com/) and click **Add New...** -> **Project**.
2. Import your GitHub repository.
3. Configure the Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and choose `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://libmag-server.onrender.com/api` (Render backend URL + `/api`) |
   | `VITE_LIBRARY_UPI_ID` | `central.library@upi` (or your public institution UPI ID) |
   | `VITE_LIBRARY_PAYEE_NAME` | `Central University Library` |
5. Click **Deploy**.
6. Vercel will build and deploy in ~30 seconds and provide your live link!
   - Single Page routing is already handled by `client/vercel.json` (`/books`, `/issue-return`, `/graph-explorer`, etc. will work on refresh).

---

## 4. Verification Checklist

1. Open your live Vercel URL.
2. In the top bar, check that **MongoDB: Online** and **Neo4j: Online** pills are green.
3. If fresh database, click **Seed Demo Data** in the top bar.
4. Try issuing a book: notice the +7 calendar days automatic due date calculation.
5. Try returning a book: check that the receipt shows accurate fine calculation at ₹5/day.
6. Open **Graph Explorer**: verify visual nodes and test a live Cypher query!

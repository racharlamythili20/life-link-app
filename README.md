# 🩸 LifeLink — Smart Blood Donation & Emergency Allocation Platform

LifeLink is a full-stack blood donation and hospital emergency network connecting donors, recipients, and blood banks with real-time matching, AI urgency scoring, and geolocation tracking.

---

## 🏗 Repository Structure

* **`LifeLink_Backend/`**: Node.js & Express REST API, WebSockets (Socket.IO), JWT Authentication, and Supabase integration.
* **`LifeLink_Web/`**: Next.js (App Router), Tailwind CSS, Framer Motion, and Supabase Client.
* **`LifeLink_Android/`**: React Native (Expo SDK 54), TypeScript, Google Maps, and Supabase Mobile Client.

---

## ⚡ Tech Stack & Integrations

* **Backend**: Node.js, Express, Socket.IO, JWT Auth, Winston Logger
* **Frontend**: Next.js 16, React 18/19, Tailwind CSS, Lucide Icons, Radix UI
* **Mobile**: Expo SDK 54, React Native 0.81, React Navigation
* **Database & Auth**: [Supabase](https://supabase.com) (PostgreSQL, Supabase Auth, Supabase Storage, Supabase Realtime)

---

## 🚀 Quick Start

### 1. Backend Server
```bash
cd LifeLink_Backend
npm install
npm start
```
Runs on `http://localhost:5000`.

### 2. Web Application
```bash
cd LifeLink_Web
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Android Mobile App
```bash
cd LifeLink_Android
npm install
npx expo start
```
Scan the QR code with **Expo Go** or press `a` to run on an Android emulator.

---

## 🗄 Database Schema

The complete PostgreSQL SQL schema for Supabase is located at:
`LifeLink_Backend/supabase_schema.sql`
Run this script in the **Supabase SQL Editor** to initialize all tables, indexes, storage buckets, RLS policies, and realtime triggers.

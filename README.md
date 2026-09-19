# NovaPOS Restaurant POS

NovaPOS is a restaurant POS web application built for table service, kitchen stations, QR ordering, menu management, employee permissions, sales reports, and Docker deployment.

## Project Highlights

- Table-based POS workflow for dine-in restaurants
- QR ordering for each table so customers can order from their phone
- Kitchen station view for food and drink preparation
- Menu management with categories, prices, availability, and stations
- Admin-only custom item pricing per table bill
- Employee permission controls
- Discounts, payment methods, receipts, order history, and table moving
- Daily reports, export, and close-store flow
- Docker Compose setup for frontend, backend, and MongoDB

## Tech Stack

- Frontend: React, Axios, Tailwind CSS classes
- Backend: Node.js, Express, Mongoose
- Database: MongoDB
- Deployment: Docker Compose, Nginx frontend container

## Repository Structure

```text
pos-frontend/       React frontend
pos-backend/        Express API and MongoDB models
internship-demo/    Static demo website for internship presentation
docker-compose.yml  Docker setup for app + database
DOCKER-SETUP.md     Docker run notes
```

## Local Setup

### 1. Backend

```powershell
cd pos-backend
npm install
```

Create `pos-backend/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/posdb
PORT=5000
JWT_SECRET=change_this_secret
```

Start backend:

```powershell
npm start
```

Backend runs at:

```text
http://localhost:5000
```

### 2. Frontend

```powershell
cd pos-frontend
npm install
npm start
```

Frontend runs at:

```text
http://localhost:3000
```

## Demo Users

After MongoDB is running and `.env` is set, create demo users:

```powershell
cd pos-backend
npm run seed:demo
```

Default demo accounts:

```text
Admin
Email: admin@novapos.demo
Password: Admin1234

Staff
Email: staff@novapos.demo
Password: Staff1234
```

For a real deployment, change these values by setting environment variables before running the seed:

```env
DEMO_ADMIN_EMAIL=
DEMO_ADMIN_PASSWORD=
DEMO_STAFF_EMAIL=
DEMO_STAFF_PASSWORD=
```

## QR Ordering

Admin can open the POS, choose **QR โต๊ะ**, print QR codes, and place each code on the matching table.

Example customer order link:

```text
http://localhost:3000/?customer=1&table=1
```

When using another device in the same Wi-Fi network, replace `localhost` with the server computer IP:

```text
http://192.168.1.25:3000/?customer=1&table=1
```

## Docker

Run the full system with Docker Compose:

```powershell
docker compose up --build
```

Open:

```text
http://localhost:3000
```

More details are in `DOCKER-SETUP.md`.

## Internship Demo Page

A static presentation page is available at:

```text
internship-demo/index.html
```

This page can be opened directly in a browser for a quick project overview.

## Notes

- `.env`, `node_modules`, and build output are ignored by Git.
- QR codes use generated image URLs for easy printing.
- Custom item pricing is stored only on the table order and does not change the master menu price.

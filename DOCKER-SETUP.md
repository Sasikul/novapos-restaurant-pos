# NovaPOS Docker Setup

## 1. Install Docker Desktop

Install Docker Desktop for Windows, then open Docker Desktop and wait until it says the engine is running.

## 2. Start the system

Open a terminal in this project folder:

```powershell
cd "C:\Users\kimhu\OneDrive\Project pos"
docker compose up --build
```

After it starts:

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- MongoDB: localhost:27017

## 3. Stop the system

```powershell
docker compose down
```

## 4. Keep database data

The database is stored in the Docker volume named `projectpos_mongo-data`.
Normal `docker compose down` keeps the data.

Only delete the database when you really want to reset everything:

```powershell
docker compose down -v
```

## Notes

- Backend uses `mongodb://mongo:27017/posdb` inside Docker.
- Frontend calls the backend at `http://localhost:5000`.
- If you deploy to another computer or server, set `REACT_APP_API_URL` to that server address before building.

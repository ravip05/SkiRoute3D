# SkiRoute3D

An end-to-end demo of a data-driven ski-route planner featuring:

- **Interactive 3D map** with real terrain (hillshade + satellite imagery)
- **Live ski‐trail data** pulled from OpenStreetMap via Overpass API
- **Click-to-click pathfinding** (Dijkstra’s algorithm over a weighted trail graph)
- **Microservices architecture** with Docker Compose

---

## 🚀 Features

- **Browse ski areas**: pan & zoom to any mountain region  
- **3D terrain**: true DEM extrusion + hillshade + satellite drape  
- **Ski route overlay**: dynamic GeoJSON trails fetched per‐view  
- **Pathfinding**: click once for start (green), once for end (red), and get the shortest‐distance route (blue)  
- **Backend ML service** (placeholder) for future scoring/prediction  
- **PostGIS & Redis** for data storage and caching  

---

## 🏗️ Architecture

```
┌───────────────────────┐      ┌────────────────┐
│      Frontend         │◀────▶│    Backend     │
│ (React + MapLibre-GL) │      │ (Express + TS) │
└───────────────────────┘      └────────────────┘
         ▲   ▲   ▲                     ▲
         │   │   │                     │
         │   │   │                     │
   ┌─────┘   │   └───┐           ┌─────┴─────┐
   │             Cache │           │  PostGIS  │
   │           (Redis) │           │ (Postgres)│
   └───────────────────┘           └───────────┘

                └───────────┐
                            ▼
                   ┌──────────────────┐
                   │  ML Service      │
                   │  (Flask / Python)│
                   └──────────────────┘
```

---

## 🔧 Prerequisites

- [Docker ≥ 20.10](https://docs.docker.com/get-docker/)  
- [Docker Compose](https://docs.docker.com/compose/)  
- (Optional) Git for version control  

---

## 🚀 Quick Start

From the project root:

```bash
docker compose up --build
```

- Frontend ➔ http://localhost:3000  
- Backend API ➔ http://localhost:4000  
- ML service   ➔ http://localhost:5000  

To stop:

```bash
docker compose down
```

---

## 🛠️ Developing Locally

### Run services individually

```bash
# Database & cache
docker compose up -d db redis

# Backend only
docker compose up --build backend

# Frontend only
docker compose up --build frontend

# ML service only
docker compose up --build ml-service
```

### Common commands

```bash
# Rebuild a single service
docker compose build <service>

# Tail logs
docker compose logs -f <service>
```

---

## 📡 Backend API

### Health check

```
GET /health
```

_Response:_
```json
{ "status": "ok" }
```

### Fetch ski routes

```
GET /api/skiroutes?bbox=<minLon>,<minLat>,<maxLon>,<maxLat>
```

- **bbox**: map bounds (lon,lat)  
- Returns a GeoJSON `FeatureCollection` of trails & points.

### Compute optimal ski route

```
GET /api/route?start=<lon>,<lat>&end=<lon>,<lat>
```

- **start**, **end**: click coordinates (lon,lat)  
- Snaps to nearest trail vertex, runs Dijkstra over the trail network, returns a GeoJSON `FeatureCollection` with one `LineString`.

---

## 🤖 ML Service

```
POST /predict
```

- **body**: `{ "features": [...] }`  
- **response**: `{ "score": number }` (placeholder)

---

## 📂 Project Layout

```
SkiRoute3D/
├── frontend/
│   ├── Dockerfile
│   ├── public/
│   ├── src/
│   │   ├── components/Map.tsx
│   │   └── …
│   └── package.json
├── backend/
│   ├── Dockerfile
│   ├── src/server.ts
│   └── package.json
├── ml-service/
│   ├── Dockerfile
│   ├── app.py
│   └── requirements.txt
├── docker-compose.yml
└── README.md
```

---

## 📝 Contributing

1. Fork the repo  
2. Create a feature branch (`git checkout -b feat/awesome`)  
3. Commit your changes (`git commit -m "Add awesome feature"`)  
4. Push to your branch (`git push origin feat/awesome`)  
5. Open a Pull Request  

Please follow the existing code style and add tests where applicable.



# Samarth Web Platform

Samarth is a multi-module neuro-assessment and rehabilitation platform. It combines a React (Vite) front-end, a Node.js/Express API with WebSocket streaming, and a FastAPI-based ML service for signal and video analysis.

## At a Glance

- **Front-end**: React + Vite + MUI; real-time dashboards, assessments, and therapy flows.
- **API/WS backend**: Express + MongoDB; handles authentication, assessments, recordings, and WebSocket data streams for sensors and tests (gait, tremor, hyperventilation, neuro assessments).
- **ML service**: FastAPI + OpenCV + MediaPipe + TensorFlow; processes video/audio for face symmetry, eye tracking, tremor, neck mobility, and speech metrics.
- **Data**: MongoDB for users, sessions, assessments, and artifacts.

## Repository Structure

- `frontend/` — Vite React app (dashboards, assessments, therapies, conversational bot UI).
- `backend/` — Express API, WebSocket endpoints, MongoDB models, seeds, diagnostics.
- `ml_service/` — FastAPI service for media analysis.
- `uploads/` — Binary uploads (local dev).
- `tests/` — Project tests and fixtures (backend-focused).

## Prerequisites

- Node.js 18+ (recommend 20 LTS)
- npm 9+
- Python 3.10+ (for `ml_service`)
- MongoDB 6+ running locally or a connection string

## Quick Start (Local Dev)

1. **Clone** and move into the repo:
	```bash
	git clone <repo-url>
	cd samarth-web
	```
2. **Install front-end deps**:
	```bash
	cd frontend
	npm install
	```
3. **Install backend deps**:
	```bash
	cd ../backend
	npm install
	```
4. **Install ML service deps**:
	```bash
	cd ../ml_service
	python -m venv .venv
	.venv\Scripts\activate
	pip install -r requirements.txt
	```
5. **Configure environments** (see below), then start each service in its own terminal.

## Environment Configuration

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and adjust as needed:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/samarth
JWT_SECRET=change-me
# Optional
HOST=0.0.0.0
NEURO_SIMULATOR=false
```

### Front-end (`frontend/.env` or `.env.local`)

```env
VITE_API_URL_DEV=http://localhost:5000
VITE_ML_SERVICE_URL=http://localhost:8000
VITE_GEMINI_API_KEY=<your_gemini_key>
VITE_GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta
VITE_DEBUG=true
```

### ML Service (FastAPI)

`ml_service/app/config.py` is currently empty; add any secrets or tuning flags you need. Default CORS allows `http://localhost:5173` and the deployed web app.

## Running the Services

Start each component from its folder after configuring environments.

### Backend (API + WebSockets)

```bash
cd backend
npm run dev    # or: npm start
```

Key routes and sockets (see code under `backend/src`):
- REST: `/api/auth`, `/api/users`, `/api/assessments`, `/api/specialized-assessments`, `/api/diagnostics`, `/api/neurobot`
- WebSockets: `/ws/sensors` (gait), `/api/assessment` WS hooks, tremor WS, hyperventilation WS at `/tests/hyperventilation/stream`

### Front-end (Vite React)

```bash
cd frontend
npm run dev -- --host
# Default: http://localhost:5173
```

### ML Service (FastAPI)

```bash
cd ml_service
.venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check: `GET /health` → `{"status": "healthy"}`

## Data Seeds & Utilities

Backend scripts (run from `backend/`):
- `npm run seed:hyperventilation` — seed sample hyperventilation test data.
- `npm run migrate:hyperventilation` — migrate epilepsy tests to hyperventilation assessments.

## Testing & Quality

- Backend: `npm test` (vitest)
- Front-end: `npm run lint`
- ML service: add tests as needed (none included yet)

## Deployment Notes

- Set production `MONGODB_URI`, `JWT_SECRET`, and any OAuth/email credentials in `backend/.env`.
- Front-end uses Vite; run `npm run build` and serve `dist/` via your host of choice.
- ML service can be containerized (e.g., `uvicorn app.main:app` in a lightweight image). Ensure CORS allows your deployed front-end origin.
- Update `VITE_API_URL_DEV`/`VITE_ML_SERVICE_URL` to point to production endpoints.

## Troubleshooting

- **CORS errors**: confirm front-end origin is whitelisted in backend and ML service CORS configs.
- **Mongo connection issues**: verify `MONGODB_URI` and that MongoDB is reachable from the host.
- **WebSocket not connecting**: ensure the backend is started with `HOST=0.0.0.0` when accessed from other devices; check network interface logs printed on boot.
- **Large uploads**: backend allows 50 MB JSON/body payloads; for bigger media, prefer direct file uploads/streams.

## Project Links (code references)

- Backend entrypoint: `backend/src/index.js`
- Front-end entrypoint: `frontend/src/main.jsx`
- ML service entrypoint: `ml_service/app/main.py`


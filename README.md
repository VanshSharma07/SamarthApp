
# Samarth Web Platform

Samarth is a multi-module neuro-assessment and rehabilitation platform for building and running sensor-driven clinical assessments and rehabilitation flows. It provides a React front-end for clinicians and patients, an Express API + WebSocket backend for real-time sensor ingestion and session management, and a FastAPI ML service for video/audio analysis.

**Status:** active development

**Contents of this README**
- Project overview and key features
- Architecture and technology stack
- Quick start (local development)
- Environment configuration
- Running services and useful scripts
- Testing, deployment, and troubleshooting

## Key Features
- Real-time sensor data ingestion over WebSockets (gait, tremor, hyperventilation, etc.)
- Assessment orchestration and session management
- Video/audio ML analysis for face symmetry, eye tracking, tremor, neck mobility, and speech
- Admin utilities and seed scripts for test data

## Architecture & Tech Stack
- **Frontend:** React (Vite), MUI, client-side state and contexts under `frontend/src`
- **Backend:** Node.js + Express, WebSocket endpoints, MongoDB models, seeds and utilities under `backend/src`
- **ML service:** FastAPI (Python), OpenCV / MediaPipe / TensorFlow models under `ml_service/app`
- **Data store:** MongoDB (recommended v6+)
- **Realtime transport:** WebSockets for sensor streams and live test sessions

Core entrypoints:
- Backend server: [backend/src/index.js](backend/src/index.js)
- Frontend app: [frontend/src/main.jsx](frontend/src/main.jsx)
- ML service: [ml_service/app/main.py](ml_service/app/main.py)

## Quick Start (Local Development)
Prerequisites:
- `Node.js` 18+ (20 LTS recommended)
- `npm` 9+
- `Python` 3.10+
- `MongoDB` 6+ running locally or accessible via a connection string

1) Clone repository and install dependencies

```bash
git clone <repo-url>
cd samarth-web

# frontend
cd frontend
npm install

# backend
cd ../backend
npm install

# ml service
cd ../ml_service
python -m venv .venv
.venv\Scripts\activate    # Windows
pip install -r requirements.txt
```

2) Create environment files

- Copy `backend/.env.example` to `backend/.env` and update values.
- Add frontend envs to `frontend/.env` or `.env.local`.
- Configure any ML service secrets in `ml_service/app/config.py` if needed.

Example backend `.env` (development):

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/samarth
JWT_SECRET=change-me
HOST=0.0.0.0
```

Example frontend `.env` (Vite):

```env
VITE_API_URL_DEV=http://localhost:5000
VITE_ML_SERVICE_URL=http://localhost:8000
VITE_DEBUG=true
```

## Running the services

Open three terminals (or use a terminal multiplexer) and run each service from its folder.

Backend (API + WebSockets):

```bash
cd backend
npm run dev    # or: npm start
```

Frontend (Vite React):

```bash
cd frontend
npm run dev -- --host
# App available at http://localhost:5173 (by default)
```

ML service (FastAPI):

```bash
cd ml_service
.venv\Scripts\activate   # Windows
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check for ML service:

```http
GET http://localhost:8000/health
# response: {"status": "healthy"}
```

## Useful Scripts & Seeds
- Backend seed and migration scripts are in `backend/scripts` (e.g., `seedHyperventilationTest.js`). Run via `npm run` scripts defined in `backend/package.json`.
- Example:

```bash
cd backend
npm run seed:hyperventilation
npm run migrate:hyperventilation
```

## Testing & Quality
- Backend unit tests (vitest): run `npm test` from `backend/`.
- Frontend linting: `npm run lint` from `frontend/`.

## Deployment Notes
- Set production `MONGODB_URI`, `JWT_SECRET`, and any OAuth/email credentials in `backend/.env`.
- Build frontend for production:

```bash
cd frontend
npm run build
# serve contents of `frontend/dist` from your static host
```
- Containerization: the ML service and backend can be containerized. Ensure CORS is configured to allow your frontend origin.

## Configuration Files & Extensibility
- `backend/config` contains configuration and environment-related helpers.
- ML tuning and model configuration can be added to `ml_service/app/config.py`.

## Troubleshooting
- **CORS errors:** ensure frontend origin is allowed in backend and ML service CORS lists.
- **MongoDB connection issues:** verify `MONGODB_URI` and network reachability.
- **WebSocket connectivity:** start backend with `HOST=0.0.0.0` for access from other devices; inspect backend logs on startup.
- **Large media uploads:** prefer streaming or chunked uploads; backend default allows ~50MB JSON/body payloads.

## Contributing
- Fork, create a feature branch, and open a PR with tests and a description.

## Where to look in the code
- Backend controllers and routes: `backend/src/controllers` and `backend/src/routes`
- Database models: `backend/src/models`
- Frontend pages and components: `frontend/src/pages` and `frontend/src/components`
- ML service models & endpoints: `ml_service/app`

## Contact
For questions or help, check `team_info.txt` or contact the maintainers listed in project metadata.

---
Updated: concise project overview, setup, and run instructions.


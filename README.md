# Attendify – AI-Powered Attendance Prediction & Alert System

Attendify is a SaaS-grade application that tracks student attendance, predicts future attendance using AI time-series forecasting, and provides actionable leave-planning simulation. 

## Features
- **Attendance Tracking**: Manage subjects, target percentages, and track presence/absence.
- **AI Prediction (XGBoost & RandomForest)**: Predicts future attendance percentages and assesses the risk classification (Safe/Warning/Danger).
- **Smart Leave Planner**: Calculates how many leaves you can safely take without breaking your target percentage.
- **Alert System**: Mock/Real SMTP email system for notifying users when they drop into the danger zone.

## Tech Stack
- Frontend: React (Vite), Tailwind CSS, Recharts
- Backend: FastAPI, SQLAlchemy, Pydantic, Passlib (JWT)
- Database: PostgreSQL
- Models: Scikit-learn, XGBoost, Pandas
- Deployment: Docker & Docker Compose

## Quick Start (Dockerized)
The fastest way to run the entire stack locally is via Docker.

1. Install [Docker](https://docs.docker.com/get-docker/) installed.
2. In the root directory, run:
```bash
docker-compose up --build
```
3. Access the applications:
- **Frontend App**: http://localhost
- **Backend API Docs**: http://localhost:8000/docs
- **Database**: Port 5432 is exposed for debugging.

## How to Train AI Models
By default, the backend will instantiate fallback heuristics until you train the Python models.
To train and save the XGBoost/RandomForest models on synthetic data:

1. Exec into the backend container (or run locally if you have Python 3.10+):
```bash
docker-compose exec backend bash
# Inside the container, run:
python ai/train.py
```
This generates `reg_model.pkl` and `clf_model.pkl` which will be instantly loaded by the prediction engine.

## Environment Variables
If running without Docker, set these in your shell:
- `DATABASE_URL`: e.g. `postgresql://user:pass@localhost:5432/db`
- `SECRET_KEY`: Random string for JWT encoding.
- `USE_MOCK_EMAIL`: `true` or `false`.
- `SMTP_USER` / `SMTP_PASS`: Your Gmail/SMTP credentials.



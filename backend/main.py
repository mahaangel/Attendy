from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from models.database import connect_db, disconnect_db
from api import auth, subjects, attendance, alerts, prediction, simulation, analytics, timetable


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await disconnect_db()


app = FastAPI(
    title="SmartAttend API",
    description="AI-Powered Attendance Prediction & Alert System — Backend API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers under /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(subjects.router, prefix="/api")
app.include_router(attendance.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(prediction.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(timetable.router, prefix="/api")


@app.get("/")
def root():
    return {
        "service": "SmartAttend Backend API",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    from models.database import db
    try:
        await db.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {"status": "ok", "db": db_status}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router

app = FastAPI(
    title="SmartAttend AI Microservice",
    description="LSTM + XGBoost + RandomForest based attendance prediction engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {"service": "SmartAttend AI Service", "status": "running"}


@app.get("/health")
def health():
    from models.predictor import predictor
    return {
        "status": "ok",
        "models_loaded": predictor.is_loaded(),
        "lstm": predictor.lstm_model is not None,
        "xgboost": predictor.xgb_model is not None,
        "random_forest": predictor.rf_model is not None,
    }

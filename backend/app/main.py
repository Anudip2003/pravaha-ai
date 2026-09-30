from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, expenses, chat, finance

app = FastAPI(title="Pravaha Finance API")

allowed_origins = list(dict.fromkeys([
    settings.FRONTEND_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(expenses.router)
app.include_router(chat.router)
app.include_router(finance.router)

@app.get("/health")
def health():
    return {"status": "ok"}
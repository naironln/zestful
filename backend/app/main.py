from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db.neo4j_driver import init_driver, close_driver, get_driver
from app.db.constraints import create_constraints
from app.routers import auth, meals, stats, nutritionist


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_driver()
    await create_constraints(get_driver())
    Path(settings.media_dir).mkdir(parents=True, exist_ok=True)
    yield
    await close_driver()


app = FastAPI(title="Zestful API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(meals.router)
app.include_router(stats.router)
app.include_router(nutritionist.router)

# Serve uploaded images
media_path = Path(settings.media_dir)
media_path.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(media_path)), name="media")


@app.get("/health")
async def health():
    return {"status": "ok"}

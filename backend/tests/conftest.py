import os
import tempfile

os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-for-pytest-only-min-32")
# main.py mkdirs media_dir at import time; default /app/media is not writable on dev machines
os.environ["MEDIA_DIR"] = tempfile.mkdtemp(prefix="zestful-test-media-")

import pytest
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture
def api_client(monkeypatch):
    mock_driver = MagicMock()
    monkeypatch.setattr("app.main.init_driver", AsyncMock())
    monkeypatch.setattr("app.main.close_driver", AsyncMock())
    monkeypatch.setattr("app.main.get_driver", lambda: mock_driver)
    monkeypatch.setattr("app.main.create_constraints", AsyncMock())
    monkeypatch.setattr("app.main._seed_taco_if_needed", AsyncMock())

    from fastapi.testclient import TestClient
    from app.main import app
    from app.dependencies import get_current_user, get_session

    async def override_user():
        return {
            "id": "user-test-1",
            "email": "user@test.com",
            "name": "Test User",
            "role": "patient",
        }

    async def override_session():
        yield None

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_session] = override_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()

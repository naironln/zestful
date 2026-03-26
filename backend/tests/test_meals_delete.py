"""DELETE /meals/{id} — 204 when deleted, 404 when not found."""
from unittest.mock import AsyncMock


def test_delete_meal_returns_204(api_client, monkeypatch):
    mock_delete = AsyncMock(return_value=True)
    monkeypatch.setattr("app.routers.meals.delete_meal_for_user", mock_delete)

    meal_id = "550e8400-e29b-41d4-a716-446655440000"
    response = api_client.delete(f"/meals/{meal_id}")

    assert response.status_code == 204
    mock_delete.assert_called_once()
    call_kw = mock_delete.call_args
    assert call_kw[0][1] == "user-test-1"
    assert call_kw[0][2] == meal_id


def test_delete_meal_returns_404_when_not_found(api_client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.meals.delete_meal_for_user", AsyncMock(return_value=False)
    )

    response = api_client.delete("/meals/00000000-0000-0000-0000-000000000000")

    assert response.status_code == 404
    assert response.json()["detail"] == "Meal not found"


def test_delete_meal_rejects_path_outside_media(monkeypatch, tmp_path):
    from app.services.meal_service import _resolved_media_file

    base = tmp_path / "media"
    base.mkdir()
    monkeypatch.setattr("app.services.meal_service.settings.media_dir", str(base))

    assert _resolved_media_file("../../../etc/passwd") is None
    assert _resolved_media_file("meals/../secrets") is None

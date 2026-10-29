import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.core.config import settings
from app.core.security import check_origin, is_development_origin


def request_with_origin(origin: str) -> Request:
    return Request(
        {
            "type": "http",
            "method": "POST",
            "headers": [(b"origin", origin.encode())],
            "path": "/api/v1/auth/guest",
            "query_string": b"",
            "server": ("testserver", 80),
            "client": ("testclient", 50000),
            "scheme": "http",
        }
    )


def test_development_allows_private_lan_frontend_origin(monkeypatch):
    monkeypatch.setattr(settings, "environment", "development")

    check_origin(request_with_origin("http://192.168.1.12:4173"))
    assert is_development_origin("http://192.168.1.12:4173")


def test_development_allows_vites_next_private_lan_port(monkeypatch):
    monkeypatch.setattr(settings, "environment", "development")

    check_origin(request_with_origin("http://192.168.1.12:4174"))
    assert is_development_origin("http://192.168.1.12:4174")


def test_development_cors_allows_private_lan_frontend_origin(client, monkeypatch):
    monkeypatch.setattr(settings, "environment", "development")

    response = client.post(
        "/api/v1/auth/guest",
        headers={"Origin": "http://192.168.1.12:4173"},
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://192.168.1.12:4173"


@pytest.mark.parametrize(
    "origin",
    [
        "http://8.8.8.8:4173",
        "http://example.com:4173",
        "http://192.168.1.12:4173/path",
    ],
)
def test_development_rejects_untrusted_origins(monkeypatch, origin):
    monkeypatch.setattr(settings, "environment", "development")

    with pytest.raises(HTTPException) as error:
        check_origin(request_with_origin(origin))

    assert error.value.status_code == 403

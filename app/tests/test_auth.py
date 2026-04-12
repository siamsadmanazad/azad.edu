import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_register_teacher():
    response = client.post("/api/v1/auth/register", json={
        "email": "teacher@test.com",
        "password": "password123",
        "full_name": "Test Teacher",
        "role": "teacher",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "teacher@test.com"
    assert data["role"]["name"] == "teacher"
    assert "hashed_password" not in data


def test_register_duplicate_email():
    client.post("/api/v1/auth/register", json={
        "email": "duplicate@test.com",
        "password": "password123",
        "full_name": "First User",
        "role": "teacher",
    })
    response = client.post("/api/v1/auth/register", json={
        "email": "duplicate@test.com",
        "password": "password123",
        "full_name": "Second User",
        "role": "teacher",
    })
    assert response.status_code == 400


def test_login_success():
    client.post("/api/v1/auth/register", json={
        "email": "login@test.com",
        "password": "password123",
        "full_name": "Login User",
        "role": "student",
    })
    response = client.post("/api/v1/auth/login", json={
        "email": "login@test.com",
        "password": "password123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password():
    response = client.post("/api/v1/auth/login", json={
        "email": "login@test.com",
        "password": "wrongpassword",
    })
    assert response.status_code == 401


def test_login_unknown_email():
    response = client.post("/api/v1/auth/login", json={
        "email": "nobody@test.com",
        "password": "password123",
    })
    assert response.status_code == 401


def test_get_me_authenticated():
    client.post("/api/v1/auth/register", json={
        "email": "me@test.com",
        "password": "password123",
        "full_name": "Me User",
        "role": "teacher",
    })
    login = client.post("/api/v1/auth/login", json={
        "email": "me@test.com",
        "password": "password123",
    })
    token = login.json()["access_token"]
    response = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "me@test.com"


def test_get_me_unauthenticated():
    response = client.get("/api/v1/users/me")
    assert response.status_code == 403

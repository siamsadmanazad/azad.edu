import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _register_and_login(email: str, role: str) -> str:
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "password123",
        "full_name": "Test User",
        "role": role,
    })
    response = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "password123",
    })
    return response.json()["access_token"]


def test_teacher_can_create_content():
    token = _register_and_login("content_teacher@test.com", "teacher")
    response = client.post(
        "/api/v1/content",
        json={"title": "My First Lesson", "description": "Introduction to Python"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "My First Lesson"
    assert data["status"] == "draft"


def test_student_cannot_create_content():
    token = _register_and_login("content_student@test.com", "student")
    response = client.post(
        "/api/v1/content",
        json={"title": "Unauthorized", "description": "Should fail"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_student_cannot_see_draft_content():
    teacher_token = _register_and_login("draft_teacher@test.com", "teacher")
    create = client.post(
        "/api/v1/content",
        json={"title": "Draft Content"},
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    content_id = create.json()["id"]

    student_token = _register_and_login("draft_student@test.com", "student")
    response = client.get(
        f"/api/v1/content/{content_id}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert response.status_code == 404


def test_student_can_see_published_content():
    teacher_token = _register_and_login("pub_teacher@test.com", "teacher")
    create = client.post(
        "/api/v1/content",
        json={"title": "Published Content"},
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    content_id = create.json()["id"]

    client.post(
        f"/api/v1/content/{content_id}/publish",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )

    student_token = _register_and_login("pub_student@test.com", "student")
    response = client.get(
        f"/api/v1/content/{content_id}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "published"


def test_teacher_cannot_edit_other_teachers_content():
    token_a = _register_and_login("teacher_a@test.com", "teacher")
    token_b = _register_and_login("teacher_b@test.com", "teacher")

    create = client.post(
        "/api/v1/content",
        json={"title": "Teacher A Content"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    content_id = create.json()["id"]

    response = client.patch(
        f"/api/v1/content/{content_id}",
        json={"title": "Stolen Edit"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert response.status_code == 403

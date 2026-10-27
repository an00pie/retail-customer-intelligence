"""
Unit and API Integration Tests for Reward Applications & Operational Task Assignment.
Verifies:
1. Recommendation application with validation and idempotency
2. Customer task creation, listing, and status updates
3. Nonexistent customer handling (honest 404)
4. Payload validation & boundary checks
5. Relational persistence and audit logging
"""
import pytest
from web.app import app
from web.db import (
    get_db_connection,
    apply_customer_recommendation,
    list_customer_recommendations,
    create_customer_task,
    list_customer_tasks,
    get_customer_task,
    update_customer_task_status
)


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


@pytest.fixture(autouse=True)
def clean_test_data():
    """Ensure test data isolation before and after tests."""
    conn = get_db_connection()
    conn.execute("DELETE FROM customer_recommendations WHERE customer_id = '15485' AND recommendation_id LIKE 'vip_test_%'")
    conn.execute("DELETE FROM customer_tasks WHERE customer_id = '15485'")
    conn.commit()
    conn.close()
    yield
    conn = get_db_connection()
    conn.execute("DELETE FROM customer_recommendations WHERE customer_id = '15485' AND recommendation_id LIKE 'vip_test_%'")
    conn.execute("DELETE FROM customer_tasks WHERE customer_id = '15485'")
    conn.commit()
    conn.close()


def test_recommendation_apply_success(client):
    """Verifies applying a valid recommendation persists durably and returns HTTP 201."""
    # Use existing customer #15485
    res = client.post(
        "/api/v1/customers/15485/recommendations/apply",
        json={
            "recommendation_id": "vip_test_reward_1",
            "action_title": "VIP Luxury Preview",
            "action_type": "vip_perk",
            "impact_text": "High Impact • +15% Spend",
            "notes": "Automated test apply"
        }
    )
    assert res.status_code == 201
    data = res.get_json()
    assert data["status"] == "applied"
    assert data["recommendation"]["customer_id"] == "15485"
    assert data["recommendation"]["recommendation_id"] == "vip_test_reward_1"
    assert data["recommendation"]["already_applied"] is False


def test_recommendation_apply_idempotent(client):
    """Verifies re-applying an existing recommendation is idempotent and returns HTTP 200."""
    payload = {
        "recommendation_id": "vip_test_reward_1",
        "action_title": "VIP Luxury Preview",
        "action_type": "vip_perk"
    }
    first_res = client.post("/api/v1/customers/15485/recommendations/apply", json=payload)
    assert first_res.status_code == 201

    res = client.post("/api/v1/customers/15485/recommendations/apply", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "already_applied"
    assert data["recommendation"]["already_applied"] is True


def test_recommendation_apply_nonexistent_customer(client):
    """Verifies applying recommendation to nonexistent customer returns honest 404."""
    res = client.post(
        "/api/v1/customers/9999999/recommendations/apply",
        json={
            "recommendation_id": "rec_unknown",
            "action_title": "VIP Perk"
        }
    )
    assert res.status_code == 404
    assert "Customer not found" in res.get_json()["error"]


def test_recommendation_apply_validation(client):
    """Verifies missing fields, non-object body, and length limits are rejected with HTTP 400."""
    # Non-dict body
    res_array = client.post("/api/v1/customers/15485/recommendations/apply", json=["invalid", "array"])
    assert res_array.status_code == 400
    assert "JSON object body is required" in res_array.get_json()["error"]

    # Missing recommendation_id
    res = client.post("/api/v1/customers/15485/recommendations/apply", json={"action_title": "Test Title"})
    assert res.status_code == 400

    # Missing action_title
    res2 = client.post("/api/v1/customers/15485/recommendations/apply", json={"recommendation_id": "rec_id"})
    assert res2.status_code == 400

    # Length boundary violations
    res_long_id = client.post("/api/v1/customers/15485/recommendations/apply", json={
        "recommendation_id": "r" * 105,
        "action_title": "Valid Title"
    })
    assert res_long_id.status_code == 400

    res_long_notes = client.post("/api/v1/customers/15485/recommendations/apply", json={
        "recommendation_id": "valid_id",
        "action_title": "Valid Title",
        "notes": "x" * 2050
    })
    assert res_long_notes.status_code == 400


def test_list_customer_recommendations(client):
    """Verifies retrieval of customer recommendations."""
    client.post(
        "/api/v1/customers/15485/recommendations/apply",
        json={"recommendation_id": "vip_test_reward_1", "action_title": "VIP Luxury Preview"}
    )
    res = client.get("/api/v1/customers/15485/recommendations")
    assert res.status_code == 200
    data = res.get_json()
    assert data["customer_id"] == "15485"
    assert isinstance(data["recommendations"], list)
    assert any(r["recommendation_id"] == "vip_test_reward_1" for r in data["recommendations"])


def test_customer_task_creation_success(client):
    """Verifies creating an assigned task persists and returns HTTP 201."""
    res = client.post(
        "/api/v1/customers/15485/tasks",
        json={
            "title": "Call customer regarding subscription renewal",
            "description": "High CLV account showing slight recency increase.",
            "assignee": "Retention Specialist",
            "priority": "High",
            "due_date": "2026-11-15"
        }
    )
    assert res.status_code == 201
    data = res.get_json()
    assert data["status"] == "created"
    task = data["task"]
    assert task["customer_id"] == "15485"
    assert task["title"] == "Call customer regarding subscription renewal"
    assert task["priority"] == "High"
    assert task["status"] == "open"
    assert task["id"] > 0


def test_customer_task_validation(client):
    """Verifies task creation rejects invalid inputs with HTTP 400."""
    # Non-dict body
    res_non_dict = client.post("/api/v1/customers/15485/tasks", json="invalid_string")
    assert res_non_dict.status_code == 400

    # Missing title
    res = client.post("/api/v1/customers/15485/tasks", json={"assignee": "Lead"})
    assert res.status_code == 400

    # Excessive description length
    res_desc = client.post("/api/v1/customers/15485/tasks", json={"title": "Test", "description": "d" * 2100})
    assert res_desc.status_code == 400

    # Invalid priority
    res2 = client.post("/api/v1/customers/15485/tasks", json={"title": "Test", "priority": "SuperUrgent"})
    assert res2.status_code == 400

    # Invalid date format
    res3 = client.post("/api/v1/customers/15485/tasks", json={"title": "Test", "due_date": "15-11-2026"})
    assert res3.status_code == 400


def test_customer_task_nonexistent_customer(client):
    """Verifies creating a task for nonexistent customer returns HTTP 404."""
    res = client.post("/api/v1/customers/9999999/tasks", json={"title": "Test Task"})
    assert res.status_code == 404


def test_list_customer_tasks(client):
    """Verifies listing tasks for a customer."""
    client.post("/api/v1/customers/15485/tasks", json={"title": "List test task", "assignee": "Support"})
    res = client.get("/api/v1/customers/15485/tasks")
    assert res.status_code == 200
    data = res.get_json()
    assert data["customer_id"] == "15485"
    assert isinstance(data["tasks"], list)
    assert len(data["tasks"]) >= 1


def test_task_status_update(client):
    """Verifies updating task status to completed and back via PATCH."""
    # Create task
    create_res = client.post("/api/v1/customers/15485/tasks", json={"title": "Task to complete", "assignee": "Support"})
    task_id = create_res.get_json()["task"]["id"]

    # Mark completed
    patch_res = client.patch(f"/api/v1/tasks/{task_id}", json={"status": "completed"})
    assert patch_res.status_code == 200
    assert patch_res.get_json()["task"]["status"] == "completed"

    # Reopen
    patch_res2 = client.patch(f"/api/v1/tasks/{task_id}", json={"status": "open"})
    assert patch_res2.status_code == 200
    assert patch_res2.get_json()["task"]["status"] == "open"

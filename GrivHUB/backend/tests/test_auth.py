import pytest
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
def test_consumer_registration(client):
    payload = {
        "username": "new_consumer_test",
        "password": "securepassword123",
        "email": "testconsumer@domain.in",
        "first_name": "Ramesh",
        "last_name": "Pawar",
        "phone_number": "9822019283",
        "consumer_number": "270099182746",
        "billing_address": "Kothrud, Pune"
    }
    response = client.post("/api/auth/register/", data=payload, content_type="application/json")
    assert response.status_code == status.HTTP_201_CREATED
    assert User.objects.filter(username="new_consumer_test").exists()


@pytest.mark.django_db
def test_login_authentication(client):
    # Unverified consumer cannot log in
    User.objects.create_user(username="unverified_user", password="password123", role=User.Role.CONSUMER, is_verified=False)
    unverified_resp = client.post("/api/auth/login/", data={"username": "unverified_user", "password": "password123"}, content_type="application/json")
    assert unverified_resp.status_code == status.HTTP_403_FORBIDDEN
    assert unverified_resp.data["requires_verification"] is True

    # Verified consumer can log in
    User.objects.create_user(username="testuser", password="password123", role=User.Role.CONSUMER, is_verified=True)
    payload = {
        "username": "testuser",
        "password": "password123"
    }
    response = client.post("/api/auth/login/", data=payload, content_type="application/json")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["user"]["username"] == "testuser"

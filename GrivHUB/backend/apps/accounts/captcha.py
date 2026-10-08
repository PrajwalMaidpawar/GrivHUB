"""
GrievanceHUB CAPTCHA Verification Service Abstraction
Supports Cloudflare Turnstile and Google reCAPTCHA v2/v3.
Configurable via environment variables.
"""

import os
import json
import logging
import urllib.request
import urllib.parse
from django.conf import settings

logger = logging.getLogger("grievancehub.accounts")

class CaptchaService:
    @staticmethod
    def is_enabled() -> bool:
        """
        Check if CAPTCHA verification is required.
        Defaults to False in development/testing mode unless explicitly set to True.
        In production (DEBUG=False), defaults to True unless explicitly disabled.
        """
        env_val = os.environ.get("CAPTCHA_ENABLED")
        if env_val is not None:
            return env_val.lower() in ("true", "1", "yes")
        # In non-DEBUG (production), CAPTCHA is required if secret key is present
        if not getattr(settings, "DEBUG", True):
            return bool(os.environ.get("CAPTCHA_SECRET_KEY"))
        return False

    @staticmethod
    def get_site_key() -> str:
        return os.environ.get("CAPTCHA_SITE_KEY", "")

    @classmethod
    def verify(cls, token: str, remote_ip: str = None) -> tuple[bool, str]:
        """
        Validates CAPTCHA token against provider API.
        Returns (is_valid: bool, error_message: str).
        """
        if not cls.is_enabled():
            return True, ""

        if not token:
            return False, "CAPTCHA verification is required."

        secret_key = os.environ.get("CAPTCHA_SECRET_KEY", "")
        if not secret_key:
            if getattr(settings, "DEBUG", True):
                # Development fallback
                logger.warning("CAPTCHA is enabled but CAPTCHA_SECRET_KEY is not set. Bypassing in DEBUG mode.")
                return True, ""
            return False, "CAPTCHA service configuration error."

        # Allow special mock test token in debug/test environments
        if getattr(settings, "DEBUG", True) and token in ("dev-mock-captcha-token", "test-captcha-token"):
            return True, ""

        provider = os.environ.get("CAPTCHA_PROVIDER", "turnstile").lower()
        if provider == "recaptcha":
            verify_url = "https://www.google.com/recaptcha/api/siteverify"
        else:
            # Default to Cloudflare Turnstile
            verify_url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

        payload = {
            "secret": secret_key,
            "response": token,
        }
        if remote_ip:
            payload["remoteip"] = remote_ip

        try:
            data = urllib.parse.urlencode(payload).encode("utf-8")
            req = urllib.request.Request(
                verify_url,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                result = json.loads(response.read().decode("utf-8"))
                if result.get("success"):
                    return True, ""
                error_codes = result.get("error-codes", [])
                logger.warning(f"CAPTCHA verification failed: {error_codes}")
                return False, "CAPTCHA verification failed. Please try again."
        except Exception as e:
            logger.error(f"Error connecting to CAPTCHA service: {e}")
            if getattr(settings, "DEBUG", True):
                return True, ""
            return False, "Unable to verify CAPTCHA due to network error."

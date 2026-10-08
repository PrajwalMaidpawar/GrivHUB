"""
GrievanceHUB Authentication Rate Limiting & Throttling
Protects against credential stuffing, brute force OTP attacks, and SMS/Email abuse.
"""

from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle


class AuthLoginThrottle(SimpleRateThrottle):
    scope = 'auth_login'

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        # Throttle by client IP and attempted identifier to prevent distributed brute force
        identifier = str(request.data.get('identifier') or request.data.get('username') or '').strip().lower()
        return f"throttle_login_{ident}_{identifier}"


class AuthSignupThrottle(AnonRateThrottle):
    scope = 'auth_signup'


class AuthVerifyThrottle(SimpleRateThrottle):
    scope = 'auth_verify'

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        identifier = str(request.data.get('identifier') or '').strip().lower()
        return f"throttle_verify_{ident}_{identifier}"


class AuthResendThrottle(SimpleRateThrottle):
    scope = 'auth_resend'

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        identifier = str(request.data.get('identifier') or '').strip().lower()
        return f"throttle_resend_{ident}_{identifier}"


class AuthPasswordResetThrottle(SimpleRateThrottle):
    scope = 'auth_password_reset'

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        identifier = str(request.data.get('identifier') or '').strip().lower()
        return f"throttle_reset_{ident}_{identifier}"

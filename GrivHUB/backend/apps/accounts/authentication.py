from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    SessionAuthentication without CSRF token enforcement for REST API endpoints.
    Allows React/Vite SPAs (validated via CORS and CSRF_TRUSTED_ORIGINS)
    to authenticate and maintain session cookies smoothly.
    """
    def enforce_csrf(self, request):
        return  # CSRF enforcement bypassed for API client endpoints

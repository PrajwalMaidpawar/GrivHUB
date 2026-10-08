from rest_framework.permissions import BasePermission
from backend.apps.accounts.models import User


class IsConsumer(BasePermission):
    """Allows access only to authenticated, verified Consumers."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            ((request.user.role == User.Role.CONSUMER and getattr(request.user, 'is_verified', True))
             or request.user.is_superuser)
        )


class IsOfficer(BasePermission):
    """Allows access only to authenticated, approved Field Officers and Admins."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser or request.user.role == User.Role.ADMIN:
            return True
        if request.user.role == User.Role.OFFICER and request.user.is_active:
            profile = getattr(request.user, 'officer_profile', None)
            if profile:
                return profile.approval_status == 'APPROVED' and getattr(request.user, 'is_verified', True)
            return getattr(request.user, 'is_verified', True)
        return False


class IsApprovedOfficer(BasePermission):
    """
    Allows access strictly to authenticated, verified, active Field Officers
    whose approval_status is APPROVED (or Admins).
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser or request.user.role == User.Role.ADMIN:
            return True
        if request.user.role == User.Role.OFFICER and request.user.is_active and getattr(request.user, 'is_verified', False):
            profile = getattr(request.user, 'officer_profile', None)
            return bool(profile and profile.approval_status == 'APPROVED')
        return False


class IsAdminUserRole(BasePermission):
    """Allows access only to System Administrators."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role == User.Role.ADMIN or request.user.is_superuser)
        )


class IsComplaintOwnerOrStaff(BasePermission):
    """
    Object-level permission ensuring consumers can only view and mutate their own grievances.
    Officers and Admins can access according to their duties.
    """
    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False

        if request.user.is_superuser or request.user.role == User.Role.ADMIN:
            return True

        if request.user.role == User.Role.OFFICER:
            return True

        # Consumer ownership check
        consumer_id = getattr(obj, "consumer_id", None)
        return consumer_id == request.user.id

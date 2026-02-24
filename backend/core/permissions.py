from rest_framework.permissions import BasePermission

class IsAdminUserRole(BasePermission):
    """
    Allows access only to users with the 'admin' role.
    """
    def has_permission(self, request, view):
        is_auth = bool(request.user and request.user.is_authenticated)
        role = getattr(request.user, 'role', 'NO_ROLE')
        print(f"IsAdminUserRole check: authenticated={is_auth}, role={role}, path={request.path}")
        return is_auth and role == 'admin'

class IsPromoter(BasePermission):
    """
    Allows access only to users with the 'promoter' role.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'promoter')

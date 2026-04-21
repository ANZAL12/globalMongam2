from django.urls import path
from .views import GoogleLoginView, TestProtectedView, CreatePromoterView, PromoterListView, PasswordLoginView, PromoterDetailView, UpdatePushTokenView, AdminLogListView, ChangePasswordView, TogglePromoterStatusView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('google-login/', GoogleLoginView.as_view(), name='google-login'),
    path('login/', PasswordLoginView.as_view(), name='login'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('test-protected/', TestProtectedView.as_view()),
    path('admin/create-promoter/', CreatePromoterView.as_view(), name='create-promoter'),
    path('admin/promoters/', PromoterListView.as_view(), name='promoter-list'),
    path('admin/promoter/<int:pk>/', PromoterDetailView.as_view(), name='promoter-detail'),
    path('admin/promoter/<int:pk>/toggle-status/', TogglePromoterStatusView.as_view(), name='toggle-promoter-status'),
    path('admin/logs/', AdminLogListView.as_view(), name='admin-logs'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('update-push-token/', UpdatePushTokenView.as_view(), name='update-push-token'),
]

from django.urls import path
from .views import GoogleLoginView, TestProtectedView, CreatePromoterView, PromoterListView, PasswordLoginView, PromoterDetailView, UpdatePushTokenView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('google-login/', GoogleLoginView.as_view(), name='google-login'),
    path('login/', PasswordLoginView.as_view(), name='login'),
    path('test-protected/', TestProtectedView.as_view()),
    path('admin/create-promoter/', CreatePromoterView.as_view(), name='create-promoter'),
    path('admin/promoters/', PromoterListView.as_view(), name='promoter-list'),
    path('admin/promoter/<int:pk>/', PromoterDetailView.as_view(), name='promoter-detail'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('update-push-token/', UpdatePushTokenView.as_view(), name='update-push-token'),
]
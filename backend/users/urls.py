from django.urls import path
from .views import GoogleLoginView
from .views import TestProtectedView

urlpatterns = [
    path('google-login/', GoogleLoginView.as_view(), name='google-login'),
    path('test-protected/', TestProtectedView.as_view()),
]
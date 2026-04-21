from django.urls import path
from .views import (
    SaleCreateView,
    PromoterSaleListView,
    AdminSaleListView,
    AdminSaleApproveView,
    AdminSaleRejectView,
    AdminSaleMarkPaidView,
)

urlpatterns = [
    # Promoter endpoints
    path('create/', SaleCreateView.as_view(), name='sale-create'),
    path('my-sales/', PromoterSaleListView.as_view(), name='promoter-sale-list'),
    
    # Admin endpoints
    path('all/', AdminSaleListView.as_view(), name='admin-sale-list'),
    path('<int:pk>/approve/', AdminSaleApproveView.as_view(), name='admin-sale-approve'),
    path('<int:pk>/reject/', AdminSaleRejectView.as_view(), name='admin-sale-reject'),
    path('<int:pk>/mark-paid/', AdminSaleMarkPaidView.as_view(), name='admin-sale-mark-paid'),
]

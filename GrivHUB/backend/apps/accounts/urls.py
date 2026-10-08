from django.urls import path
from backend.apps.accounts import views

urlpatterns = [
    path('register/', views.register_consumer_view, name='auth-register'),
    path('signup/', views.register_consumer_view, name='auth-signup'),
    path('verify/', views.verify_account_view, name='auth-verify'),
    path('resend-verification/', views.resend_verification_view, name='auth-resend-verification'),
    path('staff/register/', views.register_staff_view, name='auth-staff-register'),
    path('staff/verify/', views.verify_staff_view, name='auth-staff-verify'),
    path('staff/resend-verification/', views.resend_staff_verification_view, name='auth-staff-resend-verification'),
    path('login/', views.login_view, name='auth-login'),
    path('logout/', views.logout_view, name='auth-logout'),
    path('forgot-password/', views.forgot_password_view, name='auth-forgot-password'),
    path('reset-password/', views.reset_password_view, name='auth-reset-password'),
    path('me/', views.me_view, name='auth-me'),
]

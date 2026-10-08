from django.urls import path
from backend.apps.accounts import views

urlpatterns = [
    # Staff Management (Admin Only)
    path('staff/', views.admin_list_staff_view, name='admin-staff-list'),
    path('staff/<int:staff_id>/', views.admin_staff_detail_view, name='admin-staff-detail'),
    path('staff/<int:staff_id>/approve/', views.admin_staff_approve_view, name='admin-staff-approve'),
    path('staff/<int:staff_id>/reject/', views.admin_staff_reject_view, name='admin-staff-reject'),
    path('staff/<int:staff_id>/suspend/', views.admin_staff_suspend_view, name='admin-staff-suspend'),
    path('staff/<int:staff_id>/reactivate/', views.admin_staff_reactivate_view, name='admin-staff-reactivate'),

    # Admin Invitations
    path('invitations/', views.admin_create_invitation_view, name='admin-invite-create'),
    path('invitations/list/', views.admin_list_invitations_view, name='admin-invite-list'),
    path('invitations/<str:token>/accept/', views.accept_admin_invitation_view, name='admin-invite-accept'),
]

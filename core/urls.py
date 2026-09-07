from django.urls import path
from . import views

urlpatterns = [
    path("uploads/", views.upload_config, name="upload_config"),
    path("uploads/<uuid:upload_id>/", views.get_upload, name="get_upload"),
    path("uploads/<uuid:upload_id>/remediation/propose/", views.propose_remediation, name="propose_remediation"),
    path("uploads/<uuid:upload_id>/remediation/execute/", views.execute_remediation_view, name="execute_remediation"),
]
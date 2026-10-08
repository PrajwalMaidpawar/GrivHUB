from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

DEPARTMENTS_CATALOG = [
    {"code": "POWER_SUPPLY", "name": "Power Supply & Operations", "description": "Handles outages, feeder trips, and supply interruptions"},
    {"code": "METERING", "name": "Metering & Technical Service", "description": "Handles meter defects, slow meters, error codes, and replacement"},
    {"code": "BILLING", "name": "Billing & Consumer Revenue", "description": "Handles tariff queries, high bills, payment updates, and refunds"},
    {"code": "MAINTENANCE", "name": "Substation & Line Maintenance", "description": "Handles transformer maintenance, jumpers, and line maintenance"},
    {"code": "EMERGENCY_SAFETY", "name": "Emergency Electrical Safety", "description": "24/7 response for fallen poles, loose live wires, and transformer fires"},
    {"code": "COMMERCIAL", "name": "New Connections & Commercial", "description": "New service connections, name transfer, load enhancement"},
]

@api_view(['GET'])
@permission_classes([AllowAny])
def list_departments_view(request):
    return Response({"departments": DEPARTMENTS_CATALOG})

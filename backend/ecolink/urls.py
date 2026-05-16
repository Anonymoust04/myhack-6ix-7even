"""
EcoLink root URL configuration.
"""
from django.urls import path, include

from django.http import JsonResponse

def api_root(request):
    return JsonResponse({
        "name": "EcoLink AI Ecosystem Platform API",
        "version": "1.0.0",
        "status": "online",
        "endpoints": "/api/"
    })

urlpatterns = [
    path('', api_root),
    path('api/', include('api.urls')),
]

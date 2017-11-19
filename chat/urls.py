from django.conf.urls import url
from . import views


urlpatterns = [
    url(r'^$', views.chat, name="chat"),
    url(r'city$', views.city, name="city"),
    url(r'token$', views.token, name="token"),
]

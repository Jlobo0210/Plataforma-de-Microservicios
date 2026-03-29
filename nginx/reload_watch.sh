#!/bin/sh
# Vigilar cambios en configs y recargar NGINX
while true; do
    inotifywait -e modify,create,delete /etc/nginx/conf.d/
    nginx -s reload
done
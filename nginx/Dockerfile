FROM nginx:alpine

# Script para recargar NGINX cuando cambien las configs
COPY reload_watch.sh /reload_watch.sh
RUN chmod +x /reload_watch.sh

CMD ["/bin/sh", "-c", "nginx & /reload_watch.sh"]
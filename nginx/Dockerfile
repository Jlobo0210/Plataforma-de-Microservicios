FROM nginx:alpine

# ⭐ Instalar inotify-tools
RUN apk add --no-cache inotify-tools

COPY reload_watch.sh /reload_watch.sh
RUN sed -i 's/\r//' /reload_watch.sh && chmod +x /reload_watch.sh

CMD ["/bin/sh", "-c", "nginx && /reload_watch.sh"]
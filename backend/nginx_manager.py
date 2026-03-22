import os

class NginxManager:
    def __init__(self):
        self.config_path = os.getenv("NGINX_CONFIG_PATH", "/nginx_locations")
        self.enabled = os.path.exists(self.config_path)
        
        if not self.enabled:
            print("⚠️  [NginxManager] Carpeta no encontrada, rutas no se escribirán")
        else:
            print(f"✅ [NginxManager] Usando carpeta: {self.config_path}")

    def add_route(self, service_id: str, container_name: str, endpoint: str):
        if not self.enabled:
            print(f"[DEV] Ruta ignorada: /api/services/{endpoint}")
            return

        # ⭐ Separar las variables de nginx de las de Python
        nginx_dollar = "$"  # Para evitar que Python interprete $1, $host, etc.

        config_content = (
    f"location ~ ^/api/services/{endpoint} {{\n"
    f"    set {nginx_dollar}rewrite_path {nginx_dollar}1;\n"
    f"    if ({nginx_dollar}rewrite_path = '') {{\n"
    f"        set {nginx_dollar}rewrite_path /;\n"
    f"    }}\n"
    f"    rewrite ^/api/services/{endpoint}(/.*)?  {nginx_dollar}rewrite_path  break;\n"
    f"    proxy_pass http://{container_name}:8080;\n"
    f"    proxy_set_header Host {nginx_dollar}host;\n"
    f"    proxy_set_header X-Real-IP {nginx_dollar}remote_addr;\n"
    f"    proxy_set_header Content-Type {nginx_dollar}content_type;\n"
    f"    proxy_set_header Content-Length {nginx_dollar}content_length;\n"
    f"    proxy_pass_request_body on;\n"
    f"    proxy_connect_timeout 30s;\n"
    f"    proxy_read_timeout 60s;\n"
    f"}}\n"
)

        config_file = os.path.join(self.config_path, f"ms_{service_id}.conf")
        with open(config_file, 'w') as f:
            f.write(config_content)
        
        # Verificar que el archivo se generó bien
        print(f"✅ [NginxManager] Ruta creada: /api/services/{endpoint}")

    def remove_route(self, service_id: str):
        if not self.enabled:
            return

        config_file = os.path.join(self.config_path, f"ms_{service_id}.conf")
        if os.path.exists(config_file):
            os.remove(config_file)
            print(f"🗑️  [NginxManager] Ruta eliminada: {service_id}")

    def cleanup_all(self):
        if not self.enabled:
            return

        for file in os.listdir(self.config_path):
            if file.startswith("ms_") and file.endswith(".conf"):
                os.remove(os.path.join(self.config_path, file))
        
        print("🗑️  [NginxManager] Todas las rutas eliminadas")
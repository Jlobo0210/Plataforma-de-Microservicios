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
        
        """
        Genera un archivo .conf para el nuevo microservicio.
        NGINX lo detecta y recarga automáticamente.
        """
        config_content = f"""
        # Microservicio: {service_id}
        location ~ ^/api/services/{endpoint}(/.*)?$ {{
            rewrite ^/api/services/{endpoint}(/.*)?$ /\$1 break;
            proxy_pass http://{container_name}:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            
            # Timeout generoso para cold starts
            proxy_connect_timeout 30s;
            proxy_read_timeout 60s;
        }}
        """
        config_file = os.path.join(self.config_path, f"ms_{service_id}.conf")
        with open(config_file, 'w') as f:
            f.write(config_content)
        
        print(f"✅ [NginxManager] Ruta creada: /api/services/{endpoint}/")

    def remove_route(self, service_id: str):
        if not self.enabled:
            return
        
        """Elimina la config de NGINX para un microservicio."""
        config_file = os.path.join(self.config_path, f"ms_{service_id}.conf")
        if os.path.exists(config_file):
            os.remove(config_file)
            print(f"🗑️  [NginxManager] Ruta eliminada: {service_id}")

    def cleanup_all(self):
        if not self.enabled:
            return
        
        """Elimina todas las configs de microservicios."""
        for file in os.listdir(self.config_path):
            if file.startswith("ms_") and file.endswith(".conf"):
                os.remove(os.path.join(self.config_path, file))
        
        print("🗑️  [NginxManager] Todas las rutas eliminadas")
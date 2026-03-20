import docker
import uuid
import os
import shutil
import tempfile

class DockerManager:
    def __init__(self):
        self.client = docker.from_env()
        self.network_name = os.getenv("DOCKER_NETWORK", "platform_network")
        self.active_services = {}
        
        # Ruta a las plantillas (relativa a este archivo)
        self.templates_dir = os.path.join(os.path.dirname(__file__), "templates")
        
        # Construye las imágenes base al iniciar
        print("Construyendo imágenes base...")
        self._build_base_images()
        print("Imágenes base listas.")

    def _build_base_images(self):
        """
        Construye las imágenes base una sola vez al arrancar.
        Estas imágenes ya tienen Python o Javascript instalados.
        """
        base_images = {
            "python": {
                "tag": "ms-platform-python:latest",
                "path": os.path.join(self.templates_dir, "python")
            },
            "javascript": {
                "tag": "ms-platform-javascript:latest",
                "path": os.path.join(self.templates_dir, "javascript")
            }
        }
        
        for lang, config in base_images.items():
            try:
                # Verifica si la imagen ya existe para no reconstruirla cada vez
                self.client.images.get(config["tag"])
                print(f"  [{lang}] Imagen ya existe, saltando build.")
            except docker.errors.ImageNotFound:
                print(f"  [{lang}] Construyendo imagen base (puede tardar un momento)...")
                self.client.images.build(
                    path=config["path"],
                    tag=config["tag"],
                    rm=True  # Limpia capas intermedias
                )
                print(f"  [{lang}] Imagen lista.")

    def create_microservice(self, name: str, code: str, language: str) -> dict:
        """
        Crea un contenedor usando la imagen base ya construida.
        El código del usuario se inyecta como variable de entorno.
        """
        service_id = str(uuid.uuid4())[:8]
        container_name = f"ms-{name}-{service_id}"
        
        # Usa la imagen base pre-construida según el lenguaje
        images = {
            "python": "ms-platform-python:latest",
            "javascript":   "ms-platform-javascript:latest"
        }
        image = images.get(language)
        if not image:
            raise Exception(f"Lenguaje '{language}' no soportado. Usa 'python' o 'javascript'.")

        try:
            container = self.client.containers.run(
                image=image,
                name=container_name,
                # El código llega como variable de entorno, no hay build
                environment={
                    "USER_CODE": code,
                    "SERVICE_NAME": name
                },
                network=self.network_name,
                detach=True,
                remove=False,
                labels={
                    "platform": "microservice-platform",
                    "service_id": service_id
                }
            )

            self.active_services[service_id] = {
                "container_id": container.id,
                "container_name": container_name,
                "name": name,
                "language": language,
                "endpoint": f"/services/{name}-{service_id}"
            }

            return {
                "service_id": service_id,
                "container_name": container_name,
                "endpoint": f"/services/{name}-{service_id}"
            }

        except Exception as e:
            raise Exception(f"Error creando contenedor: {str(e)}")

    def stop_microservice(self, service_id: str):
        """Detiene y elimina un microservicio."""
        if service_id in self.active_services:
            info = self.active_services[service_id]
            try:
                container = self.client.containers.get(info["container_id"])
                container.stop()
                container.remove()
                del self.active_services[service_id]
            except Exception as e:
                print(f"Error deteniendo contenedor: {e}")

    def cleanup_all(self):
        """Limpia todos los microservicios al apagar la plataforma."""
        for service_id in list(self.active_services.keys()):
            self.stop_microservice(service_id)
        
        # Limpia también por labels por si quedó algo huérfano
        containers = self.client.containers.list(
            filters={"label": "platform=microservice-platform"}
        )
        for container in containers:
            container.stop()
            container.remove()




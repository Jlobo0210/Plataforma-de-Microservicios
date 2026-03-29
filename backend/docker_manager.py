import docker
import uuid
import os

class DockerManager:
    def __init__(self):
        self.client = docker.from_env()
        self.network_name = os.getenv("DOCKER_NETWORK", "platform_network")
        self.active_services = {}  # {service_id: container}

    def create_microservice(self, name: str, code: str, language: str) -> dict:
        """
        Crea un contenedor con el código del microservicio.
        Retorna info del servicio creado.
        """
        service_id = str(uuid.uuid4())[:8]
        container_name = f"ms-{name}-{service_id}"
        
        # Imagen base según el lenguaje
        base_images = {
            "python": "python:3.11-slim",
            "javascript": "node:18-slim"
        }
        image = base_images.get(language)

        # Comando para ejecutar el código
        # El código se pasa como variable de entorno
        commands = {
            "python": f'python -c "{code}"',    # Simplificado
            "javascript": f'node -e "{code}"'
        }

        try:
            container = self.client.containers.run(
                image=image,
                name=container_name,
                command=self._build_server_command(code, language),
                environment={
                    "USER_CODE": code,
                    "SERVICE_NAME": name
                },
                network=self.network_name,
                detach=True,
                remove=False,   # Lo removemos manualmente al apagar
                labels={
                    "platform": "microservice-platform",
                    "service_id": service_id
                }
            )

            self.active_services[service_id] = {
                "container_id": container.id,
                "container_name": container_name,
                "name": name,
                "language": language
            }

            return {
                "service_id": service_id,
                "container_name": container_name,
                "endpoint": f"/services/{name}-{service_id}"
            }

        except Exception as e:
            raise Exception(f"Error creando contenedor: {str(e)}")

    def _build_server_command(self, code: str, language: str) -> str:
        """
        Construye un mini servidor HTTP que ejecuta el código del usuario.
        El servidor escucha en el puerto 8080.
        """
        if language == "python":
            # Crea un servidor FastAPI mínimo que ejecuta la función del usuario
            return ["python", "-c", f"""
import uvicorn
from fastapi import FastAPI, Request

app = FastAPI()
exec('''{code}''', globals())

@app.get("/")
async def run(request: Request):
    params = dict(request.query_params)
    # Llama a la función 'main' que debe definir el usuario
    result = main(**params)
    return {{"result": result}}

uvicorn.run(app, host="0.0.0.0", port=8080)
            """]

        elif language == "javascript":
            return ["node", "-e", f"""
            const http = require('http');
            const url = require('url');
            
            {code}
            
            const server = http.createServer((req, res) => {{
                const params = Object.fromEntries(
                    new URLSearchParams(url.parse(req.url).query)
                );
                Promise.resolve(main(params)).then(result => {{
                    res.writeHead(200, {{'Content-Type': 'application/json'}});
                    res.end(JSON.stringify({{ result }}));
                }});
            }});
            
            server.listen(8080, '0.0.0.0');
            """]

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
        """Limpia todos los microservicios (al apagar la plataforma)."""
        for service_id in list(self.active_services.keys()):
            self.stop_microservice(service_id)
        
        # También limpia por labels por si acaso
        containers = self.client.containers.list(
            filters={"label": "platform=microservice-platform"}
        )
        for container in containers:
            container.stop()
            container.remove()
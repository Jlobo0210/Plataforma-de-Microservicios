import docker
import uuid
import os
import ast
import json
import time
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
    
    # ─────────────────────────────────────────────────────
    # Parsers
    # ─────────────────────────────────────────────────────
    
    def _parse_python_params(self, code: str) -> dict:
        """Parsea los parámetros de una función Python con AST."""
        tree = ast.parse(code)

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                params = []
                args = node.args
                num_args = len(args.args)
                num_defaults = len(args.defaults)
                num_without_default = num_args - num_defaults

                for i, arg in enumerate(args.args):
                    if arg.arg == "self":
                        continue

                    param = {
                        "name": arg.arg,
                        "required": i < num_without_default,
                        "default": None,
                        "type": None
                    }

                    default_index = i - num_without_default
                    if default_index >= 0:
                        default_node = args.defaults[default_index]
                        if isinstance(default_node, ast.Constant):
                            param["default"] = default_node.value

                    if arg.annotation and isinstance(arg.annotation, ast.Name):
                        param["type"] = arg.annotation.id

                    params.append(param)

                return {"function": node.name, "params": params}

        raise Exception("No se encontró ninguna función en el código")

    def _parse_js_params(self, service_id: str, code: str) -> dict:
        """Usa acorn desde el contenedor para parsear parámetros de JS."""
        
        parse_script = """
const acorn = require('acorn');
const code = process.env.USER_CODE || '';

try {
    const ast = acorn.parse(code, { ecmaVersion: 2020, sourceType: 'script' });

    function getParams(funcNode) {
        return funcNode.params.map(param => {
            if (param.type === 'AssignmentPattern') {
                return {
                    name: param.left.name,
                    required: false,
                    default: param.right.value ?? null,
                    type: null
                };
            }
            return { name: param.name, required: true, default: null, type: null };
        });
    }

    for (const node of ast.body) {
        if (node.type === 'FunctionDeclaration') {
            console.log(JSON.stringify({ function: node.id.name, params: getParams(node) }));
            process.exit(0);
        }
        if (
            node.type === 'VariableDeclaration' &&
            node.declarations[0].init &&
            (
                node.declarations[0].init.type === 'ArrowFunctionExpression' ||
                node.declarations[0].init.type === 'FunctionExpression'
            )
        ) {
            console.log(JSON.stringify({ function: node.declarations[0].id.name, params: getParams(node.declarations[0].init) }));
            process.exit(0);
        }
    }
    console.log(JSON.stringify({ error: 'No se encontró ninguna función' }));
} catch(e) {
    console.log(JSON.stringify({ error: e.message }));
}
"""
        container_name = self.active_services[service_id]["container_name"]
        container = self.client.containers.get(container_name)
        result = container.exec_run(["node", "-e", parse_script])
        
        return json.loads(result.output.decode())

    def _parse_params(self, service_id: str, code: str, language: str) -> dict:
        """Delega al parser según el lenguaje."""
        try:
            if language == "python":
                return self._parse_python_params(code)
            elif language == "javascript":
                return self._parse_js_params(service_id, code)
            else:
                raise Exception(f"Lenguaje '{language}' no soportado")
        except Exception as e:
            # Si falla el parser no rompemos la creación del microservicio
            print(f"⚠️  [Parser] Error: {str(e)}")
            return {"function": None, "params": []}

    # ─────────────────────────────────────────────────────
    # CRUD de microservicios
    # ─────────────────────────────────────────────────────

    def _wait_for_container(self, container, timeout: int = 10):
        """Espera a que el contenedor esté en estado running."""
        start = time.time()
        while time.time() - start < timeout:
            container.reload()  # Refresca el estado del contenedor
            if container.status == "running":
                print(f"✅ Contenedor listo: {container.name}")
                return
            print(f"⏳ Esperando contenedor {container.name} ({container.status})...")
            time.sleep(0.5)
        raise Exception(f"Timeout esperando el contenedor {container.name}")
    
    
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
            
            self._wait_for_container(container)

            self.active_services[service_id] = {
                "container_id": container.id,
                "container_name": container_name,
                "name": name,
                "language": language,
                "code": code,
                "endpoint": f"/api/services/{name}-{service_id}",
                "function": None,
                "params": []    
            }
            # ⭐ Parsear y guardar los parámetros junto con el resto de la info
            params_info = self._parse_params(service_id, code, language)
            
            self.active_services[service_id]["function"] = params_info.get("function")
            self.active_services[service_id]["params"] = params_info.get("params", [])
            
            
            print(f"✅ Microservicio creado: {container_name}")
            print(f"   Función: {params_info.get('function')}")
            print(f"   Parámetros: {params_info.get('params')}")

            return {
                "service_id": service_id,
                "container_name": container_name,
                "endpoint": f"/api/services/{name}-{service_id}",
                "function": params_info.get("function"),
                "params": params_info.get("params", [])
            }

        except Exception as e:
            raise Exception(f"Error creando contenedor: {str(e)}")

    def get_service_params(self, service_id: str) -> dict:
        """Retorna los parámetros ya almacenados, sin reparsear."""
        if service_id not in self.active_services:
            raise Exception(f"Microservicio '{service_id}' no encontrado")

        service = self.active_services[service_id]
        return {
            "function": service.get("function"),
            "params": service.get("params", [])
        }
    
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




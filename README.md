# Plataforma Dinámica de Microservicios

> Repositorio: [GitHub](https://github.com/Jlobo0210/Plataforma-de-Microservicios.git)  
> Video de demostración: [YouTube](<LINK_VIDEO_AQUÍ>)

---

## Descripción

Sistema que permite crear, desplegar y ejecutar microservicios en contenedores Docker de forma dinámica desde una interfaz web, sin necesidad de reiniciar ningún servicio ni modificar configuraciones manualmente.

El usuario escribe una función en **Python** o **JavaScript** directamente en el navegador. La plataforma toma ese código, construye un contenedor Docker con él, lo expone como un endpoint HTTP y permite ejecutarlo con parámetros personalizados, todo en tiempo real.

### Funcionalidades principales

- Crear microservicios pegando código fuente directamente en la interfaz web
- Soporte para **Python** y **JavaScript**
- Despliegue automático en contenedores Docker aislados
- Detección automática de parámetros de la función mediante análisis de código (AST / Acorn)
- Ejecución del microservicio con parámetros desde la UI y visualización del resultado
- Habilitar y deshabilitar servicios sin eliminar el contenedor
- Eliminación de contenedores desde la interfaz
- Enrutamiento dinámico mediante NGINX sin necesidad de reinicio

---

## Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        USUARIO                                  │
│                    Navegador · localhost                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  FRONTEND — React.js                             │
│                                                                  │
│  Dashboard · ServiceDetail · CreateServiceModal · Sidebar        │
│  React Router · Tailwind CSS · Fetch API                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ fetch /api/...
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  NGINX — Reverse Proxy                           │
│                                                                  │
│  /api/services  ─────────────────────► Backend :8000            │
│  /api/services/{name}-{id}  ─────────► Contenedor :8080         │
│                                                                  │
│  Recarga configuración dinámicamente desde volumen compartido    │
│                        puerto 80                                 │
└──────────────┬────────────────────────────────┬─────────────────┘
               │                                │
               ▼                                ▼
┌──────────────────────────┐    ┌───────────────────────────────────┐
│  BACKEND — FastAPI        │    │  CONTENEDORES DOCKER              │
│                          │    │                                    │
│  main.py                 │    │  ms-{name}-{id}  puerto 8080       │
│  docker_manager.py       │    │                                    │
│  nginx_manager.py        │    │  Python → runner.py (FastAPI)      │
│                          │    │  JavaScript → runner.js (Express)  │
│  POST   /api/services    │    │                                    │
│  GET    /api/services    │    │  Código inyectado como USER_CODE   │
│  DELETE /api/services    │    │  Función detectada automáticamente │
│  PATCH  .../enable       │    │  Expuesta en GET / y POST /        │
│  PATCH  .../disable      │    │                                    │
│  GET    .../params       │    └───────────────────────────────────┘
│                          │
│  puerto 8000             │
└──────────┬───────────────┘
           │ /var/run/docker.sock
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    DOCKER ENGINE                                  │
│                                                                  │
│  Red interna: platform_network                                   │
│  Imágenes base: ms-platform-python · ms-platform-javascript      │
│  Construidas una sola vez al iniciar el backend                  │
└──────────────────────────────────────────────────────────────────┘

           ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
           Volumen compartido: nginx_locations
           Backend escribe .conf → NGINX los lee
           ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
```

---

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo
- Docker Compose v2

---

## Instalación y ejecución

```bash
# 1. Clonar el repositorio
git clone <LINK_REPOSITORIO_AQUÍ>
cd Plataforma-de-Microservicios

# 2. Levantar todos los servicios
docker compose up --build

# 3. Abrir la aplicación en el navegador
# http://localhost:3000
```

La primera vez puede tardar unos minutos mientras Docker construye las imágenes base de Python y JavaScript.

---

## Ejemplos para el dashboard

Los siguientes ejemplos están listos para copiar y pegar en el formulario de creación.

### Hola Mundo — Python

**Nombre:** `hola`  
**Lenguaje:** Python  
**Código:**
```python
def hola():
    return "Hola Mundo"
```

### Hola Mundo — JavaScript

**Nombre:** `hola`  
**Lenguaje:** JavaScript  
**Código:**
```javascript
function hola(params) {
    return "Hola Mundo";
}
```

### Suma de dos valores — Python

**Nombre:** `suma`  
**Lenguaje:** Python  
**Código:**
```python
def suma(a, b):
    return int(a) + int(b)
```

**Uso:** llamar el endpoint con `?a=5&b=3`

### Suma de dos valores — JavaScript

**Nombre:** `suma`  
**Lenguaje:** JavaScript  
**Código:**
```javascript
function suma(params) {
    return parseInt(params.a) + parseInt(params.b);
}
```

**Uso:** llamar el endpoint con `?a=5&b=3`

---

## Estructura del proyecto

```
Plataforma-de-Microservicios/
│
├── frontend/                        # Aplicación React
│   ├── src/
│   │   ├── components/
│   │   │   ├── CodeEditor.jsx       # Editor con numeración de líneas
│   │   │   ├── CreateServiceModal.jsx
│   │   │   ├── ServiceCard.jsx      # Tarjeta de cada microservicio
│   │   │   ├── Sidebar.jsx
│   │   │   └── StatusBadge.jsx
│   │   ├── pages/
│   │   │   ├── App.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── ServiceDetail.jsx    # Página de ejecución del servicio
│   │   └── services/
│   │       └── api.js               # Capa de comunicación con el backend
│   └── Dockerfile.dev
│
├── backend/                         # API FastAPI
│   ├── main.py                      # Endpoints REST
│   ├── docker_manager.py            # Gestión de contenedores Docker
│   ├── nginx_manager.py             # Escritura de configuración NGINX
│   └── templates/
│       ├── python/
│       │   ├── Dockerfile
│       │   └── runner.py            # Servidor que ejecuta el código Python
│       └── javascript/
│           ├── Dockerfile
│           └── runner.js            # Servidor que ejecuta el código JavaScript
│
├── nginx/
│   ├── nginx.conf
│   ├── reload_watch.sh
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## Tecnologías utilizadas

| Capa | Tecnología | Rol |
|---|---|---|
| Frontend | React 18 | Interfaz de usuario |
| Frontend | React Router | Navegación entre páginas |
| Frontend | Tailwind CSS | Estilos |
| Frontend | Fetch API | Comunicación con el backend |
| Proxy | NGINX | Reverse proxy y enrutamiento dinámico |
| Backend | FastAPI | API REST principal |
| Backend | Docker SDK (Python) | Gestión de contenedores |
| Runtime Python | FastAPI + Uvicorn | Servidor dentro del contenedor |
| Runtime JS | Express.js | Servidor dentro del contenedor |
| Runtime JS | Acorn | Parser AST para JavaScript |
| Infraestructura | Docker | Contenedores aislados por microservicio |
| Infraestructura | Docker Compose | Orquestación de servicios |

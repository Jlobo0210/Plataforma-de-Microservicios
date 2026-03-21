import os
import ast
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()
user_code = os.environ.get("USER_CODE", "")

# Ejecuta el código del usuario en el contexto global
# Así sus funciones quedan disponibles
exec(user_code, globals())

def detect_entrypoint(code: str) -> str:
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                return node.name
    except:
        pass
    return None


entrypoint = detect_entrypoint(user_code)
print(f"✅ Usando función: {entrypoint}")


async def execute(params: dict):
    try:
        if entrypoint is None or entrypoint not in globals():
            return JSONResponse(
                status_code=400,
                content={"error": "No se encontró ninguna función en el código"}
            )
        result = globals()[entrypoint](**params)
        return {"result": result}
    except TypeError as e:
        return JSONResponse(status_code=400, content={"error": f"Parámetros inválidos: {str(e)}"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/")
async def run_get(request: Request):
    params = dict(request.query_params)
    return await execute(params)


@app.post("/")
async def run_post(request: Request):
    try:
        body = await request.json()
        if not isinstance(body, dict):
            return JSONResponse(
                status_code=400,
                content={"error": "El body debe ser un objeto JSON"}
            )
    except Exception:
        body = {}

    params = dict(request.query_params)
    params.update(body)

    return await execute(params)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
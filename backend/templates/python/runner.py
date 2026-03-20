import os
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()
user_code = os.environ.get("USER_CODE", "")

# Ejecuta el código del usuario en el contexto global
# Así sus funciones quedan disponibles
exec(user_code, globals())

@app.get("/")
async def run(request: Request):
    params = dict(request.query_params)
    try:
        # Busca la función 'main' que el usuario debe definir
        if "main" not in globals():
            return JSONResponse(
                status_code=400,
                content={"Error": "Tu código debe definir una función llamada 'main'"}
            )
        result = globals()["main"](**params)
        return {"result": result}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
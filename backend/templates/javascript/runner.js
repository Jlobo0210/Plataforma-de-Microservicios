const express = require('express');
const acorn = require('acorn');
const app = express();

app.use(express.json());

// Detectar el nombre de la función
function detectEntrypoint(code) {
    try {
        const tree = acorn.parse(code, {
            ecmaVersion: 2020,  // sintaxis moderna de JS
            sourceType: 'script'
        });

        // Equivalente a: for node in ast.walk(tree): if isinstance(node, ast.FunctionDef)
        for (const node of tree.body) {
            if (node.type === 'FunctionDeclaration') {
                return node.id.name; 
            }
        }
    } catch (e) {
        console.error('Error parseando el código:', e.message);
    }
    return null;
}

// Leer el código del usuario
const userCode = process.env.USER_CODE || '';

const entrypoint = detectEntrypoint(userCode);
console.log(`✅ Usando función: ${entrypoint}`);

// Ejecuta el código del usuario
eval(userCode);
if (entrypoint && typeof eval(entrypoint) === 'function') {
    global[entrypoint] = eval(entrypoint);
}


// Función central de ejecución
async function execute(params) {
    try {
        if (!entrypoint || typeof global[entrypoint] === 'undefined') {
            return { 
                status: 400, 
                body: { error: 'No se encontró ninguna función en el código' } 
            };
        }

        // Equivalente a: globals()[entrypoint](**params)
        const result = await Promise.resolve(global[entrypoint](params));
        return { status: 200, body: { result } };

    } catch (err) {
        if (err instanceof TypeError) {
            return { status: 400, body: { error: `Parámetros inválidos: ${err.message}` } };
        }
        return { status: 500, body: { error: err.message } };
    }
}

// Endpoint GET (parámetros por URL)
app.get('/', async (req, res) => {
    const params = req.query;
    const { status, body } = await execute(params);
    res.status(status).json(body);
});

// Endpoint POST (parámetros por body)
app.post('/', async (req, res) => {
    const queryParams = req.query;
    const bodyParams = (typeof req.body === 'object' && req.body !== null) ? req.body : {};

    // Merge de query params y body, body tiene prioridad (igual que Python)
    const params = { ...queryParams, ...bodyParams };
    const { status, body } = await execute(params);
    res.status(status).json(body);
});

// Arrancar el servidor
app.listen(8080, '0.0.0.0', () => {
    console.log('Microservicio corriendo en puerto 8080');
});
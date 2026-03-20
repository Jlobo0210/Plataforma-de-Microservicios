const express = require('express');
const app = express();

app.use(express.json());

// Lee el código del usuario desde la variable de entorno
const userCode = process.env.USER_CODE || '';

// Ejecuta el código del usuario para que sus funciones queden disponibles en este scope
eval(userCode);

app.get('/', (req, res) => {
    try {
        const params = req.query;

        if (typeof main === 'undefined') {
            return res.status(400).json({
                error: "Tu código debe definir una función llamada 'main'"
            });
        }

        // Llama a la función main que el usuario definió
        Promise.resolve(main(params)).then(result => {
            res.json({ result });
        }).catch(err => {
            res.status(500).json({ error: err.message });
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(8080, '0.0.0.0', () => {
    console.log('Microservicio corriendo en puerto 8080');
});
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();

app.use(express.json())
app.use(cors())

app.get('/api/imagenes', (_, res) => {
    const carpeta = path.join(__dirname, 'Yo');
    const nombresImagenes = fs.readdirSync(carpeta);
    res.status(200).json(nombresImagenes);
});

app.listen(3000, () => console.log('Servidor escuchando en el puerto 3000'));
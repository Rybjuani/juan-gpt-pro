const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar CORS para permitir peticiones desde tu frontend
// (En producción, puedes restringir origin: 'https://rybjuani.github.io')
app.use(cors({ origin: '*' }));
app.use(express.json());

const LOG_FILE = path.join(__dirname, 'chats.log');

app.post('/api/log', (req, res) => {
    const { message } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Mensaje vacío' });
    }

    const timestamp = new Date().toISOString();
    const logEntry = `
--- Registro: ${timestamp} ---
${message}
-----------------------------------
`;

    fs.appendFile(LOG_FILE, logEntry, (err) => {
        if (err) {
            console.error('Error al guardar el log:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        res.status(200).json({ success: true, message: 'Log guardado correctamente' });
    });
});

app.listen(PORT, () => {
    console.log(`[JUAN_GPT_BACKEND] Servidor en línea en el puerto ${PORT}`);
    console.log(`[JUAN_GPT_BACKEND] Guardando registros en: ${LOG_FILE}`);
});

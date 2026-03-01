const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const telemetryRouter = require('./routes/telemetry'); // Importar el router de telemetría

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

const uri = process.env.MONGO_URI;
let db;

if (uri) {
    const client = new MongoClient(uri);
    client.connect().then(() => {
        db = client.db('juan_gpt_db');
        console.log('[+] Conectado a MongoDB Atlas');
        app.use('/api/telemetry', telemetryRouter(db)); // Registrar el router de telemetría aquí
    }).catch(err => console.error('[CRITICAL] Error conectando a MongoDB Atlas:', err));
} else {
    console.warn('[WARNING] MONGO_URI no definida. Los logs no se guardarán permanentemente.');
}

// Endpoint de salud (Healthcheck) para el Cron-job (Mantener vivo) - CORREGIDO
app.get('/api/health', (req, res) => {
    res.sendStatus(200); // Respuesta mínima y estándar
});

const express = require('express');
const router = express.Router();

let dbConnection; // La conexión a la DB se pasará desde server.js

// Middleware para asegurarse de que la conexión a la DB está disponible
router.use((req, res, next) => {
    if (!dbConnection) {
        console.error('[TELEMETRY] Conexión a MongoDB no disponible.');
        return res.status(503).json({ error: 'Servicio de base de datos no disponible' });
    }
    next();
});

router.post('/', async (req, res) => {
    const telemetryData = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const logDocument = {
        timestamp: new Date(),
        ip: ip,
        ...telemetryData
    };

    try {
        const result = await dbConnection.collection('user_metrics').insertOne(logDocument);
        console.log(`[TELEMETRY] Datos guardados en MongoDB: ${result.insertedId}`);
        res.status(200).json({ status: 'OK', message: 'Telemetry received' });
    } catch (error) {
        console.error('[TELEMETRY] Error al guardar telemetría en MongoDB:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = (db) => {
    dbConnection = db;
    return router;
};
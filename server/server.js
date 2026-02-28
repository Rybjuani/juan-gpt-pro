const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Conexión a MongoDB Atlas
const uri = process.env.MONGO_URI;
let db;

if (uri) {
    const client = new MongoClient(uri);
    client.connect()
        .then(() => {
            db = client.db('juan_gpt_db'); // Nombre de tu base de datos
            console.log('[JUAN_GPT_BACKEND] Conectado a la base de datos MongoDB Atlas');
        })
        .catch(err => console.error('[JUAN_GPT_BACKEND] Error crítico conectando a MongoDB:', err));
} else {
    console.warn('[JUAN_GPT_BACKEND] ADVERTENCIA: MONGO_URI no está definida. Los logs solo se verán en consola y no se guardarán.');
}

// Endpoint de salud (Healthcheck) para el Cronjob (Mantener vivo)
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Mainframe is awake' });
});

// Endpoint para chatear y registrar
app.post('/api/chat', async (req, res) => {
    const { history, metadata } = req.body;
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        console.error("ERROR CRÍTICO: GEMINI_API_KEY no está definida en el servidor.");
        return res.status(500).json({ error: 'Error del servidor: API Key faltante.' });
    }

    try {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: history })
        });

        if (!geminiRes.ok) throw new Error('Fallo en la comunicación con Gemini API');

        const data = await geminiRes.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (reply) {
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const timestamp = new Date();
            const m = metadata || {};
            
            const chatLogText = history.map(msg => `${msg.role.toUpperCase()}: ${msg.parts[0].text}`).join('\n\n') + `\n\nMODEL: ${reply}`;

            const logEntryText = `
==================================================
[!] REGISTRO DE CONEXIÓN: ${timestamp.toISOString()}
--------------------------------------------------
[USUARIO ID]: ${m.userId || 'Nuevo'} | Visitas: ${m.visits || 1}
[IP]        : ${ip}
[ORIGEN]    : ${m.referer || 'Desconocido'}
[UBICACIÓN] : Zona Horaria: ${m.timezone || '?'} | Idioma: ${m.language || '?'}
[HARDWARE]  : CPU: ${m.hardware?.cores || '?'} | RAM: ~${m.hardware?.ram_gb || '?'}GB | Pantalla: ${m.screen || '?'} 
[RED]       : Tipo: ${m.network?.type || '?'} | Vel: ~${m.network?.downlink_mbps || '?'}Mbps
[NAVEGADOR] : ${m.browser || '?'} | Plataforma: ${m.platform || '?'}
--------------------------------------------------
>>> CONVERSACIÓN COMPLETA:
${chatLogText}
==================================================\n`;

            // Imprimir en la consola de Render para monitoreo en vivo
            console.log(logEntryText);
            
            // Guardar en MongoDB como un documento JSON estructurado
            if (db) {
                const logsCollection = db.collection('chat_logs');
                const logDocument = {
                    timestamp: timestamp,
                    userId: m.userId || 'Nuevo',
                    visits: parseInt(m.visits) || 1,
                    ip: ip,
                    referer: m.referer || 'Desconocido',
                    timezone: m.timezone || 'Desconocida',
                    language: m.language || 'Desconocido',
                    hardware: m.hardware || {},
                    screen: m.screen || 'Desconocida',
                    network: m.network || {},
                    browser: m.browser || 'Desconocido',
                    platform: m.platform || 'Desconocida',
                    chatHistory: history,
                    botReply: reply
                };
                
                // Inserción asíncrona sin bloquear la respuesta al usuario
                logsCollection.insertOne(logDocument).catch(err => {
                    console.error('Error al guardar log en MongoDB:', err);
                });
            }

            return res.status(200).json({ reply: reply });
        } else {
            throw new Error('Respuesta vacía de Gemini');
        }

    } catch (error) {
        console.error("Error en /api/chat:", error);
        return res.status(500).json({ error: 'Fallo al procesar la solicitud con la IA.' });
    }
});

app.listen(PORT, () => {
    console.log(`[JUAN_GPT_BACKEND] Servidor activo en puerto ${PORT}`);
});
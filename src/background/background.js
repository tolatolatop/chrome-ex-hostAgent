let socket = null;
let reconnectTimer = null;  // 添加重连定时器标志

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'COOKIES_UPDATED') {
        console.log(`[MCP] 🍪 Cookies updated for host: ${message.host}`);
        console.log(`[MCP] 📦 Cookies content: ${message.cookies}`);
        return true;
    }
});

function connectWebSocket() {
    const WS_URL = "ws://localhost:8000/ws/1/client"; // 替换为你的后端地址
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        console.log("[MCP] ✅ WebSocket connected");
        // 连接成功后清除重连定时器
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("[MCP] 📩 Received:", message);
        if (message.type !== "ping") {
            socket.send(JSON.stringify(message));
        }
    };

    socket.onclose = () => {
        console.warn("[MCP] 🔌 Connection closed. Reconnecting in 3s...");
        // 确保只有一个重连任务
        if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;  // 清除定时器引用
                connectWebSocket();     // 重新连接
            }, 3000);
        }
    };

    socket.onerror = (err) => {
        console.error("[MCP] ❌ WebSocket error", err);
        console.warn("[MCP] 🔌 Connection failed. Reconnecting in 10s...");
        // 确保只有一个重连任务
        if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;  // 清除定时器引用
                connectWebSocket();     // 重新连接
            }, 10000);
        }
    };
}

// 定时 ping 防止被 Chrome 挂起
chrome.alarms.create("mcp_keep_alive", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "mcp_keep_alive") {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping" }));
            console.log("[MCP] 🔁 Ping sent to keep alive");
        }
    }
});

// 初始化连接
connectWebSocket();

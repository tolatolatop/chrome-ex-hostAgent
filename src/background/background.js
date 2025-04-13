let socket = null;

function connectWebSocket() {
    const WS_URL = "wss://your-mcp-server.example.com/ws"; // 替换为你的后端地址
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        console.log("[MCP] ✅ WebSocket connected");
        socket.send(JSON.stringify({ type: "init", source: "chrome-extension" }));
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("[MCP] 📩 Received:", message);

        // 可选：广播到所有 tabs（或处理指令）
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
                chrome.tabs.sendMessage(tab.id, message);
            });
        });
    };

    socket.onclose = () => {
        console.warn("[MCP] 🔌 Connection closed. Reconnecting in 3s...");
        setTimeout(connectWebSocket, 3000);
    };

    socket.onerror = (err) => {
        console.error("[MCP] ❌ WebSocket error", err);
        socket.close();
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

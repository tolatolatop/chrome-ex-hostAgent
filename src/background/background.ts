// 类型定义
interface MCPMessage {
    type: string;
    data?: {
        type: string;
        name: string;
        [key: string]: any;
    };
    [key: string]: any;
}

interface CommandHandler {
    (message: MCPMessage, socket: WebSocket): void;
}

interface CommandHandlers {
    [type: string]: {
        [name: string]: CommandHandler;
    };
}

interface Cookie {
    name: string;
    value: string;
    domain: string;
    path: string;
    secure: boolean;
    httpOnly: boolean;
    expirationDate?: number;
    storeId: string;
}

interface Tab {
    id?: number;
    url?: string;
    title?: string;
    active: boolean;
    pinned: boolean;
    highlighted: boolean;
    windowId: number;
    index: number;
    [key: string]: any;
}

// 全局变量
let socket: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

// 命令处理器注册表
const commandHandlers: CommandHandlers = {
    fetch: {
        visitBaidu: (message: MCPMessage, socket: WebSocket): void => {
            console.log('[Background] run visitBaidu');
            visitBaidu((response: Response) => {
                response.text().then((text: string) => {
                    socket.send(JSON.stringify({ ...message, data: { text } }));
                });
            });
        }
    }
};

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((
    message: { type: string; host?: string; cookies?: string },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: { status: string }) => void
): boolean => {
    console.log('[Background] 收到消息:', message);
    if (message.type === 'COOKIES_UPDATED') {
        console.log(`[Background] 🍪 Cookies updated for host: ${message.host}`);
        console.log(`[Background] 📦 Cookies content: ${message.cookies}`);
        // 发送响应给 content script
        sendResponse({ status: 'success' });
        return true;
    }
    return true;
});

// 请求所有标签页更新 cookies
function requestCookiesUpdate(): void {
    chrome.tabs.query({}, (tabs: Tab[]) => {
        tabs.forEach((tab: Tab) => {
            if (tab.url && tab.url.includes('baidu.com') && tab.id) {
                chrome.tabs.sendMessage(tab.id, { type: 'REQUEST_COOKIES' }, (response: any) => {
                    console.log(`[Background] 请求 ${tab.url} 更新 cookies 的响应:`, response);
                });
            }
        });
    });
}

// 访问baidu.com
async function visitBaidu(callback: (response: Response) => void): Promise<void> {
    try {
        // 使用请求直接访问
        const cookies: Cookie[] = await chrome.cookies.getAll({ domain: '.baidu.com' });
        const cookieString: string = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

        const response: Response = await fetch('https://www.baidu.com', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieString
            }
        });

        callback(response);
    } catch (error) {
        console.error('[Background] 访问百度时出错:', error);
    }
}

// 处理接收到的消息
function handleMessage(message: MCPMessage, socket: WebSocket): void {
    console.log("[MCP] 📩 Received:", message);

    if (message.type === "ping") {
        return;
    }

    if (message.data !== undefined) {
        const { type, name } = message.data;
        if (type && name && commandHandlers[type] && commandHandlers[type][name]) {
            console.log(`[Background] 执行命令: ${type}.${name}`);
            commandHandlers[type][name](message, socket);
        } else {
            console.log(`[Background] 未知命令: ${type}.${name}`);
            socket.send(JSON.stringify({
                ...message,
                data: {
                    text: `Unsupported command: ${type}.${name}`
                }
            }));
        }
        return;
    }

    socket.send(JSON.stringify(message));
}

function connectWebSocket(): void {
    const WS_URL = "ws://localhost:8000/ws/1/client"; // 替换为你的后端地址
    socket = new WebSocket(WS_URL);

    socket.onopen = (): void => {
        console.log("[MCP] ✅ WebSocket connected");
    };

    socket.onmessage = (event: MessageEvent): void => {
        try {
            const message: MCPMessage = JSON.parse(event.data);
            handleMessage(message, socket!);
        } catch (error) {
            console.error("[MCP] ❌ Failed to parse message:", error);
        }
    };

    socket.onclose = (): void => {
        console.warn("[MCP] 🔌 Connection closed. Reconnecting in 3s...");
        if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;  // 清除定时器引用
                connectWebSocket();     // 重新连接
            }, 3000);
        }
    };

    socket.onerror = (err: Event): void => {
        console.error("[MCP] ❌ WebSocket error", err);
        console.warn("[MCP] 🔌 Connection failed. Reconnecting in 10s...");
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
chrome.alarms.onAlarm.addListener((alarm: chrome.alarms.Alarm) => {
    if (alarm.name === "mcp_keep_alive") {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping" }));
            console.log("[MCP] 🔁 Ping sent to keep alive");
        }
    }
});

// 初始化连接
connectWebSocket(); 
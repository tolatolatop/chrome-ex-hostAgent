// 类型定义
interface MCPMessage {
    type: string;
    data?: {
        type: string;
        name: string;
        url?: string;
        uploadUrl?: string;
        filename?: string;
        domain?: string;
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
        },
        downloadAndUpload: (message: MCPMessage, socket: WebSocket): void => {
            console.log('[Background] run downloadAndUpload');
            const { url, uploadUrl, filename } = message.data || {};

            if (!url || !uploadUrl) {
                socket.send(JSON.stringify({
                    ...message,
                    data: { error: '缺少必要的参数: url 或 uploadUrl' }
                }));
                return;
            }

            downloadAndUploadFile(url, uploadUrl, filename, message, socket);
        }
    },
    cookies: {
        sendCookies: (message: MCPMessage, socket: WebSocket): void => {
            console.log('[Background] run sendCookies');
            const { domain } = message.data || {};

            if (!domain) {
                socket.send(JSON.stringify({
                    ...message,
                    data: { error: '缺少必要的参数: domain' }
                }));
                return;
            }

            sendDomainCookies(domain, message, socket);
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

// 下载并上传文件
async function downloadAndUploadFile(
    downloadUrl: string,
    uploadUrl: string,
    filename: string | undefined,
    message: MCPMessage,
    socket: WebSocket
): Promise<void> {
    try {
        console.log(`[Background] 开始下载文件: ${downloadUrl}`);

        // 发送进度更新
        socket.send(JSON.stringify({
            ...message,
            data: { status: 'downloading', progress: 0 }
        }));

        // 下载文件
        const response = await fetch(downloadUrl);

        if (!response.ok) {
            throw new Error(`下载失败: ${response.status} ${response.statusText}`);
        }

        // 获取文件名（如果未提供）
        const finalFilename = filename || getFilenameFromUrl(downloadUrl) || 'downloaded_file';

        // 使用流式处理大文件
        if (response.body) {
            // 创建可读流
            const reader = response.body.getReader();
            const chunks: Uint8Array[] = [];
            let totalBytes = 0;

            // 读取数据流
            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                chunks.push(value);
                totalBytes += value.length;

                // 发送进度更新（每1MB更新一次）
                if (totalBytes % (1024 * 1024) === 0) {
                    const contentLength = response.headers.get('content-length');
                    const totalSize = contentLength ? parseInt(contentLength, 10) : totalBytes;
                    const progress = Math.round((totalBytes / totalSize) * 100);
                    socket.send(JSON.stringify({
                        ...message,
                        data: { status: 'downloading', progress, bytesDownloaded: totalBytes }
                    }));
                }
            }

            // 合并所有数据块
            const fileData = new Uint8Array(totalBytes);
            let offset = 0;
            for (const chunk of chunks) {
                fileData.set(chunk, offset);
                offset += chunk.length;
            }

            console.log(`[Background] 文件下载完成，大小: ${totalBytes} 字节`);

            // 发送下载完成状态
            socket.send(JSON.stringify({
                ...message,
                data: { status: 'download_complete', filename: finalFilename, size: totalBytes }
            }));

            // 上传文件
            await uploadFile(fileData, uploadUrl, finalFilename, message, socket);

        } else {
            // 备用方案：直接使用 blob
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const fileData = new Uint8Array(arrayBuffer);

            console.log(`[Background] 文件下载完成，大小: ${fileData.length} 字节`);

            // 发送下载完成状态
            socket.send(JSON.stringify({
                ...message,
                data: { status: 'download_complete', filename: finalFilename, size: fileData.length }
            }));

            // 上传文件
            await uploadFile(fileData, uploadUrl, finalFilename, message, socket);
        }

    } catch (error) {
        console.error('[Background] 下载上传过程中出错:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        socket.send(JSON.stringify({
            ...message,
            data: { error: `操作失败: ${errorMessage}` }
        }));
    }
}

// 上传文件到指定站点
async function uploadFile(
    fileData: Uint8Array,
    uploadUrl: string,
    filename: string,
    message: MCPMessage,
    socket: WebSocket
): Promise<void> {
    try {
        console.log(`[Background] 开始上传文件到: ${uploadUrl}`);

        // 发送上传开始状态
        socket.send(JSON.stringify({
            ...message,
            data: { status: 'uploading', progress: 0 }
        }));

        // 创建 FormData
        const formData = new FormData();
        const blob = new Blob([fileData]);
        formData.append('file', blob, filename);

        // 上传文件
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            body: formData
        });

        if (!uploadResponse.ok) {
            throw new Error(`上传失败: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }

        const uploadResult = await uploadResponse.json();

        console.log('[Background] 文件上传成功');

        // 发送上传完成状态
        socket.send(JSON.stringify({
            ...message,
            data: {
                status: 'complete',
                filename,
                uploadResult,
                message: '文件下载并上传成功'
            }
        }));

    } catch (error) {
        console.error('[Background] 上传文件时出错:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        socket.send(JSON.stringify({
            ...message,
            data: { error: `上传失败: ${errorMessage}` }
        }));
    }
}

// 从URL中提取文件名
function getFilenameFromUrl(url: string): string | null {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const filename = pathname.split('/').pop();
        return filename && filename.includes('.') ? filename : null;
    } catch {
        return null;
    }
}

// 发送指定域名的cookies
async function sendDomainCookies(domain: string, message: MCPMessage, socket: WebSocket): Promise<void> {
    try {
        console.log(`[Background] 获取域名 ${domain} 的cookies`);

        // 发送开始状态
        socket.send(JSON.stringify({
            ...message,
            data: { status: 'fetching', domain }
        }));

        // 获取指定域名的所有cookies
        const cookies: Cookie[] = await chrome.cookies.getAll({ domain });

        console.log(`[Background] 找到 ${cookies.length} 个cookies for ${domain}`);

        // 格式化cookies数据
        const cookiesData = cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            expirationDate: cookie.expirationDate,
            storeId: cookie.storeId
        }));

        // 生成cookie字符串（用于HTTP请求）
        const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

        // 发送cookies数据
        socket.send(JSON.stringify({
            ...message,
            data: {
                status: 'success',
                domain,
                count: cookies.length,
                cookies: cookiesData,
                cookieString,
                message: `成功获取 ${cookies.length} 个cookies`
            }
        }));

    } catch (error) {
        console.error(`[Background] 获取域名 ${domain} 的cookies时出错:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        socket.send(JSON.stringify({
            ...message,
            data: {
                error: `获取cookies失败: ${errorMessage}`,
                domain
            }
        }));
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
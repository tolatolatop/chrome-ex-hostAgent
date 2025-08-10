// 消息类型枚举
enum MessageType {
    PING = "ping",
    PONG = "pong",
    COMMAND = "command",
    DATA = "data",
    CLIENT_ID = "client_id"
}

// 基础消息接口
interface BaseMessage {
    type: MessageType;
    timestamp: string;
    client_id?: string;
}

// 客户端ID消息
interface ClientIdMessage extends BaseMessage {
    type: MessageType.CLIENT_ID;
    client_id: string;
}

// Ping/Pong消息
interface PingPongMessage extends BaseMessage {
    type: MessageType.PING | MessageType.PONG;
    client_id?: string;
}

// 命令消息
interface CommandMessage extends BaseMessage {
    type: MessageType.COMMAND;
    client_id: string;
    receiver: string;
    command: string;
    data?: Record<string, any>;
    request_id?: string;
}

// 命令结果消息
interface CommandResultMessage extends BaseMessage {
    type: MessageType.COMMAND;
    client_id: string;
    receiver: string;
    request_id: string;
    success: boolean;
    result?: Record<string, any>;
    error?: string;
}

// 数据消息
interface DataMessage extends BaseMessage {
    type: MessageType.DATA;
    client_id: string;
    receiver: string;
    data: string;
    chunk_index: number;
    total_chunks: number;
    is_final: boolean;
}

// 联合类型
type WebSocketMessage = ClientIdMessage | PingPongMessage | CommandMessage | CommandResultMessage | DataMessage;

// 命令处理器类型
interface CommandHandler {
    (message: CommandMessage, socket: WebSocket): void;
}

interface CommandHandlers {
    [command: string]: CommandHandler;
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
let wsUrl: string = "ws://localhost:8000/ws/1/client"; // 默认URL
let clientId: string = "chrome-extension-" + Math.random().toString(36).substr(2, 9);
let isClientIdAssigned: boolean = false;

// 发送命令结果
function sendCommandResult(
    socket: WebSocket,
    originalMessage: CommandMessage,
    success: boolean,
    result?: Record<string, any>,
    error?: string
): void {
    const response: CommandResultMessage = {
        type: MessageType.COMMAND,
        client_id: clientId,
        receiver: originalMessage.client_id,
        request_id: originalMessage.request_id || "",
        success,
        result,
        error,
        timestamp: new Date().toISOString()
    };
    socket.send(JSON.stringify(response));
}

// 显示Chrome通知
function showNotification(title: string, message: string, type: 'success' | 'error' = 'success'): void {
    try {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: './images/notice.png',
            title: title,
            message: message,
            priority: type === 'error' ? 2 : 1
        });
    } catch (error) {
        console.log('[Background] 显示通知失败:', error);
    }
}

// 通知config页面连接状态变化
function notifyConfigConnectionStatus(connected: boolean): void {
    try {
        // 查找config页面并发送状态更新消息
        chrome.tabs.query({ url: chrome.runtime.getURL('src/config/config.html') }, (tabs) => {
            tabs.forEach((tab) => {
                if (tab.id) {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'WS_CONNECTION_STATUS',
                        connected: connected
                    }).catch((error) => {
                        // 忽略错误，因为config页面可能没有打开
                        console.log('[Background] Config页面未打开或无法接收消息');
                    });
                }
            });
        });

        // 显示Chrome通知
        console.log('[Background] 显示Chrome通知');
        if (connected) {
            showNotification('WebSocket 连接成功', '已成功连接到服务器', 'success');
        } else {
            showNotification('WebSocket 连接断开', '与服务器的连接已断开，正在尝试重连...', 'error');
        }
    } catch (error) {
        console.log('[Background] 通知config页面失败:', error);
    }
}

// 加载WebSocket配置
async function loadWSConfig(): Promise<void> {
    try {
        const result = await chrome.storage.local.get(['wsUrl']);
        if (result.wsUrl) {
            wsUrl = result.wsUrl;
            console.log(`[Background] 加载WebSocket配置: ${wsUrl}`);
        }
    } catch (error) {
        console.error('[Background] 加载WebSocket配置失败:', error);
    }
}

// 命令处理器注册表
const commandHandlers: CommandHandlers = {
    visitBaidu: (message: CommandMessage, socket: WebSocket): void => {
        console.log('[Background] run visitBaidu');
        visitBaidu((response: Response) => {
            response.text().then((text: string) => {
                sendCommandResult(socket, message, true, { text });
            });
        });
    },
    commonFetch: (message: CommandMessage, socket: WebSocket): void => {
        console.log('[Background] run commonFetch');
        try {
            const { url, method, headers, body } = message.data || {};

            // 检查必要字段是否存在
            if (!url) {
                const errorMsg = '缺少必要参数: url';
                console.error(`[Background] commonFetch错误: ${errorMsg}`);
                console.error('[Background] message.data内容:', message.data);
                sendCommandResult(socket, message, false, undefined, errorMsg);
                return;
            }

            if (!method) {
                const errorMsg = '缺少必要参数: method';
                console.error(`[Background] commonFetch错误: ${errorMsg}`);
                console.error('[Background] message.data内容:', message.data);
                sendCommandResult(socket, message, false, undefined, errorMsg);
                return;
            }

            commonFetch(url, method, headers || {}, body).then((response: Response) => {
                response.text().then((text: string) => {
                    sendCommandResult(socket, message, true, { text });
                });
            }).catch((error: Error) => {
                console.error('[Background] commonFetch执行失败:', error);
                sendCommandResult(socket, message, false, undefined, `commonFetch失败: ${error.message}`);
            });
        } catch (error) {
            console.error('[Background] commonFetch参数解析失败:', error);
            console.error('[Background] message.data内容:', message.data);
            sendCommandResult(socket, message, false, undefined, `commonFetch失败: ${error instanceof Error ? error.message : String(error) || '未知错误'}`);
        }
    },
    downloadAndUpload: (message: CommandMessage, socket: WebSocket): void => {
        console.log('[Background] run downloadAndUpload');
        const { url, uploadUrl, filename } = message.data || {};

        if (!url || !uploadUrl) {
            sendCommandResult(socket, message, false, undefined, '缺少必要的参数: url 或 uploadUrl');
            return;
        }

        downloadAndUploadFile(url, uploadUrl, filename, message, socket);
    },
    sendCookies: (message: CommandMessage, socket: WebSocket): void => {
        console.log('[Background] run sendCookies');
        const { domain } = message.data || {};

        if (!domain) {
            sendCommandResult(socket, message, false, undefined, '缺少必要的参数: domain');
            return;
        }

        sendDomainCookies(domain, message, socket);
    },
    notify: (message: CommandMessage, socket: WebSocket): void => {
        console.log('[Background] run notify');
        try {
            const { title, message: notificationMessage, type } = message.data || {};

            // 从data字段获取必要参数，如果不存在则默认为"未知"
            const notificationTitle = title || '未知';
            const notificationText = notificationMessage || '未知';
            const notificationType = type || 'success';

            console.log(`[Background] 发送通知: ${notificationTitle} - ${notificationText} (类型: ${notificationType})`);

            // 调用showNotification函数显示Chrome通知
            showNotification(notificationTitle, notificationText, notificationType as 'success' | 'error');

            // 发送成功响应
            sendCommandResult(socket, message, true, {
                title: notificationTitle,
                message: notificationText,
                type: notificationType
            });
        } catch (error) {
            console.error('[Background] notify命令执行失败:', error);
            sendCommandResult(socket, message, false, undefined, `notify失败: ${error instanceof Error ? error.message : String(error) || '未知错误'}`);
        }
    }
};

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((
    message: { type: string; host?: string; cookies?: string; wsUrl?: string },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: { status: string; connected?: boolean }) => void
): boolean => {
    console.log('[Background] 收到消息:', message);

    if (message.type === 'COOKIES_UPDATED') {
        console.log(`[Background] 🍪 Cookies updated for host: ${message.host}`);
        console.log(`[Background] 📦 Cookies content: ${message.cookies}`);
        // 发送响应给 content script
        sendResponse({ status: 'success' });
        return true;
    }

    if (message.type === 'UPDATE_WS_CONFIG') {
        console.log(`[Background] 更新WebSocket配置: ${message.wsUrl}`);
        wsUrl = message.wsUrl || wsUrl;
        // 保存到存储
        chrome.storage.local.set({ wsUrl });
        // 重新连接
        if (socket) {
            socket.close();
        }
        connectWebSocket();
        sendResponse({ status: 'success' });
        return true;
    }

    if (message.type === 'CHECK_WS_STATUS') {
        const connected = !!(socket && socket.readyState === WebSocket.OPEN);
        console.log(`[Background] 检查WebSocket状态: ${connected ? '已连接' : '未连接'}`);
        sendResponse({ status: 'success', connected });
        return true;
    }

    return true;
});

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

async function commonFetch(url: string, method: string, headers: Record<string, string>, body: any): Promise<Response> {
    try {
        // 验证URL格式
        if (!url || typeof url !== 'string') {
            throw new Error('无效的URL格式');
        }

        let domain: string;
        try {
            domain = new URL(url).hostname;
        } catch (urlError) {
            console.error('[Background] URL解析失败:', url, urlError);
            throw new Error(`无效的URL格式: ${url}`);
        }

        if (!domain) {
            throw new Error('无法从URL中提取域名');
        }

        const topDomain = domain.split('.').slice(-2).join('.');
        const cookies: Cookie[] = await chrome.cookies.getAll({ domain: topDomain });
        const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

        const apiHeaders = {
            'Content-Type': 'application/json',
            'Cookie': cookieString
        };

        const newHeaders = {
            ...headers,
            ...apiHeaders
        };

        const response = await fetch(url, {
            method,
            headers: newHeaders,
            body
        });

        return response;
    } catch (error) {
        console.error('[Background] commonFetch执行出错:', error);
        throw error;
    }
}

// 下载并上传文件
async function downloadAndUploadFile(
    downloadUrl: string,
    uploadUrl: string,
    filename: string | undefined,
    message: CommandMessage,
    socket: WebSocket
): Promise<void> {
    try {
        console.log(`[Background] 开始下载文件: ${downloadUrl}`);

        // 发送进度更新
        sendCommandResult(socket, message, true, { status: 'downloading', progress: 0 });

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
                    sendCommandResult(socket, message, true, { status: 'downloading', progress, bytesDownloaded: totalBytes });
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
            sendCommandResult(socket, message, true, { status: 'download_complete', filename: finalFilename, size: totalBytes });

            // 上传文件
            await uploadFile(fileData, uploadUrl, finalFilename, message, socket);

        } else {
            // 备用方案：直接使用 blob
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const fileData = new Uint8Array(arrayBuffer);

            console.log(`[Background] 文件下载完成，大小: ${fileData.length} 字节`);

            // 发送下载完成状态
            sendCommandResult(socket, message, true, { status: 'download_complete', filename: finalFilename, size: fileData.length });

            // 上传文件
            await uploadFile(fileData, uploadUrl, finalFilename, message, socket);
        }

    } catch (error) {
        console.error('[Background] 下载上传过程中出错:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        sendCommandResult(socket, message, false, undefined, `操作失败: ${errorMessage}`);
    }
}

// 上传文件到指定站点
async function uploadFile(
    fileData: Uint8Array,
    uploadUrl: string,
    filename: string,
    message: CommandMessage,
    socket: WebSocket
): Promise<void> {
    try {
        console.log(`[Background] 开始上传文件到: ${uploadUrl}`);

        // 发送上传开始状态
        sendCommandResult(socket, message, true, { status: 'uploading', progress: 0 });

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
        sendCommandResult(socket, message, true, {
            status: 'complete',
            filename,
            uploadResult,
            message: '文件下载并上传成功'
        });

    } catch (error) {
        console.error('[Background] 上传文件时出错:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        sendCommandResult(socket, message, false, undefined, `上传失败: ${errorMessage}`);
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
async function sendDomainCookies(domain: string, message: CommandMessage, socket: WebSocket): Promise<void> {
    try {
        console.log(`[Background] 获取域名 ${domain} 的cookies`);

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
        sendCommandResult(socket, message, true, {
            status: 'success',
            domain,
            count: cookies.length,
            cookies: cookiesData,
            cookieString,
            message: `成功获取 ${cookies.length} 个cookies`
        });

    } catch (error) {
        console.error(`[Background] 获取域名 ${domain} 的cookies时出错:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        sendCommandResult(socket, message, false, undefined, `获取cookies失败: ${errorMessage}`);
    }
}

// 处理接收到的消息
function handleMessage(message: WebSocketMessage, socket: WebSocket): void {

    if (message.type === MessageType.CLIENT_ID) {
        const clientIdMessage = message as ClientIdMessage;
        clientId = clientIdMessage.client_id;
        isClientIdAssigned = true;
        console.log(`[Background] 客户端ID已分配: ${clientId}`);
        return;
    }

    if (message.type === MessageType.PING) {
        socket.send(JSON.stringify({
            type: MessageType.PONG,
            timestamp: new Date().toISOString(),
            client_id: clientId
        }));
        return;
    }

    if (message.type === MessageType.COMMAND) {
        const commandMessage = message as CommandMessage;
        const { command, data } = commandMessage;

        if (command && commandHandlers[command]) {
            console.log(`[Background] 执行命令: ${command} request_id: ${commandMessage.request_id}`);
            commandHandlers[command](commandMessage, socket);
        } else {
            console.log(`[Background] 未知命令: ${command} request_id: ${commandMessage.request_id}`);
            sendCommandResult(socket, commandMessage, false, undefined, `Unsupported command: ${command}`);
        }
        return;
    }

    if (message.type === MessageType.DATA) {
        const dataMessage = message as DataMessage;
        // 处理数据消息，例如累积数据或转发
        console.log(`[Background] 接收数据消息 (chunk_index: ${dataMessage.chunk_index})`);
        // 示例：如果需要累积数据，可以在这里处理
    }

    // 打印未知消息类型
    console.log(`[Background] 未知消息类型: ${message.type}`);
}

function connectWebSocket(): void {
    socket = new WebSocket(wsUrl);

    socket.onopen = (): void => {
        console.log("[MCP] ✅ WebSocket connected");
        // 连接建立后，如果没有分配客户端ID，可以发送请求获取
        if (!isClientIdAssigned) {
            console.log("[MCP] 等待服务器分配客户端ID...");
        }

        // 通知config页面连接状态已更新
        notifyConfigConnectionStatus(true);
    };

    socket.onmessage = (event: MessageEvent): void => {
        try {
            const message: WebSocketMessage = JSON.parse(event.data);
            handleMessage(message, socket!);
        } catch (error) {
            console.error("[MCP] ❌ Failed to parse message:", error);
        }
    };

    socket.onclose = (): void => {
        console.warn("[MCP] 🔌 Connection closed. Reconnecting in 3s...");
        // 通知config页面连接已断开
        notifyConfigConnectionStatus(false);

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
        // 通知config页面连接失败
        notifyConfigConnectionStatus(false);

        if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;  // 清除定时器引用
                connectWebSocket();     // 重新连接
            }, 10000);
        }
    };
}

// 初始化连接
loadWSConfig().then(() => {
    connectWebSocket();
}).catch((error) => {
    console.error('[Background] 加载WebSocket配置失败:', error);
});

// 初始化side-panel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
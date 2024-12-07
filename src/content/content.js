console.log('百度网站的 content script 已加载');

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("接收消息", message);

    if (message.type === 'SHOW_CONFIRM') {
        const result = "yes";

        // 发送结果回 popup
        chrome.runtime.sendMessage({
            type: 'CONFIRM_RESULT',
            data: result
        });

        // 发送响应
        sendResponse({ received: true });
    }

    if (message.type === 'GET_DATA') {
        // 从消息中获取请求参数
        const { url, headers = {}, method = 'GET', body } = message.data || {};

        if (!url) {
            sendResponse({
                success: false,
                error: '缺少必要的URL参数'
            });
            return true;
        }

        // 执行fetch请求
        fetchData(url, headers, method, body)
            .then(result => {
                console.log('获取到的数据:', result);
                sendResponse({ success: true, data: result });
            })
            .catch(error => {
                console.error('获取数据失败:', error);
                sendResponse({ success: false, error: error.message });
            });

        // 返回 true 表示会异步发送响应
        return true;
    }

    // 返回 true 表示会异步发送响应
    return true;
});

// 添加body参数的fetch函数
async function fetchData(url, headers = {}, method = 'GET', body = null) {
    try {
        // 合并默认headers和传入的headers
        const defaultHeaders = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'User-Agent': navigator.userAgent,
        };

        // 构建请求配置
        const fetchConfig = {
            method,
            credentials: 'include',
            headers: { ...defaultHeaders, ...headers },
            referrerPolicy: 'strict-origin-when-cross-origin',
            mode: 'cors'
        };

        // 只有非GET/HEAD请求才添加body
        if (body && !['GET', 'HEAD'].includes(method.toUpperCase())) {
            // 如果body是对象且没有指定Content-Type，默认使用JSON
            if (typeof body === 'object' && !headers['Content-Type']) {
                fetchConfig.headers['Content-Type'] = 'application/json';
                fetchConfig.body = JSON.stringify(body);
            } else {
                fetchConfig.body = body;
            }
        }

        // 如果是GET请求且有body参数，将其转换为URL查询参数
        if (body && method.toUpperCase() === 'GET') {
            const params = new URLSearchParams();
            if (typeof body === 'object') {
                Object.entries(body).forEach(([key, value]) => {
                    params.append(key, value);
                });
            }
            // 添加查询参数到URL
            url = `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;
        }

        const response = await fetch(url, fetchConfig);
        const responseText = await response.text();

        return {
            status: response.status,
            content: responseText,
            headers: Object.fromEntries(response.headers.entries()),
            url: response.url
        };

    } catch (error) {
        console.error('请求失败:', error);
        throw new Error('请求失败: ' + error.message);
    }
}

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
        // 获取贴吧数据
        fetchTiebaData()
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

// 获取贴吧数据的函数
async function fetchTiebaData() {
    try {
        // 发起请求获取贴吧页面
        const response = await fetch('https://tieba.baidu.com/', {
            method: 'GET',
            credentials: 'include', // 修改为 include 以发送 cookies
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': navigator.userAgent, // 使用当前浏览器的 User-Agent
                'X-Chrome-Extension': 'yes'
            },
            referrer: 'https://www.baidu.com/', // 添加引用来源
            referrerPolicy: 'strict-origin-when-cross-origin',
            mode: 'cors' // 允许跨域请求
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 获取页面内容
        const text = await response.text();

        // 使用正则表达式匹配数字+W的模式
        const pattern = /\d+W/g;
        const matches = text.match(pattern) || [];

        // 返回所有匹配结果
        return {
            matches: matches,
            count: matches.length,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('获取贴吧数据失败:', error);
        throw new Error('获取贴吧数据失败: ' + error.message);
    }
}

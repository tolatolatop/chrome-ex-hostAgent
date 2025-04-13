console.log('content script 已加载');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_COOKIES') {
        // 从消息中获取请求参数
        const cookies = document.cookie;
        const host = window.location.host;
        chrome.storage.local.set({ host: host, cookies: cookies });
        return true;
    }
    // 返回 true 表示会异步发送响应
    return true;
});

// 在页面加载后等待1秒，发送UPDATE_COOKIES消息
setTimeout(() => {
    chrome.runtime.sendMessage({ type: 'UPDATE_COOKIES' });
}, 1000);


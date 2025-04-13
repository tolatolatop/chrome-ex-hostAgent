console.log('content script 已加载');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_COOKIES') {
        // 从消息中获取请求参数
        const cookies = document.cookie;
        const host = window.location.host;
        // 获取当前存储的所有 host-cookies 对
        chrome.storage.local.get(['hostCookies'], (result) => {
            const hostCookies = result.hostCookies || {};
            // 更新当前 host 的 cookies
            hostCookies[host] = cookies;
            // 保存更新后的 host-cookies 对
            chrome.storage.local.set({ hostCookies }, () => {
                // 发送通知给 background
                chrome.runtime.sendMessage({
                    type: 'COOKIES_UPDATED',
                    host: host,
                    cookies: cookies
                });
            });
        });
        return true;
    }
    // 返回 true 表示会异步发送响应
    return true;
});

// 在页面加载后等待1秒，发送UPDATE_COOKIES消息
setTimeout(() => {
    chrome.runtime.sendMessage({ type: 'UPDATE_COOKIES' });
}, 1000);


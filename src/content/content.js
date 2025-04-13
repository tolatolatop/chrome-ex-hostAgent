console.log('[Content] content script 已加载');

// 更新 cookies 的函数
function updateCookies() {
    const cookies = document.cookie;
    const host = window.location.host;
    console.log('[Content] 准备更新 cookies for host:', host);
    // 获取当前存储的所有 host-cookies 对
    chrome.storage.local.get(['hostCookies'], (result) => {
        const hostCookies = result.hostCookies || {};
        // 更新当前 host 的 cookies
        hostCookies[host] = cookies;
        // 保存更新后的 host-cookies 对
        chrome.storage.local.set({ hostCookies }, () => {
            console.log('[Content] 保存成功，准备发送通知');
            // 发送通知给 background
            chrome.runtime.sendMessage({
                type: 'COOKIES_UPDATED',
                host: host,
                cookies: cookies
            });
        });
    });
}

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Content] 收到消息:', message);
    if (message.type === 'REQUEST_COOKIES') {
        updateCookies();
        sendResponse({ status: 'success' });
        return true;
    }
    return true;
});

// 页面加载后立即更新 cookies
updateCookies();

// 每30秒更新一次 cookies
setInterval(updateCookies, 30000);


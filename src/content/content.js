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
    // 返回 true 表示会异步发送响应
    return true;
});

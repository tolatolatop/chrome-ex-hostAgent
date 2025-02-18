console.log('百度网站的 content script 已加载');

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("接收消息", message);
    // 获取当前页面的url地址
    const url = window.location.href;

    if (message.type === 'GET_DATA') {
        // 从消息中获取请求参数
        cookies = document.cookie;
        console.log("cookies", cookies);
        return true;
    }
    // 返回 true 表示会异步发送响应
    return true;
});

// 在页面加载后等待2秒，发送GET_DATA消息
setTimeout(() => {
    chrome.runtime.sendMessage({ type: 'GET_DATA' });
}, 2000);

// 页面加载后，在页面上创建一个不可视的iframe,地址为http://localhost:58000, 如果页面url为http://localhost:58000，则不创建   
if (window.location.href !== 'http://localhost:58000') {
    const iframe = document.createElement('iframe');
    iframe.src = 'http://localhost:58000';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
}


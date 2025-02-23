console.log('iframe content script 已加载');

// 页面加载2秒后，发送post请求到http://localhost:58000/token, 并打印返回值
setTimeout(async () => {
    const data = await chrome.storage.local.get(['token', 'host', 'cookies']);
    fetch('/token', {
        method: 'POST',
        body: JSON.stringify({ id: data['token'], value: { host: data['host'], cookies: data['cookies'] } })
    }).then(response => response.json()).then(data => {
        console.log(data);
    });
}, 2000);

const tokenCookie = document.cookie?.split('; ').find(row => row.startsWith('token='));
if (tokenCookie) {
    const token = tokenCookie.split('=')[1];
    console.log("token", token);
    chrome.storage.local.set({ token: token });
}

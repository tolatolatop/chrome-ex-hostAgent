console.log('iframe content script 已加载');

// 页面加载2秒后，发送post请求到http://localhost:58000/token, 并打印返回值
setTimeout(() => {
    fetch('/token', {
        method: 'POST',
        body: JSON.stringify({ id: 1, value: '123456' })
    }).then(response => response.json()).then(data => {
        console.log(data);
    });
}, 2000);

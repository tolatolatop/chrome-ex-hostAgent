import React, { useState, useEffect } from 'react';

const Popup = () => {
    const [name, setName] = useState('');
    const [result, setResult] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        // 监听来自 content script 的消息
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'CONFIRM_RESULT') {
                setResult(message.data ? '用户点击了确认' : '用户点击了取消');
                setError('');
            }
        });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            // 获取当前标签页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab) {
                // 检查当前页面是否是百度域名
                if (!tab.url.includes('baidu.com')) {
                    setError('请在百度网站使用此功能');
                    return;
                }

                // 发送消息到 content script
                try {
                    await chrome.tabs.sendMessage(tab.id, {
                        type: 'SHOW_CONFIRM',
                        data: name
                    });
                } catch (err) {
                    setError('无法与页面通信，请刷新页面后重试');
                }
            }
        } catch (err) {
            setError('发生错误，请重试');
            console.error(err);
        }
    };

    return (
        <div style={{ 
            padding: '20px',
            minWidth: '300px'
        }}>
            <h1>用户确认</h1>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>
                        请输入姓名：
                    </label>
                    <input 
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #ccc'
                        }}
                    />
                </div>
                <button 
                    type="submit"
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    提交
                </button>
            </form>
            {error && (
                <div style={{ 
                    marginTop: '15px',
                    padding: '10px',
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    borderRadius: '4px'
                }}>
                    {error}
                </div>
            )}
            {result && !error && (
                <div style={{ 
                    marginTop: '15px',
                    padding: '10px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px'
                }}>
                    {result}
                </div>
            )}
        </div>
    );
};

export default Popup;
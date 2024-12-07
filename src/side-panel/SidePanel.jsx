import React, { useState, useEffect, useCallback } from 'react';

// 定义消息类型枚举
const MessageType = {
    CHAT: 'chat',
    COMMAND: 'command',
    RESPONSE: 'response',
    ERROR: 'error',
    SYSTEM: 'system',
    FETCH_RESPONSE: 'fetch_response'
};

const MessageRole = {
    USER: 'user',
    AGENT: 'agent',
    SYSTEM: 'system'
};

const CommandType = {
    HELP: 'help',
    CLEAR: 'clear',
    RENAME: 'rename',
    STATUS: 'status',
    HISTORY: 'history',
    UNKNOWN: 'unknown',
    FETCH: 'fetch'
};

const SidePanel = () => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [username, setUsername] = useState('用户');

    // 初始化WebSocket连接
    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8000/ws');

        ws.onopen = () => {
            console.log('WebSocket连接已建立');
            setConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                setMessages(prev => [...prev, {
                    ...message,
                    time: new Date(message.timestamp)
                }]);
            } catch (error) {
                console.error('解析消息失败:', error);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket连接已关闭');
            setConnected(false);
        };

        ws.onerror = (error) => {
            console.error('WebSocket错误:', error);
            setConnected(false);
        };

        setSocket(ws);

        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, []);

    // 发送消息
    const sendMessage = useCallback(() => {
        if (socket && inputMessage) {
            // 检查是否是命令
            if (inputMessage.startsWith('/')) {
                const [command, ...args] = inputMessage.slice(1).split(' ');
                const message = {
                    type: MessageType.COMMAND,
                    role: MessageRole.USER,
                    content: inputMessage,
                    sender: username,
                    timestamp: new Date().toISOString(),
                    command: CommandType[command.toUpperCase()] || CommandType.UNKNOWN,
                    data: { args }
                };
                socket.send(JSON.stringify(message));
            } else {
                // 普通聊天消息
                const message = {
                    type: MessageType.CHAT,
                    role: MessageRole.USER,
                    content: inputMessage,
                    sender: username,
                    timestamp: new Date().toISOString()
                };
                socket.send(JSON.stringify(message));
            }
            setInputMessage('');
        }
    }, [socket, inputMessage, username]);

    // 获取消息样式
    const getMessageStyle = (message) => {
        const baseStyle = {
            marginBottom: '10px',
            textAlign: message.role === MessageRole.USER ? 'right' : 'left'
        };

        const bubbleStyle = {
            padding: '8px',
            borderRadius: '4px',
            display: 'inline-block',
            maxWidth: '80%'
        };

        switch (message.type) {
            case MessageType.ERROR:
                bubbleStyle.background = '#ffebee';
                break;
            case MessageType.SYSTEM:
                bubbleStyle.background = '#f3e5f5';
                break;
            case MessageType.COMMAND:
            case MessageType.RESPONSE:
                bubbleStyle.background = '#e8f5e9';
                break;
            default:
                bubbleStyle.background = message.role === MessageRole.USER ? '#e3f2fd' : '#f5f5f5';
        }

        return { containerStyle: baseStyle, bubbleStyle };
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <h3>WebSocket通信</h3>
                <div style={{ marginBottom: '10px' }}>
                    状态: <span style={{ color: connected ? 'green' : 'red' }}>
                        {connected ? '已连接' : '未连接'}
                    </span>
                    {!connected && (
                        <button onClick={() => window.location.reload()} style={{ marginLeft: '10px' }}>
                            重新连接
                        </button>
                    )}
                </div>
            </div>

            <div style={{ 
                height: '300px', 
                overflowY: 'auto',
                border: '1px solid #ccc',
                padding: '10px',
                marginBottom: '20px'
            }}>
                {messages.map((msg, index) => {
                    const { containerStyle, bubbleStyle } = getMessageStyle(msg);
                    return (
                        <div key={index} style={containerStyle}>
                            <div style={bubbleStyle}>
                                <div style={{ fontSize: '0.8em', color: '#666', marginBottom: '4px' }}>
                                    {msg.sender} ({msg.type})
                                </div>
                                <div>{msg.content}</div>
                                {msg.data && (
                                    <pre style={{ 
                                        fontSize: '0.9em',
                                        background: '#f8f9fa',
                                        padding: '4px',
                                        borderRadius: '2px',
                                        marginTop: '4px'
                                    }}>
                                        {JSON.stringify(msg.data, null, 2)}
                                    </pre>
                                )}
                                <div style={{
                                    fontSize: '0.8em',
                                    color: '#666',
                                    marginTop: '4px'
                                }}>
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="输入消息或命令 (/help 查看帮助)..."
                    style={{ 
                        flex: 1,
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc'
                    }}
                    disabled={!connected}
                />
                <button 
                    onClick={sendMessage}
                    disabled={!connected || !inputMessage}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '4px',
                        backgroundColor: connected ? '#1976d2' : '#ccc',
                        color: 'white',
                        border: 'none',
                        cursor: connected ? 'pointer' : 'not-allowed'
                    }}
                >
                    发送
                </button>
            </div>
        </div>
    );
};

export default SidePanel; 
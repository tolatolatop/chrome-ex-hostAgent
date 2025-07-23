// 配置管理类
class WSConfigManager {
    constructor() {
        this.wsUrlInput = document.getElementById('wsUrl');
        this.testBtn = document.getElementById('testBtn');
        this.configForm = document.getElementById('configForm');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.statusMessage = document.getElementById('statusMessage');
        this.wsUrlError = document.getElementById('wsUrlError');

        this.init();
    }

    init() {
        this.loadConfig();
        this.bindEvents();
        this.checkConnectionStatus();
    }

    bindEvents() {
        // 表单提交事件
        this.configForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveConfig();
        });

        // 测试连接按钮
        this.testBtn.addEventListener('click', () => {
            this.testConnection();
        });

        // 输入验证
        this.wsUrlInput.addEventListener('input', () => {
            this.validateInput();
        });

        this.wsUrlInput.addEventListener('blur', () => {
            this.validateInput();
        });
    }

    // 加载配置
    async loadConfig() {
        try {
            const result = await chrome.storage.local.get(['wsUrl']);
            if (result.wsUrl) {
                this.wsUrlInput.value = result.wsUrl;
                this.showStatus('配置已加载', 'info');
            }
        } catch (error) {
            console.error('加载配置失败:', error);
            this.showStatus('加载配置失败', 'error');
        }
    }

    // 保存配置
    async saveConfig() {
        if (!this.validateInput()) {
            return;
        }

        const wsUrl = this.wsUrlInput.value.trim();

        try {
            await chrome.storage.local.set({ wsUrl });
            this.showStatus('配置保存成功', 'success');

            // 通知background script更新配置
            this.notifyBackgroundUpdate(wsUrl);

        } catch (error) {
            console.error('保存配置失败:', error);
            this.showStatus('保存配置失败', 'error');
        }
    }

    // 测试连接
    async testConnection() {
        if (!this.validateInput()) {
            return;
        }

        const wsUrl = this.wsUrlInput.value.trim();

        this.updateConnectionStatus('connecting', '正在测试连接...');
        this.testBtn.disabled = true;
        this.testBtn.textContent = '测试中...';

        try {
            // 创建临时WebSocket连接进行测试
            const testSocket = new WebSocket(wsUrl);

            const testPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('连接超时'));
                }, 5000);

                testSocket.onopen = () => {
                    clearTimeout(timeout);
                    testSocket.close();
                    resolve('连接成功');
                };

                testSocket.onerror = (error) => {
                    clearTimeout(timeout);
                    reject(new Error('连接失败'));
                };
            });

            await testPromise;
            this.updateConnectionStatus('connected', '连接测试成功');
            this.showStatus('WebSocket连接测试成功', 'success');

        } catch (error) {
            console.error('连接测试失败:', error);
            this.updateConnectionStatus('disconnected', '连接测试失败');
            this.showStatus(`连接测试失败: ${error.message}`, 'error');
        } finally {
            this.testBtn.disabled = false;
            this.testBtn.textContent = '测试连接';
        }
    }

    // 检查当前连接状态
    async checkConnectionStatus() {
        try {
            // 发送消息给background script检查连接状态
            const response = await chrome.runtime.sendMessage({
                type: 'CHECK_WS_STATUS'
            });

            if (response && response.connected) {
                this.updateConnectionStatus('connected', '已连接');
            } else {
                this.updateConnectionStatus('disconnected', '未连接');
            }
        } catch (error) {
            console.error('检查连接状态失败:', error);
            this.updateConnectionStatus('disconnected', '状态检查失败');
        }
    }

    // 通知background script更新配置
    async notifyBackgroundUpdate(wsUrl) {
        try {
            await chrome.runtime.sendMessage({
                type: 'UPDATE_WS_CONFIG',
                wsUrl
            });
        } catch (error) {
            console.error('通知background更新失败:', error);
        }
    }

    // 验证输入
    validateInput() {
        const wsUrl = this.wsUrlInput.value.trim();

        if (!wsUrl) {
            this.showError('请输入WebSocket URL');
            return false;
        }

        try {
            new URL(wsUrl);
        } catch (error) {
            this.showError('请输入有效的URL格式');
            return false;
        }

        if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
            this.showError('URL必须以ws://或wss://开头');
            return false;
        }

        this.clearError();
        return true;
    }

    // 显示错误信息
    showError(message) {
        this.wsUrlInput.classList.add('error');
        this.wsUrlError.textContent = message;
        this.wsUrlError.style.display = 'block';
    }

    // 清除错误信息
    clearError() {
        this.wsUrlInput.classList.remove('error');
        this.wsUrlError.style.display = 'none';
    }

    // 更新连接状态显示
    updateConnectionStatus(status, text) {
        this.statusIndicator.className = `status-indicator ${status}`;
        this.statusText.textContent = text;
    }

    // 显示状态消息
    showStatus(message, type = 'info') {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status ${type}`;
        this.statusMessage.style.display = 'block';

        // 3秒后自动隐藏
        setTimeout(() => {
            this.statusMessage.style.display = 'none';
        }, 3000);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new WSConfigManager();
}); 
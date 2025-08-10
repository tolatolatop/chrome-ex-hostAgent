console.log('[ContentAutoAuth] 自动化模块已加载');

// 检查页面是否有"Start Chat"按钮并执行填充逻辑
function checkAndFillForm() {
    console.log('[ContentAutoAuth] 开始检查页面...');

    // 查找"Start Chat"按钮
    const startChatButton = Array.from(document.querySelectorAll('button')).find(button =>
        button.textContent?.includes('Start Chat') ||
        button.innerText?.includes('Start Chat')
    );

    if (!startChatButton) {
        console.log('[ContentAutoAuth] 未找到"Start Chat"按钮');
        return;
    }

    console.log('[ContentAutoAuth] 找到"Start Chat"按钮，开始执行填充逻辑');

    // 查找包含"用户Token"文本的div
    const usernameDiv = Array.from(document.querySelectorAll('div')).find(div =>
        div.textContent?.includes('用户Token') ||
        div.innerText?.includes('用户Token')
    );

    if (!usernameDiv) {
        console.log('[ContentAutoAuth] 未找到包含"用户Token"的div');
        return;
    }

    console.log('[ContentAutoAuth] 找到包含"用户Token"的div');

    // 找到其父节点的父节点
    const grandparent = usernameDiv.parentElement?.parentElement;
    if (!grandparent) {
        console.log('[ContentAutoAuth] 无法找到父节点的父节点');
        return;
    }

    // 在父节点的父节点下查找input节点
    const inputElement = grandparent.querySelector('input');
    if (!inputElement) {
        console.log('[ContentAutoAuth] 在父节点的父节点下未找到input节点');
        return;
    }

    chrome.storage.local.get('wsUrl').then((result: { [key: string]: any }) => {
        const wsUrl = result.wsUrl;
        const username = wsUrl.split('/')[wsUrl.split('/').length - 1];
        console.log('[ContentAutoAuth] 找到input节点，开始填充"' + username + '"');

        // 填充username字段
        inputElement.value = username;

        // 触发input事件以确保页面能检测到值的变化
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));

        console.log('[ContentAutoAuth] 填充完成，已设置值为"' + username + '"');
        startChatButton.click();
        console.log('[ContentAutoAuth] 点击"Start Chat"按钮');
    });
}

// 页面加载完成后执行检查
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndFillForm);
} else {
    // 如果页面已经加载完成，直接执行
    checkAndFillForm();
}

// 监听页面变化（对于SPA应用）
let observer: MutationObserver | null = null;

function setupObserver() {
    if (observer) {
        observer.disconnect();
    }

    observer = new MutationObserver((mutations) => {
        // 当DOM发生变化时，重新检查
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // 延迟执行，确保新元素完全加载
                setTimeout(checkAndFillForm, 100);
                break;
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// 设置观察器
setupObserver();

// 清理函数
window.addEventListener('beforeunload', () => {
    if (observer) {
        observer.disconnect();
    }
});

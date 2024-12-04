console.log('百度网站的 content script 已加载');

// 示例：修改百度首页 logo
function modifyBaiduLogo() {
    const logo = document.querySelector('#lg img');
    if (logo) {
        logo.style.transform = 'rotate(180deg)';
        logo.style.transition = 'transform 1s';
    }
}

// 示例：修改搜索按钮样式
function modifySearchButton() {
    const searchBtn = document.querySelector('#su');
    if (searchBtn) {
        searchBtn.style.backgroundColor = '#ff4444';
        searchBtn.addEventListener('mouseover', () => {
            searchBtn.style.backgroundColor = '#ff6666';
        });
        searchBtn.addEventListener('mouseout', () => {
            searchBtn.style.backgroundColor = '#ff4444';
        });
    }
}

// 当 DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    modifyBaiduLogo();
    modifySearchButton();
}); 
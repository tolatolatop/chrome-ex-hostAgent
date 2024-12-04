const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// 创建 releases 目录（如果不存在）
const releasesDir = path.join(__dirname, '../releases');
if (!fs.existsSync(releasesDir)) {
    fs.mkdirSync(releasesDir);
}

// 读取 package.json 获取版本号
const packageJson = require('../package.json');
const version = packageJson.version;

// 创建输出流
const output = fs.createWriteStream(path.join(releasesDir, `chrome-extension-v${version}.zip`));
const archive = archiver('zip', {
    zlib: { level: 9 } // 设置压缩级别
});

output.on('close', () => {
    console.log(`✨ 打包完成！文件大小: ${(archive.pointer() / 1024).toFixed(2)} KB`);
});

archive.on('error', (err) => {
    throw err;
});

// 将输出流管道连接到归档
archive.pipe(output);

// 添加 dist 目录下的所有文件
archive.directory('dist/', false);

// 完成归档
archive.finalize(); 
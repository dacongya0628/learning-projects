/**
 * 将 public/favicon.svg 压缩为单行并编码为 data URI，写入 scripts/favicon-data-uri.txt。
 * 可把输出粘贴到 index.html 的 <link rel="icon" href="...">，避免外链缓存问题。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 1. 读取 SVG 源文件
const svg = readFileSync(join(__dirname, '../public/favicon.svg'), 'utf8')
  // 2. 去掉注释，合并空白，减小 URI 长度
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\s+/g, ' ')
  .trim();

// 3. 拼成浏览器可识别的 data URL
const data = 'data:image/svg+xml,' + encodeURIComponent(svg);

// 4. 落盘供复制（不自动改 index.html，避免误覆盖手工调整）
writeFileSync(join(__dirname, 'favicon-data-uri.txt'), data, 'utf8');
console.log('length', data.length);

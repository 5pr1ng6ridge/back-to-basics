// 内容在 kb.json；运行 node build.js 后刷新页面即可。
const fs = require('node:fs');
const path = require('node:path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'kb.json'), 'utf8'));
fs.writeFileSync(path.join(__dirname, 'knowledge.js'), `window.TECH_TREE = ${JSON.stringify(data, null, 2)};\n`);
console.log(`已更新 ${data.nodes.length} 个节点 / ${data.edges.length} 条关联。`);

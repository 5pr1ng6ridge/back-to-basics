// 内容在 kb.json；运行 node build.js 后刷新页面即可。
const fs = require('node:fs');
const path = require('node:path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'kb.json'), 'utf8'));
require('./validate.js').validate(data);
fs.writeFileSync(path.join(__dirname, 'knowledge.js'), `window.TECH_TREE = ${JSON.stringify(data, null, 2)};\n`);
console.log(`已更新 ${data.nodes.length} 个节点 / ${data.edges.length} 条关联。`);
const outputFlag = process.argv.indexOf('--out');
if (outputFlag !== -1) {
  const directory = process.argv[outputFlag+1];
  if (!directory || directory.startsWith('--')) throw new Error('--out requires a directory');
  const dest = path.resolve(__dirname, directory);
  if (dest === __dirname) throw new Error('Output directory must differ from the source directory');
  fs.mkdirSync(dest, { recursive: true });
  for (const file of ['index.html','app.js','style.css','kb.json','knowledge.js','vendor','.nojekyll']) {
    fs.cpSync(path.join(__dirname,file), path.join(dest,file), { recursive: true });
  }
  console.log(`静态发布目录：${dest}`);
}

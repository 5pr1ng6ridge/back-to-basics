// 初版内嵌图的数据与本地册子来自同一份内容。
const fs=require('node:fs');
const path=require('node:path');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../kb.json'),'utf8'));
const inline='C:/Users/10086/.codex/visualizations/2026/10/09/01a122f6-371f-7853-9aa3-606ce7bbf0f1/can-knowledge-tree.html';
const graph={nodes:data.nodes.map(({id,title,category,question})=>({id,title,category,question})),edges:data.edges};
fs.writeFileSync(inline,fs.readFileSync(inline,'utf8').replace('__NETWORK_DATA__',JSON.stringify(graph)));

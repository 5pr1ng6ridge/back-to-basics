const fs = require('node:fs');
const assert = require('node:assert/strict');

function validate(data) {
  const nodes = new Map(data.nodes.map(n => [n.id, n]));
  const sources = new Set(data.sources.map(s => s.id));
  const stages = new Set(data.stages.map(s => s.id));
  assert.equal(nodes.size, data.nodes.length, 'Duplicate node IDs');
  assert.equal(sources.size, data.sources.length, 'Duplicate source IDs');
  assert.equal(stages.size, data.stages.length, 'Duplicate stages');
  assert(nodes.has(data.entry), 'Missing entry');
  const categories = new Set(['object','making','materials','chemistry','physics','energy','math','life','information','cognition']);
  for (const n of nodes.values()) {
    for (const f of ['id','title','subtitle','question','mechanism','why','example','gotcha','frontier']) {
      assert(typeof n[f] === 'string' && n[f].trim(), `${n.id}: missing ${f}`);
    }
    assert(stages.has(n.stage), `${n.id}: missing stage`);
    assert(categories.has(n.category), `${n.id}: invalid discipline`);
    assert(['object','practice','theory'].includes(n.nodeType), `${n.id}: invalid type`);
    for (const f of ['observe','try','infer','check','unlocks']) {
      assert(typeof n.learning?.[f] === 'string' && n.learning[f].trim(), `${n.id}: missing discovery step ${f}`);
    }
    if (n.nodeType === 'practice') {
      for (const f of ['line','input','operation','output']) assert(n.practice?.[f]?.trim(), `${n.id}: missing process ${f}`);
    }
    assert(Array.isArray(n.equations), `${n.id}: missing equations array`);
    for (const e of n.equations) for (const f of ['formula','terms','scope']) assert(e[f]?.trim(), `${n.id}: missing equation ${f}`);
    assert(n.sourceIds.length > 0, `${n.id}: no sources`);
    for (const id of n.sourceIds) assert(sources.has(id), `${n.id}: unknown source ${id}`);
  }
  for (const s of data.sources) assert(/^https?:\/\//.test(s.url), `${s.id}: invalid source URL`);
  const keys = new Set();
  const enabling = data.edges.filter(e => e.kind === 'enables');
  for (const e of data.edges) {
    assert(nodes.has(e.from) && nodes.has(e.to), `Dangling edge: ${e.from} -> ${e.to}`);
    assert.notEqual(e.from, e.to, `Self edge ${e.from}`);
    assert(['enables','explains'].includes(e.kind), `Invalid kind ${e.kind}`);
    assert(e.label?.trim(), `Missing relation label ${e.from} -> ${e.to}`);
    const key = `${e.kind}:${e.from}:${e.to}`;
    assert(!keys.has(key), `Duplicate relation ${key}`); keys.add(key);
    if (e.kind === 'enables') {
      assert(['required','support','alternative'].includes(e.role), `Missing prerequisite role ${key}`);
      assert(nodes.get(e.from).stage <= nodes.get(e.to).stage, `Capability points into an earlier stage: ${key}`);
    }
  }
  const indegree = new Map(data.nodes.map(n => [n.id, 0]));
  const outgoing = new Map(data.nodes.map(n => [n.id, []]));
  for (const e of enabling) { indegree.set(e.to, indegree.get(e.to)+1); outgoing.get(e.from).push(e.to); }
  const queue = [...nodes.keys()].filter(id => indegree.get(id) === 0);
  for (let i=0; i<queue.length; i++) for (const id of outgoing.get(queue[i])) {
    indegree.set(id, indegree.get(id)-1); if (indegree.get(id) === 0) queue.push(id);
  }
  assert.equal(queue.length, nodes.size, 'Capability graph contains a cycle');
  const reachable = new Set([data.entry]);
  for (const id of queue) if (reachable.has(id)) for (const target of outgoing.get(id)) reachable.add(target);
  assert.equal(reachable.size, nodes.size, `Disconnected from origin: ${[...nodes.keys()].filter(id=>!reachable.has(id)).join(', ')}`);
  const routeIds = new Set();
  for (const route of data.routes) {
    assert(!routeIds.has(route.id), `Duplicate route ${route.id}`); routeIds.add(route.id);
    assert(route.nodes.length >= 2, `Route too short ${route.id}`);
    for (const id of route.nodes) assert(nodes.has(id), `Unknown route node ${id}`);
    for (let i=1; i<route.nodes.length; i++) {
      assert(enabling.some(e=>e.from===route.nodes[i-1] && e.to===route.nodes[i]), `Route is not connected in discovery order: ${route.id} / ${route.nodes[i-1]} -> ${route.nodes[i]}`);
    }
  }
  return {nodes: nodes.size, relations: data.edges.length, capabilities: enabling.length, explanations: data.edges.length-enabling.length, stages: stages.size, routes: data.routes.length, sources: sources.size};
}

module.exports = { validate };
if (require.main === module) {
  const data = JSON.parse(fs.readFileSync('kb.json','utf8'));
  console.log('Knowledge validation passed:', validate(data));
  const bundle = fs.readFileSync('knowledge.js','utf8');
  const vm = require('node:vm');
  const context = { window: {} }; vm.runInNewContext(bundle, context);
  assert.equal(JSON.stringify(context.window.TECH_TREE), JSON.stringify(data), 'Generated bundle is stale; run node build.js');
  console.log('Generated bundle matches kb.json.');
}
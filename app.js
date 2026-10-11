(() => {
  const data = window.TECH_TREE;
  const byId = new Map(data.nodes.map(n => [n.id, n]));
  const sources = new Map(data.sources.map(s => [s.id, s]));
  const cats = {object:'观察入口', making:'制造工艺', materials:'材料科学', chemistry:'化学', physics:'物理', energy:'能量与电力', math:'数学与计量', life:'生存与生命', information:'信息与计算', cognition:'发现与认知'};
  const kinds = {object:'观察入口', practice:'实践节点', theory:'理论节点'};
  const colors = {object:'#dceee4', making:'#66d9bd', materials:'#dfbf79', chemistry:'#ec9984', physics:'#81b8ee', energy:'#a8acfa', math:'#c794df', life:'#a8c985', information:'#86cddb', cognition:'#dfacd0'};
  const q = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const type = n => n.nodeType || (n.category === 'object' ? 'object' : n.category === 'making' ? 'practice' : 'theory');
  const out = id => data.edges.filter(e => e.from === id);
  const incoming = id => data.edges.filter(e => e.to === id);
  const typeset = element => renderMathInElement(element, {delimiters:[{left:'\\[',right:'\\]',display:true},{left:'\\(',right:'\\)',display:false}],strict:'ignore'});
  const math = (selector, formula) => katex.render(formula, q(selector), {strict:'ignore'});
  let selected = byId.has(location.hash.slice(1)) ? location.hash.slice(1) : data.entry;
  let mode = 'atlas', route = null, nodeFilter = 'all', allLabels = false, showExplanations = false, stageScope = byId.get(selected).stage;
  let verified;
  try { verified = new Set(JSON.parse(localStorage.getItem('discovery-atlas-verified') || '[]').filter(id=>byId.has(id))); }
  catch { verified = new Set(); }
  const history = [selected];
  const graph = q('#graph'), universe = q('#universe');
  let width = 6100;
  let height = 800, verticalScale = 1;
  let positions = new Map(), visibleNodes = [], activeEdges = [];
  let camera = {x:0, y:0, scale:1};
  let frame;

  // Only capability-enabling links define discovery order. A later theory may
  // explain an earlier craft: explanation is deliberately not an invention gate.
  const enabling = data.edges.filter(e=>e.kind==='enables');
  const nextLinks = id => enabling.filter(e=>e.from===id);
  const previousLinks = id => enabling.filter(e=>e.to===id);
  const rank = new Map(data.nodes.map(n => [n.id, 0]));
  const indegree = new Map(data.nodes.map(n => [n.id, previousLinks(n.id).length]));
  const queue = data.nodes.filter(n => !indegree.get(n.id)).map(n => n.id);
  for (let i=0; i<queue.length; i++) {
    for (const e of nextLinks(queue[i])) {
      if (byId.get(e.from).stage === byId.get(e.to).stage) rank.set(e.to, Math.max(rank.get(e.to), rank.get(e.from) + 1));
      indegree.set(e.to, indegree.get(e.to) - 1);
      if (!indegree.get(e.to)) queue.push(e.to);
    }
  }
  const stages = data.stages || [];
  const domains = ['life','making','materials','chemistry','energy','physics','math','information','cognition','object'];
  function atlasLayout() {
    width = Math.max(1500, stages.length*650+180);
    const counts = stages.map(s=>data.nodes.filter(n=>n.stage===s.id).length);
    height = Math.max(950, Math.max(...counts)*65+260);
    verticalScale = 1;
    const layout = new Map();
    stages.forEach(s=>{
      const nodes=data.nodes.filter(n=>n.stage===s.id).sort((a,b)=>domains.indexOf(a.category)-domains.indexOf(b.category) || rank.get(a.id)-rank.get(b.id) || a.id.localeCompare(b.id));
      const depth=Math.max(1,...nodes.map(n=>rank.get(n.id)));
      nodes.forEach((n,i)=>layout.set(n.id,{x:120+s.id*650+rank.get(n.id)/depth*400,y:190+i*65}));
    });
    return layout;
  }
  const major = new Set(['observation-test','stone-tools','fire-control','agriculture','pottery-kiln','iron-smelting','writing-records','experiments-control','machine-tools','steam-engine','generator','power-grid','semiconductors','transistor','hall-heroult-cell','can','computers','networks','machine-learning','intelligent-agent','closed-loop-research']);
  function sizeUniverse() {
    universe.style.width = `${width}px`;
    universe.style.height = `${height}px`;
    let seed = 19;
    const random = () => ((seed = seed*16807%2147483647)-1)/2147483646;
    q('#starfield').setAttribute('viewBox', `0 0 ${width} ${height}`);
    q('#starfield').innerHTML = Array.from({length:180}, () => `<circle cx="${random()*width}" cy="${random()*height}" r="${(.3+random()*.8)/camera.scale}" fill="#879bb2" opacity="${.08+random()*.16}"/>`).join('');
  }
  q('#tree-count').textContent = `${data.nodes.length} 个节点 / ${data.edges.length} 条关联`;
  q('#route-count').textContent = String(data.routes.length).padStart(2,'0');
  q('#routes').innerHTML = data.routes.map((r,i) => `<button type="button" data-route="${r.id}"><span class="route-index">${String(i+1).padStart(2,'0')}</span>${esc(r.title)}</button>`).join('');
  q('#stage-nav').innerHTML = '<button type="button" data-stage="all" aria-pressed="true">全树</button>' + stages.map(s=>`<button type="button" data-stage="${s.id}" aria-pressed="false"><small>${String(s.id+1).padStart(2,'0')}</small>${esc(s.title)}</button>`).join('');

  function select(id, addHistory=true, preserveRoute=false) {
    if (!byId.has(id)) return;
    const changedStage = stageScope!==null && byId.get(id).stage!==stageScope;
    if(changedStage) stageScope=byId.get(id).stage;
    selected = id;
    if (addHistory && history.at(-1) !== id) history.push(id);
    if (!preserveRoute) route = null;
    window.history.replaceState(null, '', `#${id}`);
    q('#search-results').hidden = true;
    render(mode === 'focus'||changedStage);
    if(mode==='atlas'&&!changedStage&&positions.has(id)){
      const p=positions.get(id);
      if(p.x*camera.scale+camera.x<45||p.x*camera.scale+camera.x>graph.clientWidth-45||p.y*camera.scale+camera.y<80||p.y*camera.scale+camera.y>graph.clientHeight-70){camera.x=graph.clientWidth/2-p.x*camera.scale;camera.y=graph.clientHeight/2-p.y*camera.scale;updateCamera();}
    }
    q('#detail').scrollTop = 0;
  }

  function localLayout() {
    const previous = [...new Set(previousLinks(selected).map(e=>e.from))];
    const next = [...new Set(nextLinks(selected).map(e=>e.to))];
    const shown = new Set([selected, ...previous, ...next]);
    const deeper = [...new Set(next.flatMap(id=>nextLinks(id).map(e=>e.to)))].filter(id=>!shown.has(id)).slice(0,12);
    const cols = [previous, [selected], next, deeper];
    const layout = new Map();
    cols.forEach((ids,col) => {
      const sorted = ids.map(id=>byId.get(id)).sort((a,b)=>type(a).localeCompare(type(b)) || a.category.localeCompare(b.category));
      sorted.forEach((n,i) => layout.set(n.id, {x:col*370+155, y:sorted.length===1 ? height/2 : 155+i*(height-300)/Math.max(1,sorted.length-1)}));
    });
    return layout;
  }

  function nodeButton(n, related, routeNodes) {
    const p = positions.get(n.id), k = type(n);
    const classes = ['graph-node',k,n.id===selected?'selected':'',related.has(n.id)?'related':'',routeNodes.has(n.id)?'route-node':'',route&&!routeNodes.has(n.id)?'context-dim':'',stageScope!==null&&n.stage!==stageScope?'stage-dim':'',verified.has(n.id)?'verified':'',nodeFilter!=='all'&&k!==nodeFilter&&k!=='object'&&n.id!==selected?'type-dim':''];
    return `<button type="button" class="${classes.join(' ')}" data-node="${n.id}" style="left:${p.x}px;top:${p.y}px;--category:var(--${n.category})" aria-pressed="${n.id===selected}" aria-label="${esc(n.title)}，${kinds[k]}，${cats[n.category]}" title="${esc(n.title)} · ${kinds[k]}${n.practice?' · '+esc(n.practice.line):''}"><span class="node-core" aria-hidden="true"></span><span class="node-label"><strong>${esc(n.title)}</strong><span class="node-subtitle">${kinds[k]} · ${cats[n.category]}</span></span></button>`;
  }

  function renderMap(fit=false) {
    const n = byId.get(selected);
    const r = data.routes.find(r=>r.id===route);
    const related = new Set([...nextLinks(selected).map(e=>e.to), ...previousLinks(selected).map(e=>e.from)]);
    const routeNodes = new Set(r?.nodes || []);
    if (mode==='atlas') positions = atlasLayout();
    else { width=1500; height=Math.max(850, Math.max(previousLinks(selected).length,nextLinks(selected).length,12)*70+220); verticalScale=1; positions=localLayout(); }
    sizeUniverse();
    visibleNodes = data.nodes.filter(n=>positions.has(n.id));
    activeEdges = data.edges.filter(e=>(showExplanations||e.kind==='enables')&&positions.has(e.from)&&positions.has(e.to));
    q('#focus-view').setAttribute('aria-pressed', mode==='focus');
    q('#atlas-view').setAttribute('aria-pressed', mode==='atlas');
    q('#routes').querySelectorAll('button').forEach(b=>b.classList.toggle('active', b.dataset.route===route));
    q('#map-title').textContent = r ? r.title : mode==='atlas' ? stageScope===null?'从原始能力，到自主发现':stages.find(s=>s.id===stageScope).title : n.title;
    q('#map-kicker').textContent = r ? '一条可探索的路线，不是唯一的历史' : mode==='atlas' ? stageScope===null?'新能力向右展开 · 点选阶段，走近一段':'已有能力 → 新的突破 · 周围阶段仍然保留' : '左边是前置能力，右边是新的可能';
    q('#node-layout').innerHTML = visibleNodes.map(n=>nodeButton(n,related,routeNodes)).join('');
    q('#regions').innerHTML = mode==='atlas' ? stages.map(s=>`<div class="stage-region" style="left:${60+s.id*650}px;width:600px;height:${height-70}px"><div class="region-label" style="left:300px;top:75px;--region-color:#a7c6ba"><small>${String(s.id+1).padStart(2,'0')} / ${s.en}</small>${esc(s.title)}<span>${esc(s.question)}</span></div></div>`).join('') : [
      {x:155,t:'已经需要的能力'}, {x:525,t:'当前突破'}, {x:895,t:'可以继续发展'}, {x:1265,t:'再下一层可能'}
    ].map(r=>`<div class="region-label" style="left:${r.x}px;top:75px;--region-color:#a7c6ba">${r.t}</div>`).join('');
    const practiceCount = visibleNodes.filter(n=>type(n)==='practice').length;
    const theoryCount = visibleNodes.filter(n=>type(n)==='theory').length;
    q('#map-count').textContent = `${practiceCount} 实践 · ${theoryCount} 理论`;
    q('#map-count').title = `图中 ${visibleNodes.length} 个节点（包含观察入口时单独计数）`;
    q('#stage-nav').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.stage===(stageScope===null?'all':String(stageScope))));
    q('#progress-count').textContent=`已验证 ${verified.size} / ${data.nodes.length} · 只保存在此浏览器`;
    q('#back').disabled = history.length<2;
    q('#trail').innerHTML = history.slice(-6).map((id,i)=>`${i?'<span class="trail-arrow">→</span>':''}<button type="button" data-jump="${id}">${esc(byId.get(id).title)}</button>`).join('');
    q('#frontier-text').textContent = n.frontier || `从「${n.title}」继续：能否推导核心公式？换一种材料或工艺，结论会怎样改变？`;
    typeset(q('.question-seed'));
    if (fit) fitMap(r?.nodes || (mode==='atlas'&&stageScope!==null?data.nodes.filter(n=>n.stage===stageScope).map(n=>n.id):undefined)); else updateCamera();
  }

  function drawEdges() {
    const svg = q('#edges');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const r = data.routes.find(r=>r.id===route);
    const routePairs = new Set(r?.nodes.slice(1).map((id,i)=>`${r.nodes[i]}:${id}`) || []);
    const paths = activeEdges.map(e => {
      const a = positions.get(e.from), b = positions.get(e.to);
      const dx = b.x-a.x, dy = b.y-a.y, length = Math.hypot(dx,dy) || 1;
      const inset = Math.min(10/camera.scale,length/4);
      const x1 = a.x+dx/length*inset, y1 = a.y+dy/length*inset;
      const x2 = b.x-dx/length*inset, y2 = b.y-dy/length*inset;
      const direction = dx>=0?1:-1;
      const curve = Math.max(45,Math.abs(dx)*.44);
      const isRoute = routePairs.has(`${e.from}:${e.to}`);
      const highlight = !route && (e.from===selected || e.to===selected);
      const typeDim = nodeFilter!=='all' && ![e.from,e.to].some(id=>type(byId.get(id))===nodeFilter);
      const classes = ['edge',e.kind,e.role==='alternative'?'alternative':'',e.role==='support'?'support':'',isRoute?'route-edge':'',highlight?'highlight':'',route&&!isRoute?'dim':'',stageScope!==null&&!([e.from,e.to].some(id=>byId.get(id).stage===stageScope))?'dim':'',typeDim?'type-dim':''];
      return `<path class="${classes.join(' ')}" style="--edge-color:${colors[byId.get(e.from).category]}" d="M${x1} ${y1} C${x1+direction*curve} ${y1},${x2-direction*curve} ${y2},${x2} ${y2}" ${isRoute||highlight?'marker-end="url(#arrow)"':''}><title>${esc(byId.get(e.from).title)} → ${esc(byId.get(e.to).title)}：${esc(e.label)}</title></path>`;
    }).join('');
    svg.innerHTML = `<defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M1 1 L7 4 L1 7" fill="none" stroke="#aac5b8" stroke-width="1"/></marker></defs>${paths}`;
  }

  function updateCamera() {
    graph.classList.toggle('overview',camera.scale<.2);
    universe.style.transform = `translate(${camera.x}px,${camera.y}px) scale(${camera.scale})`;
    graph.style.setProperty('--zoom',camera.scale);
    q('#zoom-value').textContent = `${Math.round(camera.scale*100)}%`;
    drawEdges();
    drawMinimap();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(placeLabels);
  }

  function fitMap(ids) {
    const ps = (ids || [...positions.keys()]).map(id=>positions.get(id)).filter(Boolean);
    if (!ps.length) return;
    const xs = ps.map(p=>p.x), ys = ps.map(p=>p.y);
    const x1 = Math.min(...xs), x2 = Math.max(...xs), y1 = Math.min(...ys), y2 = Math.max(...ys);
    const scale = Math.max(.035,Math.min((graph.clientWidth-110)/(x2-x1+130), (graph.clientHeight-165)/(y2-y1+110), 1.05));
    camera = {scale, x:graph.clientWidth/2-(x1+x2)/2*scale, y:graph.clientHeight/2-(y1+y2)/2*scale-5};
    updateCamera();
  }

  function zoomAt(scale, x=graph.clientWidth/2, y=graph.clientHeight/2) {
    scale = Math.min(2.4,Math.max(.035,scale));
    const wx = (x-camera.x)/camera.scale, wy = (y-camera.y)/camera.scale;
    camera = {scale, x:x-wx*scale, y:y-wy*scale};
    updateCamera();
  }

  // Keep text at a readable screen size when the atlas is zoomed out. Labels
  // yield to selected stars and neighbours; minor stars reveal names on hover.
  function placeLabels() {
    const buttons = [...q('#node-layout').querySelectorAll('[data-node]')];
    const isImportant = b => b.classList.contains('selected') ? 4 : b.classList.contains('route-node') ? 3 : b.classList.contains('related') ? 2 : major.has(b.dataset.node) ? 1 : 0;
    buttons.sort((a,b)=>isImportant(b)-isImportant(a));
    const graphRect = graph.getBoundingClientRect();
    const occupied = ['.minimap','.map-controls'].map(selector=>{
      const r=q(selector).getBoundingClientRect();
      return {x:r.left-graphRect.left,y:r.top-graphRect.top,w:r.width,h:r.height};
    });
    const intersects = (a,b) => a.x<b.x+b.w+5 && a.x+a.w+5>b.x && a.y<b.y+b.h+4 && a.y+a.h+4>b.y;
    for (const b of buttons) {
      b.classList.remove('label-hidden');
      if (!allLabels && mode==='atlas' && (!isImportant(b) || camera.scale<.2&&isImportant(b)<3)) { b.classList.add('label-hidden'); continue; }
      const p = positions.get(b.dataset.node), label = b.querySelector('.node-label');
      const cx = camera.x+p.x*camera.scale, cy = camera.y+p.y*camera.scale;
      const w = label.offsetWidth*camera.scale, h = label.offsetHeight*camera.scale;
      const gap = b.classList.contains('selected') ? 22 : 11;
      const candidates = [
        {x:cx-w/2,y:cy+gap}, {x:cx-w/2,y:cy-gap-h},
        {x:cx+gap,y:cy-h/2}, {x:cx-gap-w,y:cy-h/2},
        {x:cx+gap,y:cy+gap}, {x:cx-gap-w,y:cy+gap}
      ].map(r=>({...r,w,h}));
      const free = candidates.find(r => r.x>=5 && r.x+w<=graph.clientWidth-5 && r.y>=48 && r.y+h<=graph.clientHeight-83 && !occupied.some(o=>intersects(r,o)) && !visibleNodes.some(n=>{
        if(n.id===b.dataset.node) return false;
        const np=positions.get(n.id),nx=camera.x+np.x*camera.scale,ny=camera.y+np.y*camera.scale;
        return nx>r.x-5&&nx<r.x+w+5&&ny>r.y-5&&ny<r.y+h+5;
      }));
      const chosen = free || candidates[0];
      label.style.transform = 'none';
      label.style.left = `${(chosen.x-cx)/camera.scale+b.offsetWidth/2}px`;
      label.style.top = `${(chosen.y-cy)/camera.scale+b.offsetHeight/2}px`;
      if (free || b.classList.contains('selected')) occupied.push(chosen);
      else b.classList.add('label-hidden');
    }
  }

  function drawMinimap() {
    const svg = q('#minimap');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = visibleNodes.map(n=>{
      const p=positions.get(n.id);
      return `<circle cx="${p.x}" cy="${p.y}" r="${n.id===selected?23:10}" fill="${colors[n.category]}" opacity="${n.id===selected?1:.6}"/>`;
    }).join('') + `<rect x="${-camera.x/camera.scale}" y="${-camera.y/camera.scale}" width="${graph.clientWidth/camera.scale}" height="${graph.clientHeight/camera.scale}" fill="#81b8ee" fill-opacity=".04" stroke="#81a7bb" stroke-width="10"/>`;
  }

  function calculator(n) {
    if (['can','faraday-charge','hall-heroult-cell','smelting-energy','charge','moles'].includes(n.id)) {
      return String.raw`<section class="calc" data-calculator="electrolysis"><h3>动手算 · 把电量变成一只罐</h3><p class="calc-note">教学模型：输入的是铝元素质量，只算电解段。槽压和电流效率为自设参数。</p><label for="mass">铝质量 <output id="mass-value">13 g</output></label><input id="mass" type="range" min="5" max="30" step="0.5" value="13"><label for="voltage">运行槽压 <output id="voltage-value">4.2 V</output></label><input id="voltage" type="range" min="3" max="5" step="0.1" value="4.2"><label for="efficiency">电流效率 <output id="efficiency-value">95%</output></label><input id="efficiency" type="range" min="85" max="100" step="1" value="95"><div class="calc-result" aria-live="polite"><div><span class="label">所需电量</span><output id="calc-charge"></output></div><div><span class="label">电解输入</span><output id="calc-energy"></output></div></div><p class="calc-caption">\[\begin{aligned}Q&=\frac{3Fm}{M\eta}\\[3pt]W&=VQ\end{aligned}\]未计矿山、精炼、制罐、整流和辅机。</p></section>`;
    }
    if (n.simulator==='stress') {
      return String.raw`<section class="calc" data-calculator="stress"><h3>动手算 · 壁厚与环向应力</h3><p class="calc-note">理想薄壁圆筒的静态膜应力，半径设为 \(33\,\mathrm{mm}\)。这里只改变压差和壁厚。</p><label for="pressure">内外压差 <output id="pressure-value">0.3 MPa</output></label><input id="pressure" type="range" min="0" max="0.6" step="0.01" value="0.3"><label for="thickness">侧壁厚度 <output id="thickness-value">0.1 mm</output></label><input id="thickness" type="range" min="0.07" max="0.2" step="0.005" value="0.1"><div class="calc-result" aria-live="polite"><div><span class="label">理想环向应力 \(\sigma_\theta\)</span><output id="calc-stress"></output></div><div><span class="label">理想轴向应力 \(\sigma_z\)</span><output id="calc-axial"></output></div></div><p class="calc-caption">\[\begin{aligned}\sigma_\theta&=\frac{\Delta p\,r}{t}\\[3pt]\sigma_z&=\frac{\Delta p\,r}{2t}\end{aligned}\]罐底、卷封、刻痕、缺陷与屈曲需另外分析。</p></section>`;
    }
    return '';
  }

  function renderDetail() {
    const n=byId.get(selected), index=data.nodes.indexOf(n)+1, k=type(n), color=colors[n.category];
    const learning=n.learning;
    const cycle=learning?`<section class="discovery-card"><h3>怎样发现，而不只是背下结论<span>DISCOVERY LOOP</span></h3><ol>${[['observe','观察'],['try','尝试'],['infer','推断'],['check','验证'],['unlocks','新能力']].map(([key,label])=>`<li><strong>${label}</strong><p>${esc(learning[key])}</p></li>`).join('')}</ol></section>`:'';
    const roles={required:'本图的关键前置',support:'有帮助，不是硬门槛',alternative:'一条可替代路径'};
    const links=(list,key)=>list.map(e=>{const id=e[key];return `<button type="button" data-detail-node="${id}"><span>${verified.has(id)?'✓ ':''}${esc(byId.get(id).title)} ${key==='to'?'→':'←'}</span><span>${esc(e.label)} · ${roles[e.role]||'提供能力'}</span></button>`;}).join('');
    const prior=previousLinks(selected),next=nextLinks(selected),explanations=data.edges.filter(e=>e.kind==='explains'&&e.to===selected);
    const capability=`<section class="capability-card"><h3>前置能力与学习记录</h3><p>关键前置、助力和替代路线分别列出；浏览不受锁定。现实中的原料、能源、场地和协作仍须具备。</p>${prior.length?`<div class="deps">${links(prior,'from')}</div>`:'<p class="root-note">起点没有指定技术前置，但仍需要生存条件、观察对象与可重复的尝试。</p>'}<button type="button" class="verify-button" data-verify="${n.id}" aria-pressed="${verified.has(n.id)}">${verified.has(n.id)?'✓ 已记录学习与验证':'记录：已学习并完成验证'}</button><small>手动学习标记，只保存在此浏览器；不是工程能力或安全资质认证。</small></section>`;
    const role = n.practice ? `<section class="production-card"><h3>${esc(n.practice.line)}<span>PROCESS NODE</span></h3><ol><li><small>输入 / INPUT</small>${esc(n.practice.input)}</li><li><small>处理 / OPERATION</small>${esc(n.practice.operation)}</li><li><small>输出 / OUTPUT</small>${esc(n.practice.output)}</li></ol><p class="production-caption">典型产线角色示意，不代表实际设备配置或操作规程。</p></section>` : k==='theory' ? `<div class="theory-card">这是一个解释节点：它为工艺或其他原理提供理论依据，本身不是一道产线操作。</div>` : '';
    q('#detail').style.setProperty('--node-color',color);
    q('#detail').innerHTML = `<header class="detail-header"><div class="detail-meta"><span class="detail-number">NODE ${String(index).padStart(2,'0')} / ${String(data.nodes.length).padStart(2,'0')} · ${esc(stages.find(s=>s.id===n.stage)?.title||'')}</span><span class="node-type-badge"><i class="legend-shape ${k}"></i>${kinds[k]} · ${cats[n.category]}</span></div><h2>${esc(n.title)}</h2><p class="subtitle">${esc(n.subtitle)}</p></header><p class="detail-question">${esc(n.question)}</p>${cycle}${capability}${role}<section class="detail-section"><h3>${k==='practice'?'工艺怎样发生':'事情如何发生'}</h3><p>${esc(n.mechanism)}</p></section><section class="detail-section"><h3>为什么会这样</h3><p>${esc(n.why)}</p></section>${n.equations.length?`<section class="detail-section"><h3>把原理写成式子</h3>${n.equations.map(e=>`<div class="equation"><div class="formula">${esc(e.formula)}</div><p class="terms">${esc(e.terms)}</p><p class="scope">模型范围 · ${esc(e.scope)}</p></div>`).join('')}</section>`:''}${calculator(n)}<section class="detail-section example-block"><h3>一个例子 · ${n.id==='can'?'一只罐的量级':'把能力落到实处'}</h3><p>${esc(n.example)}</p></section><section class="detail-section gotcha"><h3>容易想岔的地方</h3><p>${esc(n.gotcha)}</p></section>${next.length?`<section class="detail-section"><h3>可以继续向右发展</h3><div class="deps">${links(next,'to')}</div></section>`:''}${explanations.length?`<details class="sources"><summary>后来的理论怎样解释它 · 不是发明门槛</summary><div class="deps">${explanations.map(e=>`<button type="button" data-detail-node="${e.from}"><span>${esc(byId.get(e.from).title)}</span><span>${esc(e.label)}</span></button>`).join('')}</div></details>`:''}<section class="detail-section frontier"><h3>边界与尚待解决</h3><p>${esc(n.frontier||'这些关系是精选路径，不是完整的工程设计；需继续补充测量、成本、可靠性与现场条件。')}</p></section><details class="sources"><summary>依据与延伸阅读 · ${n.sourceIds.length} 个来源</summary><ol>${n.sourceIds.map(id=>sources.get(id)).map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.title)} ↗</a></li>`).join('')}</ol></details>`;
    q('#detail').querySelectorAll('.formula').forEach((element,i)=>katex.render(n.equations[i].formula,element,{displayMode:true,strict:'ignore'}));
    typeset(q('#detail'));
    const calc=q('[data-calculator]');
    if (calc) {
      const update=()=>{
        if (calc.dataset.calculator==='electrolysis') {
          const m=+q('#mass').value,v=+q('#voltage').value,eta=+q('#efficiency').value/100;
          const ah=3*96485*m/26.9815/eta/3600;
          math('#mass-value',String.raw`${m.toFixed(1)}\,\mathrm{g}`);
          math('#voltage-value',String.raw`${v.toFixed(1)}\,\mathrm{V}`);
          math('#efficiency-value',String.raw`${(eta*100).toFixed(0)}\%`);
          math('#calc-charge',String.raw`${ah.toFixed(1)}\,\mathrm{Ah}`);
          math('#calc-energy',String.raw`${(v*ah).toFixed(0)}\,\mathrm{Wh}`);
        } else {
          const p=+q('#pressure').value,t=+q('#thickness').value,s=p*33/t;
          math('#pressure-value',String.raw`${p.toFixed(2)}\,\mathrm{MPa}`);
          math('#thickness-value',String.raw`${t.toFixed(3)}\,\mathrm{mm}`);
          math('#calc-stress',String.raw`${s.toFixed(1)}\,\mathrm{MPa}`);
          math('#calc-axial',String.raw`${(s/2).toFixed(1)}\,\mathrm{MPa}`);
        }
      };
      calc.querySelectorAll('input').forEach(input=>input.addEventListener('input',update));
      update();
    }
  }

  function render(fit=false) { renderMap(fit); renderDetail(); }
  q('#node-layout').addEventListener('click',e=>{
    const b=e.target.closest('[data-node]');
    if(b) select(b.dataset.node,true,!!route&&data.routes.find(r=>r.id===route).nodes.includes(b.dataset.node));
  });
  q('#detail').addEventListener('click',e=>{
    const b=e.target.closest('[data-detail-node]');if(b)select(b.dataset.detailNode);
    const v=e.target.closest('[data-verify]');
    if(v){const id=v.dataset.verify;verified.has(id)?verified.delete(id):verified.add(id);try{localStorage.setItem('discovery-atlas-verified',JSON.stringify([...verified]));}catch{}render();}
  });
  q('#trail').addEventListener('click',e=>{const b=e.target.closest('[data-jump]');if(b)select(b.dataset.jump);});
  q('#routes').addEventListener('click',e=>{
    const b=e.target.closest('[data-route]');
    if(b){route=b.dataset.route;stageScope=null;mode='atlas';select(data.routes.find(r=>r.id===route).nodes[0],true,true);fitMap(data.routes.find(r=>r.id===route).nodes);}
  });
  q('#focus-view').onclick=()=>{mode='focus';route=null;renderMap(true);};
  q('#atlas-view').onclick=()=>{mode='atlas';route=null;renderMap(true);};
  q('#stage-nav').addEventListener('click',e=>{
    const b=e.target.closest('[data-stage]');if(!b)return;
    stageScope=b.dataset.stage==='all'?null:Number(b.dataset.stage);mode='atlas';route=null;
    if(stageScope!==null)select(data.nodes.find(n=>n.stage===stageScope).id);
    renderMap(true);
  });
  q('#back').onclick=()=>{if(history.length>1){history.pop();select(history.at(-1),false);}};
  q('.brand-lockup').onclick=e=>{e.preventDefault();mode='atlas';stageScope=0;select(data.entry);renderMap(true);};
  q('.type-switch').addEventListener('click',e=>{
    const b=e.target.closest('[data-filter]');
    if(b){nodeFilter=b.dataset.filter;q('.type-switch').querySelectorAll('button').forEach(t=>t.setAttribute('aria-pressed',t===b));renderMap();}
  });
  q('#toggle-labels').onclick=()=>{allLabels=!allLabels;q('#toggle-labels').setAttribute('aria-pressed',allLabels);placeLabels();};
  q('#toggle-explanations').onclick=()=>{showExplanations=!showExplanations;q('#toggle-explanations').setAttribute('aria-pressed',showExplanations);renderMap();};
  q('#zoom-in').onclick=()=>zoomAt(camera.scale*1.25);
  q('#zoom-out').onclick=()=>zoomAt(camera.scale/1.25);
  q('#fit-map').onclick=()=>{stageScope=null;renderMap(true);};
  graph.addEventListener('wheel',e=>{
    e.preventDefault();const rect=graph.getBoundingClientRect();zoomAt(camera.scale*Math.exp(-e.deltaY*.0015),e.clientX-rect.left,e.clientY-rect.top);
  },{passive:false});
  const pointers=new Map();
  let gesture=null;
  graph.addEventListener('pointerdown',e=>{
    if(e.button!==0 || e.target.closest('.graph-node,.map-controls,.minimap'))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});graph.setPointerCapture(e.pointerId);graph.classList.add('is-dragging');
    gesture=null;
  });
  graph.addEventListener('pointermove',e=>{
    const previous=pointers.get(e.pointerId);if(!previous)return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===1){camera.x+=e.clientX-previous.x;camera.y+=e.clientY-previous.y;updateCamera();}
    else{
      const [a,b]=[...pointers.values()];const distance=Math.hypot(a.x-b.x,a.y-b.y);const center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      if(gesture){const rect=graph.getBoundingClientRect();camera.x+=center.x-gesture.x;camera.y+=center.y-gesture.y;zoomAt(camera.scale*distance/gesture.distance,center.x-rect.left,center.y-rect.top);}
      gesture={...center,distance};
    }
  });
  const endPointer=e=>{pointers.delete(e.pointerId);gesture=null;if(!pointers.size)graph.classList.remove('is-dragging');};
  graph.addEventListener('pointerup',endPointer);graph.addEventListener('pointercancel',endPointer);
  q('#minimap').addEventListener('click',e=>{
    const rect=q('#minimap').getBoundingClientRect();const x=(e.clientX-rect.left)/rect.width*width,y=(e.clientY-rect.top)/rect.height*height;
    camera.x=graph.clientWidth/2-x*camera.scale;camera.y=graph.clientHeight/2-y*camera.scale;updateCamera();
  });
  graph.addEventListener('keydown',e=>{
    if(e.target!==graph)return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();camera.x+=e.key==='ArrowLeft'?60:e.key==='ArrowRight'?-60:0;camera.y+=e.key==='ArrowUp'?60:e.key==='ArrowDown'?-60:0;updateCamera();}
    if(e.key==='+'||e.key==='=')zoomAt(camera.scale*1.25);
    if(e.key==='-')zoomAt(camera.scale/1.25);
    if(e.key==='0')fitMap();
  });
  q('#search').addEventListener('input',()=>{
    const term=q('#search').value.trim().toLowerCase(),results=q('#search-results');results.hidden=!term;
    if(term){const matches=data.nodes.filter(n=>[n.title,n.subtitle,n.question,n.mechanism,n.why,n.practice?.line||'',cats[n.category],kinds[type(n)],stages.find(s=>s.id===n.stage)?.title].join(' ').toLowerCase().includes(term));results.innerHTML=matches.length?matches.slice(0,12).map(n=>`<button type="button" data-search-node="${n.id}"><i class="legend-shape ${type(n)}"></i>${esc(n.title)}<span class="result-type">${kinds[type(n)]}</span></button>`).join(''):'<p class="small">还没有这颗星，记下来，下次接上。</p>';}
  });
  q('#search-results').addEventListener('click',e=>{const b=e.target.closest('[data-search-node]');if(b){mode='focus';select(b.dataset.searchNode);q('#search').value='';}});
  document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap'))q('#search-results').hidden=true;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')q('#search-results').hidden=true;});
  window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(byId.has(id))select(id);});
  q('#copy-question').onclick=async()=>{
    const n=byId.get(selected),prompt=`继续“万物的来路”科技树。从「${n.title}」已经获得的能力向右发展：${n.frontier} 请提出可观察现象、尝试方案、可证伪假说、独立验证标准、资源条件和来源。区分关键前置、助力、替代路径与后来的理论解释；不要把生成答案等同于实验发现。公式与化学反应式使用 LaTeX；实践节点列出输入、处理、输出。stage 表示可行的发展阶段，不是统一年代。enables 箭头从已有能力指向新能力，explains 单独表达后来的解释，不能变成早期发明的门槛。`;
    try{await navigator.clipboard.writeText(prompt);q('#copy-question').textContent='已复制，带回聊天继续挖 ✓';}catch{q('#copy-question').textContent='浏览器未允许复制，请在聊天中说“继续挖这个节点”';}
    setTimeout(()=>q('#copy-question').textContent='复制这个节点的追问 ↗',3000);
  };
  render(true);
  new ResizeObserver(()=>{if(visibleNodes.length)renderMap(true);}).observe(graph);
})();

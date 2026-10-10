(() => {
  const data = window.TECH_TREE;
  const byId = new Map(data.nodes.map(n => [n.id,n]));
  const sources = new Map(data.sources.map(s => [s.id,s]));
  const cats = {object:'日常物件',making:'制造工艺',materials:'材料组织',chemistry:'化学过程',physics:'物理原理',energy:'能量与电力',math:'数学与计量'};
  const q = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const typeset = element => renderMathInElement(element, {
    delimiters: [{left:'\\[',right:'\\]',display:true},{left:'\\(',right:'\\)',display:false}],
    strict: 'ignore'
  });
  const math = (selector, formula) => katex.render(formula, q(selector), {strict:'ignore'});
  let selected = byId.has(location.hash.slice(1)) ? location.hash.slice(1) : 'can';
  let mode = 'focus', route = null, history = [selected];
  let activeEdges = [];
  const out = id => data.edges.filter(e => e.from===id);
  const incoming = id => data.edges.filter(e => e.to===id);
  const nodeButton = (n, extra='') => `<button type="button" class="graph-node ${n.id===selected?'selected':''} ${extra}" data-node="${n.id}" style="--category:var(--${n.category==='object'?'making':n.category})" aria-pressed="${n.id===selected}"><span class="node-kind"><i class="category-dot"></i>${cats[n.category]}</span><strong>${esc(n.title)}</strong></button>`;
  q('#tree-count').textContent = `${data.nodes.length} 个节点 · ${data.edges.length} 条关联`;
  q('#routes').innerHTML = data.routes.map((r,i)=>`<button type="button" data-route="${r.id}"><span class="route-index">${String(i+1).padStart(2,'0')}</span>${r.title}</button>`).join('');
  function select(id, addHistory=true, preserveRoute=false) {
    selected=id;
    if(addHistory && history.at(-1)!==id) history.push(id);
    if(!preserveRoute) route=null;
    window.history.replaceState(null,'',`#${id}`);
    q('#search-results').hidden=true;
    render();
  }
  function band(title, nodes, cls='') {
    return `<div class="graph-band ${cls}"><span class="band-label">${title}</span><div class="band-nodes">${nodes.map(n=>nodeButton(n)).join('')}</div></div>`;
  }
  function renderMap() {
    const n=byId.get(selected), layout=q('#node-layout');
    q('#focus-view').setAttribute('aria-pressed',mode==='focus');
    q('#atlas-view').setAttribute('aria-pressed',mode==='atlas');
    q('#graph').classList.toggle('atlas',mode==='atlas');
    q('#routes').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.route===route));
    q('#map-title').textContent=mode==='atlas'?'一只罐子的知识网络':route?data.routes.find(r=>r.id===route).title:n.title;
    q('#map-kicker').textContent=mode==='atlas'?'同一个原理，可以连起不同枝条':route?'一条精选的追问路线':'一层一层，往下追';
    if(mode==='atlas') {
      const related=new Set([...out(selected).map(e=>e.to),...incoming(selected).map(e=>e.from)]);
      layout.innerHTML=`<div class="atlas-grid">${Object.entries(cats).map(([c,t])=>{
        const nodes=data.nodes.filter(n=>n.category===c);
        return nodes.length?`<div class="atlas-column"><span class="band-label">${t}</span>${nodes.map(n=>nodeButton(n,related.has(n.id)?'related':'')).join('')}</div>`:'';
      }).join('')}</div>`;
      activeEdges=data.edges;
    } else if(route) {
      const r=data.routes.find(r=>r.id===route);
      layout.innerHTML=r.nodes.map((id,i)=>band(`${String(i+1).padStart(2,'0')} · ${r.steps[i]}`,[byId.get(id)],id===selected?'current-band':'route-band')).join('');
      activeEdges=r.nodes.slice(1).map((id,i)=>data.edges.find(e=>e.from===r.nodes[i]&&e.to===id)).filter(Boolean);
    } else {
      const ins=incoming(selected), outs=out(selected);
      const previous=[...new Set(ins.map(e=>e.from))].map(id=>byId.get(id));
      const next=[...new Set(outs.map(e=>e.to))].map(id=>byId.get(id));
      const visible=new Set([selected,...previous.map(n=>n.id),...next.map(n=>n.id)]);
      const deeper=[...new Set(next.flatMap(n=>out(n.id).map(e=>e.to)))].filter(id=>!visible.has(id)).slice(0,6).map(id=>byId.get(id));
      deeper.forEach(n=>visible.add(n.id));
      layout.innerHTML=(previous.length?band('这些东西，借用了它',previous,'previous-band'):'')+band('此刻的好奇心',[n],'current-band')+(next.length?band('继续追：它需要什么？为什么成立？',next,'next-band'):'')+(deeper.length?band('再往下一层',deeper,'deep-band'):'');
      activeEdges=data.edges.filter(e=>visible.has(e.from)&&visible.has(e.to));
    }
    q('#map-count').textContent=`图中 ${layout.querySelectorAll('[data-node]').length} 个节点`;
    q('#back').disabled=history.length<2;
    q('#trail').innerHTML=history.slice(-7).map((id,i)=>`${i?'<span class="trail-arrow">→</span>':''}<button type="button" data-jump="${id}">${esc(byId.get(id).title)}</button>`).join('');
    q('#frontier-text').textContent=n.frontier || `从「${n.title}」继续：能否推导核心公式？换一种材料或工艺，结论会怎样改变？`;
    typeset(q('.map-panel'));
    requestAnimationFrame(drawEdges);
  }
  function drawEdges() {
    const graph=q('#graph'), box=graph.getBoundingClientRect(), svg=q('#edges');
    svg.setAttribute('viewBox',`0 0 ${box.width} ${graph.offsetHeight}`);
    const buttons=new Map([...q('#node-layout').querySelectorAll('[data-node]')].map(b=>[b.dataset.node,b]));
    let paths='';
    for(const e of activeEdges) {
      const a=buttons.get(e.from), b=buttons.get(e.to);
      if(!a||!b) continue;
      const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
      let x1=ar.left-box.left+ar.width/2,y1=ar.bottom-box.top,x2=br.left-box.left+br.width/2,y2=br.top-box.top;
      if(br.top<ar.bottom+2 && mode==='atlas') {
        const right=br.left>ar.left;
        x1=(right?ar.right:ar.left)-box.left;y1=ar.top-box.top+ar.height/2;
        x2=(right?br.left:br.right)-box.left;y2=br.top-box.top+br.height/2;
        const curve=Math.max(25,Math.abs(x2-x1)/2);
        paths+=`<path class="edge ${e.kind} ${e.from===selected||e.to===selected?'highlight':'dim'}" d="M${x1} ${y1} C${x1+(right?curve:-curve)} ${y1},${x2+(right?-curve:curve)} ${y2},${x2} ${y2}" marker-end="url(#arrow)"><title>${esc(byId.get(e.from).title)} → ${esc(byId.get(e.to).title)}</title></path>`;
      } else {
        const mid=(y1+y2)/2;
        paths+=`<path class="edge ${e.kind} ${e.from===selected||e.to===selected?'highlight':''}" d="M${x1} ${y1} C${x1} ${mid},${x2} ${mid},${x2} ${y2}" marker-end="url(#arrow)"><title>${esc(byId.get(e.from).title)} → ${esc(byId.get(e.to).title)}</title></path>`;
      }
    }
    svg.innerHTML=`<defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8" fill="none" stroke="#8da17e" stroke-width="1.2"/></marker></defs>${paths}`;
  }
  function calculator(n) {
    if(['can','faraday-charge','hall-heroult-cell','smelting-energy','charge','moles'].includes(n.id)) {
      return String.raw`<section class="calc" data-calculator="electrolysis"><h3>动手算 · 把电量变成一只罐</h3><p class="calc-note">教学模型：输入的是铝元素质量，只算电解段。槽压和电流效率为自设参数。</p><label for="mass">铝质量 <output id="mass-value">13 g</output></label><input id="mass" type="range" min="5" max="30" step="0.5" value="13"><label for="voltage">运行槽压 <output id="voltage-value">4.2 V</output></label><input id="voltage" type="range" min="3" max="5" step="0.1" value="4.2"><label for="efficiency">电流效率 <output id="efficiency-value">95%</output></label><input id="efficiency" type="range" min="85" max="100" step="1" value="95"><div class="calc-result" aria-live="polite"><div><span class="label">所需电量</span><output id="calc-charge"></output></div><div><span class="label">电解输入</span><output id="calc-energy"></output></div></div><p class="calc-caption">\[\begin{aligned}Q&=\frac{3Fm}{M\eta}\\[3pt]W&=VQ\end{aligned}\]未计矿山、精炼、制罐、整流和辅机。</p></section>`;
    }
    if(n.simulator==='stress') {
      return String.raw`<section class="calc" data-calculator="stress"><h3>动手算 · 壁厚与环向应力</h3><p class="calc-note">理想薄壁圆筒的静态膜应力，半径设为 \(33\,\mathrm{mm}\)。这里只改变压差和壁厚。</p><label for="pressure">内外压差 <output id="pressure-value">0.3 MPa</output></label><input id="pressure" type="range" min="0" max="0.6" step="0.01" value="0.3"><label for="thickness">侧壁厚度 <output id="thickness-value">0.1 mm</output></label><input id="thickness" type="range" min="0.07" max="0.2" step="0.005" value="0.1"><div class="calc-result" aria-live="polite"><div><span class="label">理想环向应力 \(\sigma_\theta\)</span><output id="calc-stress"></output></div><div><span class="label">理想轴向应力 \(\sigma_z\)</span><output id="calc-axial"></output></div></div><p class="calc-caption">\[\begin{aligned}\sigma_\theta&=\frac{\Delta p\,r}{t}\\[3pt]\sigma_z&=\frac{\Delta p\,r}{2t}\end{aligned}\]罐底、卷封、刻痕、缺陷与屈曲需另外分析。</p></section>`;
    }
    return '';
  }
  function renderDetail() {
    const n=byId.get(selected),index=data.nodes.indexOf(n)+1;
    q('#detail').innerHTML=`<header class="detail-header"><span class="detail-number">${String(index).padStart(2,'0')} / ${cats[n.category]}</span><h2>${esc(n.title)}</h2><p class="subtitle">${esc(n.subtitle)}</p></header><p class="detail-question">${esc(n.question)}</p><section class="detail-section"><h3>事情如何发生</h3><p>${esc(n.mechanism)}</p></section><section class="detail-section"><h3>为什么会这样</h3><p>${esc(n.why)}</p></section>${n.equations.length?`<section class="detail-section"><h3>把原理写成式子</h3>${n.equations.map(e=>`<div class="equation"><div class="formula">${esc(e.formula)}</div><p class="terms">${esc(e.terms)}</p><p class="scope">模型范围 · ${esc(e.scope)}</p></div>`).join('')}</section>`:''}${calculator(n)}<section class="detail-section example-block"><h3>算一笔 · ${n.id==='can'?'一只罐的量级':'教学例子'}</h3><p>${esc(n.example)}</p></section><section class="detail-section gotcha"><h3>容易想岔的地方</h3><p>${esc(n.gotcha)}</p></section>${out(selected).length?`<section class="detail-section"><h3>再往下问</h3><div class="deps">${out(selected).map(e=>`<button type="button" data-detail-node="${e.to}"><span>${esc(byId.get(e.to).title)} ↘</span><span>${esc(e.label)}</span></button>`).join('')}</div></section>`:''}<details class="sources"><summary>依据与延伸阅读 · ${n.sourceIds.length} 个来源</summary><ol>${n.sourceIds.map(id=>sources.get(id)).map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.title)} ↗</a></li>`).join('')}</ol></details>`;
    const calc=q('[data-calculator]');
    q('#detail').querySelectorAll('.formula').forEach((element,i)=>{
      katex.render(n.equations[i].formula,element,{displayMode:true,strict:'ignore'});
    });
    typeset(q('#detail'));
    if(calc) {
      const update=()=>{
        if(calc.dataset.calculator==='electrolysis') {
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
      calc.querySelectorAll('input').forEach(input=>input.addEventListener('input',update));update();
    }
  }
  function render() {renderMap();renderDetail();}
  q('#node-layout').addEventListener('click',e=>{const b=e.target.closest('[data-node]');if(b) select(b.dataset.node,true,!!route);});
  q('#detail').addEventListener('click',e=>{const b=e.target.closest('[data-detail-node]');if(b){mode='focus';select(b.dataset.detailNode);}});
  q('#trail').addEventListener('click',e=>{const b=e.target.closest('[data-jump]');if(b)select(b.dataset.jump);});
  q('#routes').addEventListener('click',e=>{const b=e.target.closest('[data-route]');if(b){route=b.dataset.route;mode='focus';select(data.routes.find(r=>r.id===route).nodes[0],true,true);}});
  q('#focus-view').onclick=()=>{mode='focus';route=null;renderMap();};
  q('#atlas-view').onclick=()=>{mode='atlas';route=null;renderMap();};
  q('#back').onclick=()=>{history.pop();select(history.at(-1),false);};
  q('#search').addEventListener('input',()=>{
    const term=q('#search').value.trim().toLowerCase(),results=q('#search-results');
    results.hidden=!term;
    if(term){const matches=data.nodes.filter(n=>[n.title,n.subtitle,n.question].join(' ').toLowerCase().includes(term));results.innerHTML=matches.length?matches.slice(0,10).map(n=>`<button type="button" data-search-node="${n.id}">${esc(n.title)}</button>`).join(''):'<p class="small">还没有这条枝，记下来，下次接上。</p>';}
  });
  q('#search-results').addEventListener('click',e=>{const b=e.target.closest('[data-search-node]');if(b){mode='focus';select(b.dataset.searchNode);q('#search').value='';}});
  document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap'))q('#search-results').hidden=true;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')q('#search-results').hidden=true;});
  q('#copy-question').onclick=async()=>{
    const n=byId.get(selected),prompt=`继续我们的“万物的来路”科技树。从「${n.title}」往根本挖：${n.question} ${n.frontier||'请推导核心公式、给出数值例子，并把更基础的依赖接进知识网。'} 所有公式与化学反应式使用 LaTeX 排版。请更新本地知识节点与图，保留来源、适用条件和估算标记；当作私人玩具，不堆测试和防御代码。`;
    await navigator.clipboard.writeText(prompt);q('#copy-question').textContent='已复制，带回聊天继续挖 ✓';
    setTimeout(()=>q('#copy-question').textContent='复制这个节点的追问 ↗',2500);
  };
  new ResizeObserver(drawEdges).observe(q('#node-layout'));
  render();
})();

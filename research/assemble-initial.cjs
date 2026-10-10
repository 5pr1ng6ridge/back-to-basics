// 这次初始研究稿的合并记录。后续内容编辑 kb.json，再运行 build.js。
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname.endsWith('research') ? path.resolve(__dirname, '..') : __dirname;
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const bundles = ['research-aluminium.json','research-can.json','research-foundations.json','research-equilibria.json'].map(read);
const data = {title:'万物的来路',version:1,entry:'can',sources:bundles.flatMap(b=>b.sources),nodes:bundles.flatMap(b=>b.nodes),edges:bundles.flatMap(b=>b.edges)};
const node = id => data.nodes.find(n=>n.id===id);
const titles = {'bauxite-ore':'铝土矿与含铝矿物','bayer-digestion':'拜耳法 · 碱液消化','bayer-clarification':'拜耳法 · 澄清与赤泥','bayer-precipitation':'拜耳法 · 晶种析出','alumina-calcination':'煅烧得到氧化铝','cryolite-electrolyte':'冰晶石与熔盐浴','hall-heroult-cell':'霍尔–埃鲁电解','carbon-anode-reaction':'碳阳极与氧的去向','faraday-charge':'法拉第电解定律','thermo-voltage':'自由能与电解电压','smelting-energy':'电耗下限与真实损失','can-alloy-split':'罐身与罐盖的合金','coil-to-cup':'从卷材冲出杯','draw-redraw-ironing':'拉深与壁厚变薄','cold-work-dislocations':'位错与冷作硬化','end-stiffness':'罐盖的强度与形状','neck-flange-double-seam':'缩颈与双卷封','internal-coating-barrier':'罐内的聚合物涂层','oxide-passivation-pitting':'氧化膜与局部腐蚀','internal-pressure-hoop-stress':'内压与薄壁应力','shell-buckling-dome':'薄壳屈曲与穹底','recycling-sort-remelt':'分选、去涂层与重熔'};
Object.entries(titles).forEach(([id,title])=>{node(id).fullTitle=node(id).title;node(id).title=title;});

node('hall-heroult-cell').example='自设 100 kA 恒流运行 1 h，通过的电荷为 3.60×10⁸ C（360 MC），对应约 3731 mol 电子。每 mol 铝需 3 mol 电子，理论析出约 33.6 kg Al；若电流效率取 95%，则约 31.9 kg。这一步计算还没有用槽电压。';
node('bayer-clarification').equations=[{formula:'n(Al)进料 = n(Al)澄清液 + n(Al)残渣/夹带液',terms:'在核算边界内没有其他铝流出时，各流的铝元素物质的量守恒。',scope:'需分开测量未溶铝相与夹带溶液；质量衡算还须计入碱、水与所有其他固相。'}];
node('bayer-clarification').example='自设矿浆带入 100 kg Al₂O₃ 等效，92 kg 等效铝进入净澄清液，余下 8 kg 在残渣/夹带液等流中。92% 是这一核算边界下的净回收率；不能把余量全部解释成“沉降不完全”。';
node('bayer-precipitation').equations=[{formula:'[Al(OH)₄]⁻(aq) ⇌ Al(OH)₃(s) + OH⁻(aq)',terms:'析出后，母液的碱可回到消化段。Na⁺ 是对离子。',scope:'净计量式；析出程度和粒度还由活度、温度、晶种与停留时间决定。'},{formula:'S = C(溶解铝) / C_eq(溶解铝)',terms:'S：按这一浓度比定义的工艺过饱和度；C_eq：同一温度、碱度和液体组成条件下的平衡溶解铝浓度。',scope:'S>1 表示此定义下的过饱和；不能用固体 Al(OH)₃ 的活度去当浓度，也不能把浓液直接套稀溶液 Ksp。'}];
node('thermo-voltage').example='自设一个转移 3 mol 电子的分解反应，在指定恒温恒压条件下 ΔᵣG=300 kJ/mol，则最低可逆电压 300000/(3×96485)≈1.04 V。这是演示 ΔG 与电压关系的假想数据，不是铝电解槽的实测值。';
node('thermo-voltage').sourceIds.push('f-gibbs');
node('smelting-energy').mechanism='DOE 2007 报告中的理想碳阳极账本：原料和 CO₂ 在 25 °C、铝液以 960 °C 离开，忽略外部损失，合计 5.99 kWh/kg；其中 5.11 是 298 K 反应自由能对应的电功项，余下是热量项。若 CO₂ 也以 960 °C 排出，边界改为 6.16 kWh/kg。该报告的 2003 年美国电解段基准为 15.58 kWh/kg。IAI 又区分 DC 电解与包含整流及辅机的 AC 槽区电力。';
node('smelting-energy').gotcha='5.99 kWh/kg 是特定理想边界的总输入，不是全链路耗电。将常温自由能电功除以理论电量，也不能当作 960 °C 槽的可逆电压。实际 DC、AC 槽区、从矿到金属的能耗和历史地区基准应分别说明。';
node('can-alloy-split').mechanism='典型罐身使用 3004/3104 类铝锰系合金，罐盖常见 5182 类铝镁系合金；其状态、厚度和批次成分还要看供应规格。罐身材料兼顾高速成形，盖材需要较高屈服强度和合适的刻痕、卷封性能。';
node('can-alloy-split').gotcha='“更强”通常指抗塑性变形能力，不是弹性模量明显提高。不同铝合金的弹性模量通常接近；盖板的结构刚度还受厚度、曲率和筋控制。典型牌号也不是全行业唯一配方。';
node('end-stiffness').mechanism='盖材常用镁系合金与冷作状态获得较高强度，但结构刚度还来自厚度、环筋和沉孔等几何。刻痕又需要局部可控断裂；材料、盖形、涂层与加工状态必须一起选择。';
node('end-stiffness').gotcha='硬度、屈服强度和刚度不是同一件事。合金牌号可以改变强度，却不会像厚度的三次方那样大幅改变平板弹性弯曲刚度。真实压筋盖也不是这里的理想平板。';
node('shell-buckling-dome').equations[0].formula='σ_cr = E(t/R) / √[3(1−ν²)] ≈ 0.605 E(t/R)';
node('shell-buckling-dome').equations[0].scope+='；0.605 系数采用 ν≈0.30。';
node('recycling-sort-remelt').equations=[{formula:'m(可铸金属) = η_melt × m(进炉料)',terms:'η_melt：从所定义进料到可用金属的收得率；轧成片还会有修边等损失。',scope:'边界须说明进料是否已经去涂层、除潮。不是固定收得率，也不是直接得到同样质量的成品罐片。'}];
node('recycling-sort-remelt').why='回收的铝已经处于金属态，重熔可绕过“从氧化铝还原”的电解段；仍要付出分选、去涂层、熔化和再加工的能量。混合牌号还需校正成分。';
node('internal-pressure-hoop-stress').simulator='stress';
node('stress').simulator='stress';
node('bauxite-ore').frontier='下一枝：岩石中的铝怎样经风化、淋滤和地质时间富集成矿？硅为什么会增加拜耳法的碱耗？';
node('internal-coating-barrier').frontier='下一枝：聚合物怎样交联固化？扩散系数、针孔与附着力，谁决定一层涂膜的失效？';
node('recycling-sort-remelt').frontier='下一枝：涡电流分选为什么能抛出铝？混入镁、铁和硅后，怎样做成分校正？';
node('neck-flange-double-seam').frontier='下一枝：卷封为什么有时看似紧密却漏气？弹性回复、垫胶流动与公差怎样共同起作用？';

// 把“工艺→解释”方向统一，避免阅读时来回绕。
for(const e of data.edges) {
  if((e.from==='carbon-anode-reaction'&&e.to==='hall-heroult-cell')||(e.from==='faraday-charge'&&e.to==='hall-heroult-cell')||(e.from==='thermo-voltage'&&e.to==='carbon-anode-reaction')||(e.from==='cold-work-dislocations'&&e.to==='draw-redraw-ironing')||(e.from==='oxide-passivation-pitting'&&e.to==='internal-coating-barrier')) [e.from,e.to]=[e.to,e.from];
}
data.edges=data.edges.filter(e=>!(e.from==='internal-coating-barrier'&&e.to==='neck-flange-double-seam'));
const edge=(from,to,label,kind='explains')=>data.edges.push({from,to,label,kind});
data.nodes.unshift({id:'can',title:'易拉罐',subtitle:'铝制两片饮料罐 · 今天的观察入口',category:'object',layer:0,question:'一只这么轻、这么薄的容器，怎样装住有压力的饮料？',mechanism:'这类罐通常有一体成形的罐身和独立罐盖。罐身从合金卷材拉深并压薄，罐盖通过双卷封固定。天然氧化层与内涂层保护界面；强度、几何和密封一起完成任务。',why:'一只罐同时需要合金、塑性成形、薄壳力学、表面化学和材料循环。它们又共享电子、能量和守恒等基础。',equations:[],example:'自设罐中铝元素质量 13.0 g、槽压 4.2 V、电流效率 95%。仅追踪原生铝电解时，理论电量约 38.7 Ah，实际约 40.8 Ah，输入约 171 Wh；不含矿山、精炼、制罐及辅机。若材料来自回收，则会走另一条来源路径。',gotcha:'本册以典型铝制两片饮料罐为入口。钢罐、三片罐、不同容量与厂商设计会有不同路线；这不是一只实物罐的完整检测报告。',sourceIds:['aa-can-lca','ball-plant','f-mole'],frontier:'你也可以换一个入口：圆珠笔、玻璃、肥皂、锂电池。它们会在化学键、扩散、能量和数学处相遇。'});
edge('can','can-alloy-split','罐身与盖的材料','requires');
edge('can','neck-flange-double-seam','把盖锁紧并密封','requires');
edge('can','internal-coating-barrier','隔开饮料与金属','requires');
edge('can','internal-pressure-hoop-stress','侧壁如何承受压差');
edge('can','recycling-sort-remelt','另一条金属来源','requires');
edge('can-alloy-split','hall-heroult-cell','原生铝从哪里来','requires');
edge('can-alloy-split','cold-work-dislocations','状态与硬化历史');
edge('can-alloy-split','phase','成分如何变成组织');
edge('neck-flange-double-seam','internal-coating-barrier','垫胶与界面阻隔','requires');
edge('internal-coating-barrier','diffusion','涂层怎样阻隔迁移');
edge('oxide-passivation-pitting','bonds','稳定氧化层与能量');
edge('oxide-passivation-pitting','amphoteric','酸碱为何破坏氧化层');
edge('hall-heroult-cell','thermo-voltage','外加电功为何必要');
edge('hall-heroult-cell','smelting-energy','运行电耗花在哪里');
edge('internal-pressure-hoop-stress','shell-buckling-dome','压缩与屈曲换一种机制');
// 移除反向概念联想，保留向更深解释的链接。
data.edges=data.edges.filter(e=>!(e.from==='shell-buckling-dome'&&e.to==='internal-pressure-hoop-stress'));
// 科学解释不是工厂必须先掌握的生产资源。
const foundations=new Set(['atoms-electrons','bonds','moles','charge','entropy','free-energy','phase','stress','diffusion','crystal','calculus','amphoteric','equilibrium']);
data.edges.forEach(e=>{if(foundations.has(e.to))e.kind='explains';});
const generator=data.edges.find(e=>e.from==='electric-power'&&e.to==='electromagnetism');
generator.kind='explains';generator.label='一种发电机制';
data.edges.find(e=>e.from==='smelting-energy'&&e.to==='electric-power').kind='explains';
data.routes=[
  {id:'ore',title:'铝从矿石怎样来？',nodes:['can','can-alloy-split','hall-heroult-cell','cryolite-electrolyte','alumina-calcination','bayer-precipitation','bayer-clarification','bayer-digestion','bauxite-ore'],steps:['手边的物件','需要罐材','先制出原生铝','氧化铝溶入熔盐','无水氧化铝从哪来','先得到氢氧化铝','液体与残渣分开','碱液把铝带走','矿石是混合矿物']},
  {id:'why',title:'铝为什么难冶炼？',nodes:['can','can-alloy-split','hall-heroult-cell','thermo-voltage','free-energy','entropy'],steps:['从一只罐开始','合金需要铝','氧化铝要电解','至少需要多少功','方向由自由能判断','把能量接到微观统计']},
  {id:'thin',title:'这么薄，为什么不破？',nodes:['can','internal-pressure-hoop-stress','stress','bonds','atoms-electrons'],steps:['一个带压容器','压力变成膜应力','力与变形如何相关','弹性从原子相互作用来','电子量子态的入口']},
  {id:'again',title:'喝完之后的捷径',nodes:['can','recycling-sort-remelt','phase','free-energy','bonds','atoms-electrons'],steps:['换一条材料来源','分选去涂层再熔化','熔化改变材料的相','平衡取决于自由能','比较微观能量','电子与原子状态']}
];
const ids=new Set(data.nodes.map(n=>n.id));
const sourceIds=new Set(data.sources.map(s=>s.id));
const missing=data.edges.filter(e=>!ids.has(e.from)||!ids.has(e.to));
const missingSources=data.nodes.flatMap(n=>n.sourceIds.filter(id=>!sourceIds.has(id)).map(id=>`${n.id}:${id}`));
if(missing.length||missingSources.length) throw new Error(JSON.stringify({missing,missingSources}));
fs.writeFileSync(path.join(root,'kb.json'),JSON.stringify(data,null,2)+'\n');
require(path.join(root,'build.js'));

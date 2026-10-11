// Optional browser smoke test against the already-running localhost preview.
// Uses Chrome's local CDP endpoint and Node 22+'s built-in WebSocket, no packages.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const endpoint = process.env.CDP_URL || 'http://127.0.0.1:9222';
(async()=>{
 const targets=await (await fetch(endpoint+'/json/list')).json();
 const target=targets.find(t=>t.type==='page'&&t.url.includes('localhost:5173'));
 assert(target,'Open http://localhost:5173/ in the workspace browser first');
 const ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 let seq=0;const pending=new Map(),errors=[];
 ws.addEventListener('message',event=>{
  const m=JSON.parse(event.data);
  if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p?.reject(m.error):p?.resolve(m.result);}
  if(m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text+': '+(m.params.exceptionDetails.exception?.description||''));
 });
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{
  const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;
 };
 await call('Runtime.enable');await call('Page.enable');
 const loaded=new Promise(resolve=>{const h=e=>{if(JSON.parse(e.data).method==='Page.loadEventFired'){ws.removeEventListener('message',h);resolve();}};ws.addEventListener('message',h);});
 await call('Page.navigate',{url:'http://localhost:5173/'});await loaded;
 const catalogue=await evaluate(`(async()=>{
 const frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const results=[];document.querySelector('[data-stage="all"]').click();await frames();
 for(const n of TECH_TREE.nodes){
  document.querySelector('[data-node="'+n.id+'"]').click();await frames();
  if(document.querySelector('#detail h2').textContent!==n.title)throw Error('Detail mismatch '+n.id);
  if(document.querySelectorAll('.discovery-card li').length!==5)throw Error('Missing learning cycle '+n.id);
  if(document.querySelector('.katex-error'))throw Error('Math error '+n.id);
  results.push(n.id);
 }
 for(const e of TECH_TREE.edges.filter(e=>e.kind==='enables')){
  const a=document.querySelector('[data-node="'+e.from+'"]'),b=document.querySelector('[data-node="'+e.to+'"]');
  if(parseFloat(a.style.left)>=parseFloat(b.style.left))throw Error('Not rightwards '+e.from+' → '+e.to);
 }
 for(const b of document.querySelectorAll('#stage-nav button')){b.click();await frames();if(!Number.isFinite(parseFloat(document.querySelector('#zoom-value').textContent)))throw Error('Bad camera');}
 return {nodes:results.length, stages:TECH_TREE.stages.length, horizontalOrder:true, math:true};
})()`);
 const interactions=await evaluate(`(async()=>{
 const frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const click=s=>document.querySelector(s).click();
 for(const b of document.querySelectorAll('[data-route]')){b.click();await frames();if(!document.querySelector('.route-edge'))throw Error('No route highlight');}
 click('#atlas-view');click('#toggle-explanations');await frames();if(!document.querySelector('.edge.explains'))throw Error('No explanations');click('#toggle-explanations');
 document.querySelector('[data-node="observation-test"]').click();click('[data-verify]');if(document.querySelector('[data-verify]').getAttribute('aria-pressed')!=='true')throw Error('No verification mark');click('[data-verify]');
 document.querySelector('[data-node="can"]').click();await frames();if(!document.querySelector('[data-calculator="electrolysis"]'))throw Error('Missing original calculator');
 document.querySelector('#mass').value='20';document.querySelector('#mass').dispatchEvent(new Event('input',{bubbles:true}));if(!document.querySelector('#calc-charge').textContent.includes('62.7'))throw Error('Calculator mismatch');
 const search=document.querySelector('#search');search.value='晶体管';search.dispatchEvent(new Event('input',{bubbles:true}));if(document.querySelector('#search-results').hidden)throw Error('Search missing');document.querySelector('#search-results button').click();await frames();
 click('#focus-view');await frames();if(document.querySelectorAll('.graph-node').length<3)throw Error('Local graph missing');click('#atlas-view');
 return {routes:TECH_TREE.routes.length, explanationToggle:true, progress:true, preservedCalculator:true, search:true, localView:true};
})()`);
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 const mobile=await evaluate(`(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));document.querySelector('[data-stage="0"]').click();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return {width:innerWidth,pageWidth:document.documentElement.scrollWidth,graphWidth:document.querySelector('#graph').clientWidth,detail:document.querySelector('#detail h2').textContent};})()`);
 assert(mobile.pageWidth<=mobile.width+1,'Mobile page has horizontal overflow');assert(mobile.graphWidth>=300,'Mobile graph too small');
 const mobileImage=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.mkdirSync('screenshots',{recursive:true});fs.writeFileSync('screenshots/discovery-mobile.png',Buffer.from(mobileImage.data,'base64'));
 await call('Emulation.clearDeviceMetricsOverride');
 await evaluate(`document.querySelector('#atlas-view').click();document.querySelector('[data-stage="all"]').click();`);
 const desktopImage=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync('screenshots/discovery-desktop.png',Buffer.from(desktopImage.data,'base64'));
 assert.equal(errors.length,0,errors.join('\n'));
 console.log(JSON.stringify({catalogue,interactions,mobile,pageErrors:errors},null,2));
 ws.close();
})().catch(e=>{console.error(e);process.exit(1);});

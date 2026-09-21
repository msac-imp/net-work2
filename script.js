const devicesEl=document.querySelector('#devices');
const svg=document.querySelector('#links');
const canvas=document.querySelector('#canvas');
const statusEl=document.querySelector('#status');
const fromSelect=document.querySelector('#fromSelect');
const toSelect=document.querySelector('#toSelect');
const routeChips=document.querySelector('#routeChips');
let devices=[],links=[],selected=null,count=0,connectMode=true,currentSide='home',animating=false;

const info={
  pc:{icon:'💻',name:'PC',cls:'pc'},phone:{icon:'📱',name:'スマホ',cls:'phone'},
  hub:{icon:'🔀',name:'ハブ',cls:'hub'},ap:{icon:'📡',name:'アクセスポイント',cls:'ap'},
  router:{icon:'📦',name:'ルータ',cls:'router'},wan:{icon:'☁',name:'WAN',cls:'wan'}
};
const roleInfo={
  hub:['🔀','ハブ（スイッチ）','同じLAN内の複数の有線機器をつなぐ「分岐点」です。LANの外へ出るための機器ではありません。'],
  ap:['📡','アクセスポイント（AP）','スマホなどのWi-Fi端末を有線LANへ橋渡しします。APだけで別のLANへ移動することはできません。'],
  router:['📦','ルータ','LANとWANなど異なるネットワークの間で、データの行き先を判断して中継します。LANの「出入口」として働きます。'],
  wan:['☁','WAN（広域ネットワーク）','離れた場所にあるLAN同士を結ぶネットワークです。インターネットは世界規模のネットワークの代表例です。']
};

function areaLabel(side){return side==='home'?'家庭':'学校'}
function addDevice(type){
  count++; const id='d'+count; const w=canvas.clientWidth;
  const baseX=currentSide==='home'?25:w*.66;
  const slot=devices.filter(d=>d.side===currentSide).length;
  const x=baseX+(slot%3)*105, y=70+(Math.floor(slot/3)%3)*110;
  devices.push({id,type,side:currentSide,x:Math.min(x,w-105),y}); render();
}
function labelFor(d){
  if(d.type==='router')return 'LAN ⇄ WAN'; if(d.type==='ap')return 'Wi-Fi ⇄ LAN';
  if(d.type==='hub')return 'LAN内を接続'; return d.type==='phone'?'Wi-Fi端末':'有線端末';
}
function render(){
  devicesEl.innerHTML='';
  devices.forEach(d=>{
    const n=document.createElement('div'); n.className=`node ${info[d.type].cls} ${d.side}`+(selected===d.id?' selected':'');
    n.dataset.id=d.id; n.dataset.area=areaLabel(d.side); n.style.left=d.x+'px'; n.style.top=d.y+'px';
    n.innerHTML=`<div class="icon">${info[d.type].icon}</div><b>${info[d.type].name}</b><small>${labelFor(d)}</small>`;
    n.onclick=e=>{e.stopPropagation();nodeClick(d.id); if(['hub','ap','router'].includes(d.type))showRole(d.type)};
    makeDraggable(n,d); devicesEl.appendChild(n);
  });
  drawLinks(); updateSelects();
}
function nodeClick(id){
  if(animating)return; if(!connectMode)return;
  if(!selected){selected=id;render();return} if(selected===id){selected=null;render();return}
  toggleLink(selected,id); selected=null; render();
}
function toggleLink(a,b){
  const i=links.findIndex(l=>(l.a===a&&l.b===b)||(l.a===b&&l.b===a));
  if(i>=0)links.splice(i,1); else links.push({a,b});
}
function getDevice(id){return devices.find(d=>d.id===id)}
function typeOf(id){return id==='wan'?'wan':getDevice(id)?.type}
function sideOf(id){return id==='wan'?'wan':getDevice(id)?.side}
function point(id){
  const cr=canvas.getBoundingClientRect(); const el=id==='wan'?document.querySelector('#wanCloud'):document.querySelector(`[data-id="${id}"]`);
  const r=el.getBoundingClientRect(); return{x:r.left-cr.left+r.width/2,y:r.top-cr.top+r.height/2};
}
function drawLinks(){
  svg.innerHTML=''; links.forEach((l,i)=>{
    const a=point(l.a),b=point(l.b),line=document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',a.x);line.setAttribute('y1',a.y);line.setAttribute('x2',b.x);line.setAttribute('y2',b.y);line.dataset.index=i;line.classList.add('link');
    if(typeOf(l.a)==='phone'||typeOf(l.b)==='phone')line.classList.add('wifi');
    line.style.pointerEvents='stroke'; line.onclick=()=>{if(!animating){links.splice(i,1);render()}}; svg.appendChild(line);
  });
}
function makeDraggable(el,d){
  let sx,sy,ox,oy,moved=false;
  el.onpointerdown=e=>{if(e.button!==0||animating)return;sx=e.clientX;sy=e.clientY;ox=d.x;oy=d.y;moved=false;el.setPointerCapture(e.pointerId)};
  el.onpointermove=e=>{if(!el.hasPointerCapture(e.pointerId))return;const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;if(moved){
    const minX=d.side==='home'?0:canvas.clientWidth*.615,maxX=d.side==='home'?canvas.clientWidth*.39-102:canvas.clientWidth-102;
    d.x=Math.max(minX,Math.min(maxX,ox+dx));d.y=Math.max(48,Math.min(canvas.clientHeight-80,oy+dy));el.style.left=d.x+'px';el.style.top=d.y+'px';drawLinks();}}
  el.onpointerup=e=>{if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);if(moved)e.stopPropagation()};
}
function updateSelects(){
  const oldFrom=fromSelect.value,oldTo=toSelect.value; const terminals=devices.filter(d=>['pc','phone'].includes(d.type));
  fromSelect.innerHTML='<option value="">端末を選択</option>';toSelect.innerHTML='<option value="">端末を選択</option>';
  terminals.forEach(d=>{const text=`${areaLabel(d.side)}：${info[d.type].name} ${d.id.slice(1)}`;fromSelect.add(new Option(text,d.id));toSelect.add(new Option(text,d.id))});
  if(terminals.some(d=>d.id===oldFrom))fromSelect.value=oldFrom;if(terminals.some(d=>d.id===oldTo))toSelect.value=oldTo;
}
function neighbors(id){return links.filter(l=>l.a===id||l.b===id).map(l=>l.a===id?l.b:l.a)}
function validEdge(a,b){
  const A=typeOf(a),B=typeOf(b),sa=sideOf(a),sb=sideOf(b); const pair=[A,B].sort().join('-');
  if(A==='wan'||B==='wan')return pair==='router-wan';
  if(sa!==sb)return false;
  if(A==='phone'||B==='phone')return pair==='ap-phone';
  return ['hub-pc','hub-router','ap-hub','ap-router','hub-hub','pc-router'].includes(pair);
}
function findPath(start,end){
  const q=[[start]],seen=new Set([start]); while(q.length){const p=q.shift(),n=p[p.length-1];if(n===end)return p;for(const x of neighbors(n)){if(!seen.has(x)&&validEdge(n,x)){seen.add(x);q.push([...p,x])}}} return null;
}
function reachable(start){const seen=new Set([start]),q=[start];while(q.length){const n=q.shift();for(const x of neighbors(n)){if(!seen.has(x)&&validEdge(n,x)){seen.add(x);q.push(x)}}}return seen}
function explainFailure(start,end){
  const S=getDevice(start),E=getDevice(end); if(!S||!E)return '端末を選択してください。';
  if(start===end)return '送信元と送信先が同じ端末です。別の端末を選んでください。';
  if(S.type==='phone'&&!neighbors(start).some(x=>typeOf(x)==='ap'))return '送信元のスマホがアクセスポイントにつながっていません。Wi-Fi端末はAPを通してLANに参加します。';
  if(E.type==='phone'&&!neighbors(end).some(x=>typeOf(x)==='ap'))return '送信先のスマホがアクセスポイントにつながっていません。';
  if(S.side!==E.side){
    const sr=devices.filter(d=>d.side===S.side&&d.type==='router'),er=devices.filter(d=>d.side===E.side&&d.type==='router');
    if(!sr.length)return `${areaLabel(S.side)}LANにルータがありません。別のLANへ出るにはルータが必要です。`;
    if(!er.length)return `${areaLabel(E.side)}LANにルータがありません。WANから相手のLANへ入るためにもルータが必要です。`;
    if(!sr.some(r=>neighbors(r.id).includes('wan')))return `${areaLabel(S.side)}LANのルータがWANにつながっていません。`;
    if(!er.some(r=>neighbors(r.id).includes('wan')))return `${areaLabel(E.side)}LANのルータがWANにつながっていません。`;
  }
  return '通信経路が途中で切れているか、機器の役割に合わない接続があります。どの機器までつながっているか確認してみよう。';
}
function nodeName(id){if(id==='wan')return 'WAN';const d=getDevice(id);return d?info[d.type].name:''}
function showRoute(path){
  routeChips.innerHTML=''; path.forEach((id,i)=>{const c=document.createElement('span');c.className='chip'+(id==='wan'?' wan':'');c.textContent=nodeName(id);routeChips.appendChild(c);if(i<path.length-1){const a=document.createElement('span');a.className='chip-arrow';a.textContent='→';routeChips.appendChild(a)}})
}
function showFailedReach(start){
  const r=reachable(start); const names=[...r].map(nodeName); routeChips.innerHTML=`<i>到達できる範囲：${names.join(' → ')||'なし'}</i>`;
}
function flowStepFor(a,b,path){
  if(a==='wan'||b==='wan')return 3; const A=getDevice(a),B=getDevice(b); if(!A||!B)return 0;
  if(A.type==='router'&&B.side!==getDevice(path[0])?.side)return 4;
  if(B.type==='router'&&A.side===getDevice(path[0])?.side)return 2;
  if(A.side===getDevice(path[0])?.side)return path.indexOf(a)===0?0:1; return 4;
}
async function animate(path){
  animating=true;document.querySelectorAll('#flowSteps p').forEach(p=>p.classList.remove('on'));
  for(let i=0;i<path.length-1;i++){
    const li=links.findIndex(x=>(x.a===path[i]&&x.b===path[i+1])||(x.b===path[i]&&x.a===path[i+1]));
    if(li<0)continue; const line=svg.querySelector(`[data-index="${li}"]`);line?.classList.add('active');
    const step=flowStepFor(path[i],path[i+1],path);document.querySelector(`#flowSteps [data-step="${step}"]`)?.classList.add('on');
    const a=point(path[i]),b=point(path[i+1]);const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('r','7');dot.classList.add('packet-dot');svg.appendChild(dot);
    for(let s=0;s<=24;s++){dot.setAttribute('cx',a.x+(b.x-a.x)*s/24);dot.setAttribute('cy',a.y+(b.y-a.y)*s/24);await new Promise(r=>setTimeout(r,20))}dot.remove();
  }
  document.querySelector('#flowSteps [data-step="4"]')?.classList.add('on');animating=false;
}
function showRole(type){
  const r=roleInfo[type]; if(!r)return;document.querySelector('#roleDetail').innerHTML=`<span class="big-icon">${r[0]}</span><div><b>${r[1]}</b><p>${r[2]}</p></div>`;
  document.querySelectorAll('.role-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.role===type));
}

document.querySelectorAll('.side').forEach(b=>b.onclick=()=>{currentSide=b.dataset.side;document.querySelectorAll('.side').forEach(x=>x.classList.toggle('active',x===b))});
document.querySelectorAll('.device-btn').forEach(b=>b.onclick=()=>addDevice(b.dataset.type));
document.querySelector('#wanCloud').onclick=()=>{nodeClick('wan');showRole('wan')};
document.querySelectorAll('.role-tabs button').forEach(b=>b.onclick=()=>showRole(b.dataset.role));
document.querySelector('#connectMode').onclick=e=>{connectMode=!connectMode;e.currentTarget.textContent=`🔗 接続モード：${connectMode?'ON':'OFF'}`;e.currentTarget.classList.toggle('off',!connectMode);selected=null;render()};
document.querySelector('#sendBtn').onclick=async()=>{
  if(animating)return; const s=fromSelect.value,t=toSelect.value;svg.querySelectorAll('.link').forEach(x=>x.classList.remove('active','failed'));
  if(!s||!t){statusEl.className='status error';statusEl.innerHTML='<b>通信できません：</b>送信元と送信先の端末を選んでください。';return}
  if(s===t){statusEl.className='status error';statusEl.innerHTML='<b>通信できません：</b>'+explainFailure(s,t);return}
  const path=findPath(s,t); if(path){showRoute(path);statusEl.className='status success';const crosses=path.includes('wan');statusEl.innerHTML=`<b>通信成功：</b>${crosses?'LAN → ルータ → WAN → ルータ → LAN とデータが移動します。':'同じLAN内でデータが送信先まで届きます。'}`;await animate(path)}
  else{showFailedReach(s);statusEl.className='status error';statusEl.innerHTML='<b>ここで通信が止まりました：</b>'+explainFailure(s,t)}
};
document.querySelector('#resetBtn').onclick=()=>{devices=[];links=[];selected=null;count=0;animating=false;statusEl.className='status neutral';statusEl.innerHTML='<b>準備中：</b>機器を配置して、家庭LANと学校LANをWANでつないでみよう。';routeChips.innerHTML='<i>まだ通信していません</i>';document.querySelectorAll('#flowSteps p').forEach(p=>p.classList.remove('on'));render()};
window.addEventListener('resize',()=>{devices.forEach(d=>{if(d.side==='school')d.x=Math.max(canvas.clientWidth*.615,Math.min(canvas.clientWidth-102,d.x));else d.x=Math.min(canvas.clientWidth*.39-102,d.x)});render()});
render();

// ═══════════════════════════════════════
// Data & Constants
// ═══════════════════════════════════════
let CATS=[{id:"cafe",label:"카페",emoji:"☕"},{id:"food",label:"맛집",emoji:"🍽️"},{id:"park",label:"공원",emoji:"🌳"},{id:"shop",label:"쇼핑",emoji:"🛍️"},{id:"culture",label:"문화",emoji:"🎨"},{id:"transport",label:"교통",emoji:"🚇"},{id:"home",label:"집/숙소",emoji:"🏠"},{id:"etc",label:"기타",emoji:"📌"}];
const MOODS=["","😊","🥰","😋","🤩","😌","🥲","😤","🧐"];
const THEMES=["#C9686E","#6BA08F","#F0C060","#9B7ED8","#4F86C6","#F28C8C"];
const catById=id=>CATS.find(c=>c.id===id)||CATS[7];
const uid=(p="id")=>`${p}_${Math.random().toString(36).slice(2,8)}${Date.now().toString(36)}`;
const iso=()=>new Date().toISOString().slice(0,10);
const hasSharedStorage=!!(typeof window!=='undefined'&&window.storage&&typeof window.storage.set==='function');
const MY_CLIENT_ID=uid('cli');
const EMOJI_PICKS=["📍","☕","🍽️","🌳","🛍️","🎨","🚇","🏠","📌","🏥","🎵","📚","🏋️","🐾","🌊","⛰️","🎮","🍺","🧁","💼","✈️","⛪","🏟️","🔥","💡","🎭","🛒","🏖️","🚗","🌸"];

let maps=[
  {id:"m1",kind:"my",title:"성수동 탐험",desc:"성수 일대 나만의 장소들",theme:"#C9686E",ver:1},
  {id:"m2",kind:"our",title:"우리의 데이트맵",desc:"함께한 장소 기록",theme:"#6BA08F",ver:1}
];
let features=[
  {id:"f1",mapId:"m1",type:"pin",title:"블루보틀 성수",category:"cafe",tags:["커피","디저트"],emoji:"☕",isHl:true,geojson:{type:"Feature",geometry:{type:"Point",coordinates:[127.056,37.544]},properties:{}},logs:[{id:"l1",date:iso(),note:"오트밀크 라떼가 최고!",mood:"😋"}]},
  {id:"f2",mapId:"m1",type:"pin",title:"서울숲",category:"park",tags:["산책"],emoji:"🌳",isHl:false,geojson:{type:"Feature",geometry:{type:"Point",coordinates:[127.038,37.544]},properties:{}},logs:[]},
  {id:"f3",mapId:"m1",type:"line",title:"성수→뚝섬 산책로",category:"etc",tags:["산책"],emoji:"🚶",isHl:false,geojson:{type:"Feature",geometry:{type:"LineString",coordinates:[[127.044,37.543],[127.048,37.540],[127.052,37.536]]},properties:{}},logs:[]},
  {id:"f5",mapId:"m2",type:"pin",title:"우리 첫 만남 장소",category:"etc",tags:["추억"],emoji:"💕",isHl:true,geojson:{type:"Feature",geometry:{type:"Point",coordinates:[126.978,37.566]},properties:{}},logs:[{id:"l5",date:"2026-02-14",note:"1주년 기념 재방문!",mood:"🥰"}]}
];
let activeMapId="m1";
let roles={};// {mapId:'owner'|'editor'|'observer'}
let syncVersions={};// {mapId: version}
let onlineUsers={};// {mapId: [{id,role,ts},...]}
let selectedId=null,drawMode=null,draftPts=[],filterCats=[],currentTab="map";
let syncTimer=null,isPulling=false;

// ═══════════════════════════════════════
// Persistence (localStorage)
// ═══════════════════════════════════════
function loadData(){
  try{
    const s=localStorage.getItem('loca_v2');
    if(s){
      const p=JSON.parse(s);
      if(p.maps?.length){
        maps=p.maps;
        features=p.features||[];
        CATS=p.cats||CATS;
        activeMapId=p.activeMapId||maps[0].id;
        roles=p.roles||{};
      }
    }
  }catch(e){}
}
function save(){
  try{localStorage.setItem('loca_v2',JSON.stringify({maps,features,cats:CATS,activeMapId,roles}))}catch(e){}
  if(!isPulling){
    const am=getActiveMap();
    if(am?.kind==='our'&&canEdit())pushShared(am.id)
  }
}

// ═══════════════════════════════════════
// Role & Permission System
// ═══════════════════════════════════════
function getRole(mapId){return roles[mapId]||null}
function canEdit(){
  const am=getActiveMap();
  if(!am)return false;
  if(am.kind==='my')return true;
  const r=getRole(am.id);
  return r==='owner'||r==='editor'
}
function isObserver(){
  const am=getActiveMap();
  if(!am||am.kind==='my')return false;
  return getRole(am.id)==='observer'
}
function roleLabelKo(r){return r==='owner'?'👑 소유자':r==='editor'?'✏️ 편집자':r==='observer'?'👁 관찰자':''}
function roleBadgeHtml(r){
  const cls=r==='owner'?'role-owner':r==='editor'?'role-editor':'role-observer';
  return`<span class="role-badge ${cls}">${roleLabelKo(r)}</span>`
}

function applyPermissionUI(){
  const obs=isObserver();
  document.querySelectorAll('.editor-only').forEach(el=>{el.style.display=obs?'none':'flex'});
  document.getElementById('observer-map-banner').style.display=obs?'block':'none';
  document.getElementById('btn-rename').style.display=obs?'none':'flex';
  const am=getActiveMap();
  const si=document.getElementById('sync-indicator');
  if(am?.kind==='our'){si.style.display='flex';si.innerHTML='<div class="sync-dot sync-active"></div>'}else{si.style.display='none'}
  const sr=document.getElementById('stats-role');
  if(am?.kind==='our'){sr.style.display='block';const r=getRole(am.id);sr.innerHTML=roleBadgeHtml(r||'owner')}else{sr.style.display='none'}
}

// ═══════════════════════════════════════
// Shared Storage Sync (Real-time)
// ═══════════════════════════════════════
async function pushShared(mapId){
  if(!hasSharedStorage)return;
  try{
    const m=maps.find(x=>x.id===mapId);if(!m)return;
    const fs=features.filter(f=>f.mapId===mapId);
    const ver=(syncVersions[mapId]||0)+1;syncVersions[mapId]=ver;
    await window.storage.set('loca-map-'+mapId,JSON.stringify({map:m,features:fs,cats:CATS,ver,ts:Date.now()}),true);
  }catch(e){console.log('Push failed',e);setSyncStatus('error')}
}

async function pullShared(mapId){
  if(!hasSharedStorage)return false;
  try{
    const res=await window.storage.get('loca-map-'+mapId,true);
    if(!res)return false;
    const d=JSON.parse(res.value);
    if(d.ver<=(syncVersions[mapId]||0))return false;
    isPulling=true;
    syncVersions[mapId]=d.ver;
    const mIdx=maps.findIndex(x=>x.id===mapId);
    if(mIdx>=0)maps[mIdx]={...d.map,kind:'our'};
    else maps.push({...d.map,kind:'our'});
    features=features.filter(f=>f.mapId!==mapId).concat(d.features||[]);
    if(d.cats){
      const cMap=new Map(CATS.map(c=>[c.id,c]));
      d.cats.forEach(c=>{if(!cMap.has(c.id))cMap.set(c.id,c)});
      CATS=Array.from(cMap.values())
    }
    try{localStorage.setItem('loca_v2',JSON.stringify({maps,features,cats:CATS,activeMapId,roles}))}catch(e){}
    isPulling=false;
    return true;
  }catch(e){isPulling=false;console.log('Pull failed',e);return false}
}

async function updatePresence(mapId){
  if(!hasSharedStorage)return;
  try{
    let list=[];
    try{
      const res=await window.storage.get('loca-pres-'+mapId,true);
      if(res)list=JSON.parse(res.value)
    }catch(e){list=[]}
    const now=Date.now();
    list=list.filter(u=>u.id!==MY_CLIENT_ID&&(now-u.ts)<15000);
    list.push({id:MY_CLIENT_ID,role:getRole(mapId)||'owner',ts:now});
    await window.storage.set('loca-pres-'+mapId,JSON.stringify(list),true);
    onlineUsers[mapId]=list;
    renderPresence(mapId);
  }catch(e){}
}

function renderPresence(mapId){
  const el=document.getElementById('stats-presence');
  const list=onlineUsers[mapId]||[];
  if(list.length<=1){el.style.display='none';return}
  el.style.display='flex';
  el.innerHTML='<span style="font-size:9px;font-weight:900;color:var(--mut)">접속 중 '+list.length+'명</span> '+
    list.slice(0,8).map(u=>{
      const c=u.role==='observer'?'#6366F1':u.role==='editor'?'var(--sec)':'#D4960A';
      const icon=u.role==='observer'?'👁':u.role==='editor'?'✏️':'👑';
      const me=u.id===MY_CLIENT_ID?' (나)':'';
      return`<span class="presence-chip" style="border-color:${c}">${icon}${me}</span>`
    }).join('');
}

function setSyncStatus(s){
  const dot=document.querySelector('#sync-indicator .sync-dot');
  if(!dot)return;
  dot.className='sync-dot '+(s==='active'?'sync-active':s==='error'?'sync-error':'sync-idle');
}

function startSync(){
  stopSync();
  syncTimer=setInterval(async()=>{
    const am=getActiveMap();if(!am||am.kind!=='our')return;
    const changed=await pullShared(am.id);
    if(changed&&activeMapId===am.id){renderMapFeatures();updateStats()}
    await updatePresence(am.id);
    setSyncStatus('active');
  },3000);
  // 즉시 한번 실행
  const am=getActiveMap();
  if(am?.kind==='our'){pullShared(am.id).then(c=>{if(c){renderMapFeatures();updateStats()}});updatePresence(am.id)}
}
function stopSync(){if(syncTimer){clearInterval(syncTimer);syncTimer=null}}

// ═══════════════════════════════════════
// Share Code System (Role-based)
// ═══════════════════════════════════════
function generateShareCode(mapId,role){
  if(hasSharedStorage){
    return btoa(unescape(encodeURIComponent(JSON.stringify({mid:mapId,r:role}))))
  }else{
    const m=maps.find(x=>x.id===mapId);
    const fs=features.filter(f=>f.mapId===mapId);
    return btoa(unescape(encodeURIComponent(JSON.stringify({map:m,features:fs,r:role}))))
  }
}

async function importShareCodeAsync(){
  const code=(document.getElementById('share-input')?.value||'').trim();
  if(!code){toast('코드가 비어있어요','w');return}
  try{
    const d=JSON.parse(decodeURIComponent(escape(atob(code))));
    const role=d.r||'observer';
    if(d.mid&&hasSharedStorage){
      // 경량 코드: 서버에서 가져오기
      const ok=await pullShared(d.mid);
      if(!ok){
        // 아직 데이터가 없을 수 있음 — 일단 등록
        const existing=maps.find(m=>m.id===d.mid);
        if(!existing){toast('공유 데이터를 아직 찾을 수 없어요. 소유자가 먼저 데이터를 업로드해야 합니다.','w');return}
      }
      roles[d.mid]=role;activeMapId=d.mid;
      save();renderMapFeatures();fitToFeatures();updateStats();applyPermissionUI();startSync();
      toast(`${role==='editor'?'✏️ 편집자':'👁 관찰자'}로 참여했어요!`,'s');
    }else if(d.map&&d.features){
      // 전체 데이터 코드 (fallback)
      const m={...d.map,kind:'our'};
      if(!maps.find(x=>x.id===m.id))maps.push(m);
      d.features.forEach(f=>{if(!features.find(x=>x.id===f.id))features.push(f)});
      roles[m.id]=role;activeMapId=m.id;
      save();renderMapFeatures();fitToFeatures();updateStats();applyPermissionUI();
      if(hasSharedStorage)pushShared(m.id);
      startSync();
      toast(`${role==='editor'?'✏️ 편집자':'👁 관찰자'}로 참여했어요!`,'s');
    }else throw 0;
  }catch(e){console.error(e);toast('공유코드를 해석할 수 없어요','e')}
}

function copyCode(mapId,role){
  const code=generateShareCode(mapId,role);
  navigator.clipboard.writeText(code).then(()=>toast(`${role==='editor'?'✏️ 편집자':'👁 관찰자'} 코드를 복사했어요 ✅`,'s')).catch(()=>{
    // fallback: prompt
    prompt('아래 코드를 복사하세요:',code);
  });
}

// ═══════════════════════════════════════
// Map
// ═══════════════════════════════════════
let map,fg,dg,layerMap={};
function initMap(){
  map=L.map('map',{zoomControl:false,attributionControl:true,zoomSnap:.5});
  map.setView([37.544,127.048],14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OSM'}).addTo(map);
  L.control.zoom({position:'bottomright'}).addTo(map);
  fg=L.featureGroup().addTo(map);dg=L.featureGroup().addTo(map);
  map.on('click',function(e){
    if(!drawMode&&document.getElementById('mini-card').style.display==='block'){hideMiniCard();return}
    onMapClick(e)
  });
  setTimeout(()=>map.invalidateSize(),100);
}
function onMapClick(e){
  if(!drawMode||!activeMapId||isObserver())return;
  if(drawMode==='pin'){createPinAt(e.latlng);return}
  draftPts.push(e.latlng);
  renderDraft();
  document.getElementById('pts-count').textContent=draftPts.length
}
function getActiveMap(){return maps.find(m=>m.id===activeMapId)||null}
function getActiveFeatures(){return features.filter(f=>f.mapId===activeMapId)}
function getFiltered(){
  const q=(document.getElementById('list-search')?.value||'').trim().toLowerCase();
  return getActiveFeatures().filter(f=>{
    if(filterCats.length&&!filterCats.includes(f.category))return false;
    if(q&&!(f.title||'').toLowerCase().includes(q)&&!(f.tags||[]).some(t=>t.toLowerCase().includes(q)))return false;
    return true
  })
}
function countLogs(fs){return fs.reduce((a,f)=>a+(f.logs?.length||0),0)}

function renderMapFeatures(){
  fg.clearLayers();layerMap={};
  const am=getActiveMap(),theme=am?.theme||'#C9686E',obs=isObserver();
  getFiltered().forEach(f=>{
    const g=f.geojson?.geometry;
    if(!g)return;
    const sel=f.id===selectedId;

    if(g.type==='Point'){
      const ll=[g.coordinates[1],g.coordinates[0]],
        em=f.emoji||catById(f.category).emoji,
        sz=sel?42:f.isHl?38:34;

      const html=`<div style="width:${sz}px;height:${sz}px;border-radius:${sz/2.5}px;background:${sel?theme:'rgba(255,255,255,.96)'};border:2px solid ${sel?theme:f.isHl?'#F0C060':'rgba(0,0,0,.1)'};box-shadow:${sel?'0 8px 24px rgba(201,104,110,.35)':'0 6px 18px rgba(0,0,0,.11)'};display:flex;align-items:center;justify-content:center;font-size:${sel?20:17}px;transform:translateY(-8px)">${em}</div>`;
      const mk=L.marker(ll,{
        icon:L.divIcon({html,className:'',iconSize:[sz,sz],iconAnchor:[sz/2,sz]}),
        draggable:!obs
      });
      mk.on('click',e=>{e.originalEvent?.stopPropagation?.();selectFeature(f.id)});
      if(!obs)mk.on('dragend',e=>{
        const p=e.target.getLatLng();
        const idx=features.findIndex(x=>x.id===f.id);
        if(idx>=0){
          features[idx]={...features[idx],geojson:{type:"Feature",geometry:{type:"Point",coordinates:[p.lng,p.lat]},properties:{}}};
          save()
        }
      });
      mk.addTo(fg);
      layerMap[f.id]=mk
    }

    if(g.type==='LineString'){
      const lls=g.coordinates.map(c=>[c[1],c[0]]);
      const ln=L.polyline(lls,{color:theme,weight:sel?8:6,opacity:.9});
      ln.on('click',function(e){L.DomEvent.stop(e);selectFeature(f.id)});
      ln.addTo(fg);
      layerMap[f.id]=ln
    }

    if(g.type==='Polygon'){
      const ring=(g.coordinates?.[0]||[]).map(c=>[c[1],c[0]]);
      // ✅ FIX: fillOpacity 문법 오류 수정
      const pg=L.polygon(ring,{color:theme,weight:sel?4:2.5,opacity:.9,fillOpacity:(sel ? 0.25 : 0.18)});
      pg.on('click',function(e){L.DomEvent.stop(e);selectFeature(f.id)});
      pg.addTo(fg);
      layerMap[f.id]=pg
    }
  });
  updateStats();
  applyPermissionUI();
}
function renderDraft(){
  dg.clearLayers();
  if(!drawMode||drawMode==='pin'||!draftPts.length)return;
  const theme=getActiveMap()?.theme||'#C9686E',
    pts=draftPts.map(p=>[p.lat,p.lng]);
  if(drawMode==='line')
    L.polyline(pts,{color:theme,weight:5,dashArray:'8,10'}).addTo(dg);
  else
    L.polygon(pts,{color:theme,weight:2.5,dashArray:'8,10',fillOpacity:.14}).addTo(dg);
  pts.forEach(p=>L.circleMarker(p,{radius:5,color:theme,fillColor:'#fff',fillOpacity:1,weight:2}).addTo(dg))
}
function fitToFeatures(){
  const fs=getActiveFeatures();
  if(!fs.length)return;
  const lls=[];
  fs.forEach(f=>{
    const g=f.geojson?.geometry;
    if(!g)return;
    if(g.type==='Point')lls.push([g.coordinates[1],g.coordinates[0]]);
    if(g.type==='LineString')g.coordinates.forEach(c=>lls.push([c[1],c[0]]));
    if(g.type==='Polygon')(g.coordinates?.[0]||[]).forEach(c=>lls.push([c[1],c[0]]))
  });
  if(!lls.length)return;
  if(lls.length===1)map.setView(lls[0],15,{animate:true});
  else map.fitBounds(L.latLngBounds(lls),{padding:[40,40],maxZoom:16,animate:true})
}
function selectFeature(id){
  selectedId=id;
  renderMapFeatures();
  if(id){
    var f=features.find(x=>x.id===id);
    if(f)showMiniCard(f)
  }else hideMiniCard()
}

function showMiniCard(f){
  const el=document.getElementById('mini-card'),
    cat=catById(f.category),
    obs=isObserver();
  let logsText=f.logs?.length?f.logs[0].note:'';
  if(logsText.length>30)logsText=logsText.slice(0,30)+'…';
  const tagsText=(f.tags||[]).slice(0,3).map(t=>'#'+t).join(' ');
  const typeLabel=f.type==='pin'?'핀':f.type==='line'?'경로':'구역';
  el.innerHTML=`<div style="display:flex;align-items:center;gap:10px">
    <div style="width:44px;height:44px;border-radius:14px;background:${f.isHl?'var(--acc-lt)':'var(--bg)'};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${f.emoji||cat.emoji}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:14px;font-weight:900;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${f.title}${f.isHl?' ⭐':''}</div>
      <div style="font-size:10px;color:var(--mut);font-weight:700;margin-top:2px">${cat.label} · ${typeLabel}${tagsText?' · '+tagsText:''}</div>
      ${logsText?`<div style="font-size:11px;color:var(--txt2);font-weight:700;margin-top:3px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${f.logs[0].mood||''} ${logsText}</div>`:''}
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
      <button class="btn ${obs?'btn-out':'btn-pri'}" style="font-size:11px;padding:7px 12px" onclick="openDetailFromMini('${f.id}')">${obs?'보기':'수정'}</button>
      ${obs?'':'<button class="btn btn-danger" style="font-size:11px;padding:7px 10px" onclick="deleteFromMini(\''+f.id+'\')">삭제</button>'}
      <button class="btn btn-out" style="font-size:11px;padding:7px 10px" onclick="hideMiniCard()">닫기</button>
    </div></div>`;
  el.style.display='block';
  document.getElementById('filter-bar').style.display='none';
  document.getElementById('stats-pill').style.display='none';
}
function hideMiniCard(){
  document.getElementById('mini-card').style.display='none';
  document.getElementById('filter-bar').style.display='block';
  document.getElementById('stats-pill').style.display='block';
  selectedId=null;
  renderMapFeatures()
}
function openDetailFromMini(fid){
  document.getElementById('mini-card').style.display='none';
  const f=features.find(x=>x.id===fid);
  if(f){renderDetailSheet(f);openSheet('detail')}
}
function updateStats(){
  const am=getActiveMap(),ff=getFiltered();
  document.getElementById('stats-title').textContent=am?am.title:'지도 없음';
  document.getElementById('stats-sub').textContent=`📍 ${ff.length}개 · 📝 ${countLogs(ff)}개`;
  document.getElementById('map-dot').style.background=am?.theme||'#C9686E';
  document.getElementById('map-title-display').textContent=am?.title||'지도 선택'
}

var myLocMarker=null,myLocCircle=null;
function goToMyLocation(){
  if(!navigator.geolocation){toast('GPS 미지원','w');return}
  toast('위치 확인 중…','i');
  document.getElementById('fab-gps').classList.add('active');
  navigator.geolocation.getCurrentPosition(function(pos){
    var lat=pos.coords.latitude,lng=pos.coords.longitude,acc=pos.coords.accuracy;
    if(myLocMarker){map.removeLayer(myLocMarker)}
    if(myLocCircle){map.removeLayer(myLocCircle)}
    myLocCircle=L.circle([lat,lng],{radius:acc,color:'#4F86C6',fillColor:'#4F86C6',fillOpacity:0.1,weight:1}).addTo(map);
    myLocMarker=L.marker([lat,lng],{
      icon:L.divIcon({
        html:'<div style="width:18px;height:18px;border-radius:50%;background:#4F86C6;border:3px solid #fff;box-shadow:0 2px 8px rgba(79,134,198,.5);animation:gpsPulse 2s infinite"></div>',
        className:'',
        iconSize:[18,18],
        iconAnchor:[9,9]
      }),
      zIndexOffset:9999
    }).addTo(map);
    map.setView([lat,lng],16,{animate:true});
    document.getElementById('fab-gps').classList.remove('active');
    toast('📍 현재 위치','s')
  },function(){
    document.getElementById('fab-gps').classList.remove('active');
    toast('위치 확인 실패','w')
  },{enableHighAccuracy:true,timeout:10000})
}

// Draw Mode
function toggleDraw(mode){
  if(isObserver()){toast('관찰자는 편집할 수 없어요','w');return}
  if(drawMode===mode){cancelDraft();return}
  draftPts=[];dg.clearLayers();drawMode=mode;
  document.querySelectorAll('.fab').forEach(b=>b.classList.remove('active'));
  document.getElementById('fab-'+mode)?.classList.add('active');
  const pill=document.getElementById('draw-pill');
  pill.classList.add('on');
  pill.style.background=mode==='pin'?'var(--pri)':'var(--sec)';
  pill.textContent=mode==='pin'?'📍 탭해서 핀 추가':mode==='line'?'🔀 경로 점 추가':'⬡ 구역 점 추가';
  document.getElementById('draw-ctrl').classList.toggle('on',mode!=='pin');
  document.getElementById('pts-count').textContent='0';
  document.getElementById('map').classList.add('cursor-'+mode);
  toast(mode==='pin'?'지도를 탭하세요':'탭으로 점을 찍어 그려보세요','i')
}
function cancelDraft(){
  drawMode=null;draftPts=[];dg.clearLayers();
  document.querySelectorAll('.fab').forEach(b=>b.classList.remove('active'));
  document.getElementById('draw-pill').classList.remove('on');
  document.getElementById('draw-ctrl').classList.remove('on');
  document.getElementById('map').classList.remove('cursor-pin','cursor-line','cursor-poly')
}
function undoDraft(){draftPts.pop();renderDraft();document.getElementById('pts-count').textContent=draftPts.length}
function finishDraft(){
  if(drawMode==='line'){
    if(draftPts.length<2){toast('2개 이상 점 필요','w');return}
    const coords=draftPts.map(p=>[p.lng,p.lat]);
    const f={id:uid('f'),mapId:activeMapId,type:'line',title:'새 경로',category:'etc',tags:[],emoji:'🚶',isHl:false,geojson:{type:"Feature",geometry:{type:"LineString",coordinates:coords},properties:{}},logs:[]};
    features.unshift(f);save();cancelDraft();renderMapFeatures();selectedId=f.id;renderDetailSheet(f);openSheet('detail');toast('🔀 경로 생성','s')
  }else if(drawMode==='poly'){
    if(draftPts.length<3){toast('3개 이상 점 필요','w');return}
    const ring=draftPts.map(p=>[p.lng,p.lat]);ring.push([draftPts[0].lng,draftPts[0].lat]);
    const f={id:uid('f'),mapId:activeMapId,type:'poly',title:'새 구역',category:'etc',tags:[],emoji:'⬡',isHl:false,geojson:{type:"Feature",geometry:{type:"Polygon",coordinates:[ring]},properties:{}},logs:[]};
    features.unshift(f);save();cancelDraft();renderMapFeatures();selectedId=f.id;renderDetailSheet(f);openSheet('detail');toast('⬡ 구역 생성','s')
  }
}
function createPinAt(ll){
  if(isObserver())return;
  const f={id:uid('f'),mapId:activeMapId,type:'pin',title:'새 장소',category:CATS[0].id,tags:[],emoji:CATS[0].emoji,isHl:false,geojson:{type:"Feature",geometry:{type:"Point",coordinates:[ll.lng,ll.lat]},properties:{}},logs:[]};
  features.unshift(f);save();cancelDraft();renderMapFeatures();selectedId=f.id;renderDetailSheet(f);openSheet('detail');toast('📍 핀 추가','s')
}
function goToFeature(fid){
  var f=features.find(x=>x.id===fid);
  if(!f)return;
  switchTab('map');
  selectedId=fid;
  renderMapFeatures();
  var g=f.geojson?.geometry;
  if(!g)return;
  setTimeout(()=>{
    if(g.type==='Point')map.setView([g.coordinates[1],g.coordinates[0]],17,{animate:true});
    else{
      const lls=(g.type==='LineString'?g.coordinates:(g.coordinates[0]||[])).map(c=>[c[1],c[0]]);
      map.fitBounds(L.latLngBounds(lls),{padding:[50,50],maxZoom:17,animate:true})
    }
    showMiniCard(f)
  },100)
}

// Tabs
function switchTab(id){
  currentTab=id;
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+id)?.classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b=>{b.classList.toggle('on',b.dataset.tab===id)});
  document.getElementById('topbar').classList.toggle('solid',id!=='map');
  ['map-sel-btn','btn-rename','btn-newmy','btn-newour'].forEach(x=>{
    const el=document.getElementById(x);
    if(el)el.style.display=id==='map'?'flex':'none'
  });
  document.getElementById('sync-indicator').style.display=id==='map'&&getActiveMap()?.kind==='our'?'flex':'none';
  if(id==='map')setTimeout(()=>map?.invalidateSize(),50);
  if(id==='list')renderList();
  if(id==='together')renderTogether()
}
var filterOpen=false;
function toggleFilterBar(){
  filterOpen=!filterOpen;
  document.getElementById('filter-content').style.display=filterOpen?'block':'none';
  document.getElementById('filter-arrow').textContent=filterOpen?'▼':'▲';
  document.getElementById('filter-bar').classList.toggle('open',filterOpen)
}
function renderFilterChips(cid){
  document.getElementById(cid).innerHTML=CATS.map(c=>`<button class="chip${filterCats.includes(c.id)?' on':''}" onclick="toggleCatFilter('${c.id}','${cid}')">${c.emoji} ${c.label}</button>`).join('')
}
function toggleCatFilter(id,cid){
  if(filterCats.includes(id))filterCats=filterCats.filter(x=>x!==id);
  else filterCats.push(id);
  renderFilterChips(cid);
  renderMapFeatures();
  if(currentTab==='list')renderList();
  const el=document.getElementById('filter-count');
  if(el)el.textContent=filterCats.length?'('+filterCats.length+')':''
}

// List
function renderList(){
  const am=getActiveMap();
  document.getElementById('list-subtitle').textContent=am?.title||'';
  renderFilterChips('list-chips');
  const ff=getFiltered(),el=document.getElementById('list-scroll');
  if(!ff.length){
    el.innerHTML='<div style="text-align:center;padding:40px;color:var(--mut);font-weight:800">피처가 없어요.</div>';
    return
  }
  el.innerHTML=ff.map(f=>{
    const cat=catById(f.category);
    return`<div class="f-card" onclick="goToFeature('${f.id}')"><div class="icon" style="background:${f.isHl?'var(--acc-lt)':'var(--bg)'}">${f.emoji||cat.emoji}</div><div class="info"><div class="n">${f.title}${f.isHl?' ⭐':''}</div><div class="meta">${cat.label} · ${(f.tags||[]).slice(0,2).map(t=>'#'+t).join(' ')}</div></div><div class="right"><div class="d">${(f.updatedAt||iso()).slice(5,10)}</div>${f.logs?.length?`<div class="lc">📝 ${f.logs.length}</div>`:''}</div></div>`
  }).join('')
}

// ═══════════════════════════════════════
// Together Screen (Role-based sharing)
// ═══════════════════════════════════════
function renderTogether(){
  const el=document.getElementById('together-scroll'),ours=maps.filter(m=>m.kind==='our');
  el.innerHTML=`<div class="page-title">👥 함께하기</div>
    <div class="page-sub">실시간 공유 지도 — 편집자와 관찰자로 권한을 나눠 공유하세요${hasSharedStorage?'<br>🟢 실시간 동기화 활성':'<br>⚠️ 실시간 동기화 불가 (호스팅 필요)'}</div>
    <button class="btn btn-block mt-14" style="border:1px dashed var(--sec);background:var(--sec-lt);color:var(--sec)" onclick="createSharedMap()">➕ 새 공유 지도 만들기</button>
    <div class="mt-14">${ours.length?ours.map(m=>{
      const mf=features.filter(f=>f.mapId===m.id);
      const role=getRole(m.id)||'owner';
      const online=onlineUsers[m.id]||[];
      return`<div class="card">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:42px;height:42px;border-radius:14px;background:${m.theme}22;display:flex;align-items:center;justify-content:center"><div style="width:20px;height:20px;border-radius:10px;background:${m.theme}"></div></div>
          <div style="flex:1"><div style="font-size:14px;font-weight:900">${m.title} ${roleBadgeHtml(role)}</div>
            <div style="font-size:10px;color:var(--mut);font-weight:700;margin-top:1px">${m.desc||''}</div></div>
          <button class="btn btn-out" style="padding:7px 10px;font-size:11px" onclick="activeMapId='${m.id}';save();renderMapFeatures();fitToFeatures();updateStats();applyPermissionUI();startSync();switchTab('map');toast('지도 열기','s')">열기</button>
        </div>
        <div style="display:flex;gap:10px;margin-top:8px;font-size:11px;color:var(--txt2);font-weight:800">
          <span>📍 ${mf.length}곳</span><span>📝 ${countLogs(mf)}기록</span>
          ${online.length>1?`<span>🟢 ${online.length}명 접속</span>`:''}
        </div>
        ${role==='owner'||role==='editor'?`
        <div style="margin-top:10px;padding:10px;background:var(--bg);border-radius:14px">
          <div style="font-size:11px;font-weight:900;color:var(--txt2);margin-bottom:8px">🔗 공유 코드 발급</div>
          <div class="gap-8">
            <button class="btn btn-sec" style="flex:1;font-size:11px;display:flex;align-items:center;justify-content:center;gap:4px" onclick="copyCode('${m.id}','editor')">
              <span>✏️</span> 편집자 코드
            </button>
            <button class="btn btn-out" style="flex:1;font-size:11px;display:flex;align-items:center;justify-content:center;gap:4px;border-color:#A5B4FC;color:#6366F1" onclick="copyCode('${m.id}','observer')">
              <span>👁</span> 관찰자 코드
            </button>
          </div>
          <div style="font-size:9px;color:var(--mut);font-weight:700;margin-top:6px;line-height:1.5">
            ✏️ 편집자: 핀/경로/구역 추가·수정·삭제 가능<br>
            👁 관찰자: 보기만 가능, 수정 불가
          </div>
        </div>`:
        `<div style="margin-top:8px;font-size:10px;color:var(--mut);font-weight:700">이 지도에서 당신은 ${roleLabelKo(role)}입니다</div>`}
        ${role==='owner'?`<button class="btn btn-danger btn-block mt-8" style="font-size:11px" onclick="deleteMap('${m.id}')">🗑 삭제</button>`:''}
      </div>`
    }).join(''):'<div style="text-align:center;padding:24px;color:var(--mut);font-weight:800">공유 지도가 없어요.</div>'}</div>
    <div class="card mt-16">
      <div style="font-size:13px;font-weight:900">📥 공유코드로 참여하기</div>
      <div style="font-size:10px;color:var(--mut);font-weight:700;margin-top:4px;line-height:1.5">편집자 또는 관찰자 코드를 붙여넣으면 해당 권한으로 지도에 참여합니다.</div>
      <textarea id="share-input" class="input mt-8" style="min-height:70px;resize:vertical;font-family:monospace;font-size:11px" placeholder="공유코드 붙여넣기…"></textarea>
      <div class="gap-8 mt-8">
        <button class="btn btn-sec" style="flex:1" onclick="importShareCodeAsync()">참여하기</button>
        <button class="btn btn-out" onclick="document.getElementById('share-input').value=''">지우기</button>
      </div>
    </div>`;
}

function createSharedMap(){
  const theme=THEMES[Math.floor(Math.random()*THEMES.length)];
  const m={id:uid('m'),kind:'our',title:'새 공유 지도',desc:'',theme,ver:1};
  maps.unshift(m);roles[m.id]='owner';activeMapId=m.id;
  save();if(hasSharedStorage)pushShared(m.id);
  renderMapFeatures();updateStats();applyPermissionUI();startSync();
  toast('새 공유 지도를 만들었어요 ✨','s');
  if(currentTab==='together')renderTogether();
}

// ═══════════════════════════════════════
// Sheets
// ═══════════════════════════════════════
function openSheet(id){document.getElementById('sheet-'+id)?.classList.add('open')}
function closeSheet(id){
  document.getElementById('sheet-'+id)?.classList.remove('open');
  if(id==='detail'){
    selectedId=null;
    renderMapFeatures();
    document.getElementById('filter-bar').style.display='block';
    document.getElementById('stats-pill').style.display='block'
  }
}

function renderMapSelSheet(){
  const el=document.getElementById('mapsel-body'),
    myM=maps.filter(m=>m.kind==='my'),
    ourM=maps.filter(m=>m.kind==='our');
  el.innerHTML=`<h3 style="font-size:16px;font-weight:900;margin-bottom:10px">🗺 지도 선택</h3>
  <div style="font-size:10px;color:var(--mut);font-weight:700;margin-bottom:6px">나의 지도</div>
  ${myM.map(m=>mapRowHtml(m)).join('')}${!myM.length?'<div style="text-align:center;padding:12px;color:var(--mut);font-size:11px;font-weight:800">없음</div>':''}
  <div style="margin-top:12px;font-size:10px;color:var(--mut);font-weight:700;margin-bottom:6px">공유 지도</div>
  ${ourM.map(m=>mapRowHtml(m)).join('')}${!ourM.length?'<div style="text-align:center;padding:12px;color:var(--mut);font-size:11px;font-weight:800">없음</div>':''}`;
}
function mapRowHtml(m){
  const on=m.id===activeMapId;
  const role=m.kind==='our'?getRole(m.id):null;
  return`<div class="card" style="border-color:${on?'var(--pri)':'var(--bdr)'};background:${on?'var(--pri-lt)':'var(--srf)'}">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:40px;height:40px;border-radius:13px;background:${m.theme}22;display:flex;align-items:center;justify-content:center"><div style="width:20px;height:20px;border-radius:10px;background:${m.theme}"></div></div>
      <div style="flex:1"><div style="font-size:14px;font-weight:900">${m.kind==='our'?'👥 ':''}${m.title} ${role?roleBadgeHtml(role):''}</div><div style="font-size:10px;color:var(--mut);font-weight:700;margin-top:1px">${m.desc||''}</div></div>
      <button class="btn btn-out" style="padding:7px 10px;font-size:11px" onclick="switchActiveMap('${m.id}')">열기</button>
    </div></div>`
}
function switchActiveMap(id){
  activeMapId=id;
  save();
  closeSheet('mapsel');
  renderMapFeatures();
  fitToFeatures();
  updateStats();
  applyPermissionUI();
  const am=getActiveMap();
  if(am?.kind==='our')startSync();else stopSync();
  toast('지도 전환','s')
}
function deleteMap(id){
  showConfirm('지도 삭제','모든 피처가 함께 삭제됩니다.',function(){
    maps=maps.filter(x=>x.id!==id);
    features=features.filter(f=>f.mapId!==id);
    delete roles[id];
    if(activeMapId===id)activeMapId=maps[0]?.id||null;
    save();
    renderMapFeatures();
    updateStats();
    applyPermissionUI();
    if(currentTab==='together')renderTogether();
    toast('삭제됨','s')
  })
}

function showRenameMap(){
  const am=getActiveMap();
  if(!am||isObserver()){toast('수정 권한이 없어요','w');return}
  document.getElementById('rename-body').innerHTML=`<div style="font-size:16px;font-weight:900;margin-bottom:12px">✏️ 이름 수정</div><label class="label">이름</label><input class="input" id="rename-name" value="${am.title}"><label class="label mt-12">설명</label><input class="input" id="rename-desc" value="${am.desc||''}"><button class="btn btn-pri btn-block mt-16" onclick="submitRenameMap()">저장</button>`;
  openSheet('rename');
  setTimeout(()=>{
    const i=document.getElementById('rename-name');
    if(i){i.focus();i.select()}
  },300)
}
function submitRenameMap(){
  const am=getActiveMap();
  if(!am)return;
  const name=document.getElementById('rename-name').value.trim();
  if(!name){toast('이름 입력','w');return}
  const idx=maps.findIndex(m=>m.id===am.id);
  if(idx>=0){
    maps[idx].title=name;
    maps[idx].desc=document.getElementById('rename-desc').value.trim()
  }
  save();
  updateStats();
  closeSheet('rename');
  toast('변경됨 ✅','s')
}
var newMapKind='my';
function showNewMapInput(kind){
  newMapKind=kind;
  document.getElementById('newmap-body').innerHTML=`<div style="font-size:16px;font-weight:900;margin-bottom:12px">${kind==='our'?'👥 새 공유 지도':'📍 새 지도'}</div><label class="label">이름</label><input class="input" id="new-map-name" placeholder="이름"><label class="label mt-12">설명</label><input class="input" id="new-map-desc" placeholder="설명"><button class="btn btn-pri btn-block mt-16" onclick="submitNewMap()">만들기</button>`;
  openSheet('newmap');
  setTimeout(()=>{const i=document.getElementById('new-map-name');if(i)i.focus()},300)
}
function submitNewMap(){
  const name=document.getElementById('new-map-name').value.trim();
  if(!name){toast('이름 입력','w');return}
  const m={id:uid('m'),kind:newMapKind,title:name,desc:document.getElementById('new-map-desc').value.trim(),theme:THEMES[Math.floor(Math.random()*THEMES.length)],ver:1};
  maps.unshift(m);
  if(newMapKind==='our')roles[m.id]='owner';
  activeMapId=m.id;
  save();
  if(newMapKind==='our'&&hasSharedStorage)pushShared(m.id);
  closeSheet('newmap');
  renderMapFeatures();
  updateStats();
  applyPermissionUI();
  if(newMapKind==='our')startSync();
  toast('"'+name+'" 생성 ✨','s')
}

// Detail Sheet (permission-aware)
function renderDetailSheet(f){
  const cat=catById(f.category),obs=isObserver(),el=document.getElementById('detail-body');
  el.innerHTML=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
    <div style="width:48px;height:48px;border-radius:15px;background:var(--pri-lt);display:flex;align-items:center;justify-content:center;font-size:22px">${f.emoji||cat.emoji}</div>
    <div style="flex:1"><div style="font-size:15px;font-weight:900">${f.title}</div><div style="font-size:11px;color:var(--mut);font-weight:800;margin-top:2px">${cat.label} · ${f.type==='pin'?'핀':f.type==='line'?'경로':'구역'}</div></div>
    ${f.isHl?'<div style="background:var(--acc-lt);color:var(--warn);padding:5px 9px;border-radius:999px;font-size:10px;font-weight:900">⭐</div>':''}</div>
  ${obs?'<div class="observer-banner"><div class="ob-icon">👁</div><div class="ob-text">관찰자 모드 — 보기만 가능</div></div>':''}
  <div class="card" style="background:var(--srf2)">
    <label class="label">제목</label><input class="input" id="det-title" value="${f.title||''}" ${obs?'disabled style="opacity:.6"':''}>
    <label class="label mt-12">카테고리</label>${obs?`<div style="padding:8px;font-size:13px">${cat.emoji} ${cat.label}</div>`:catGridHtml(f.category,'det-cats')}
    <label class="label mt-12">태그</label><input class="input" id="det-tags" value="${(f.tags||[]).join(', ')}" ${obs?'disabled style="opacity:.6"':''}>
    ${obs?'':`<div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:900;color:var(--txt2);font-size:12px"><input type="checkbox" id="det-hl" ${f.isHl?'checked':''}>⭐ 하이라이트</label>
      <button class="btn btn-pri" style="font-size:11px" onclick="saveDetail('${f.id}')">저장</button></div>`}</div>
  <div class="card mt-12">
    <div style="font-size:13px;font-weight:900">📝 기록 (${f.logs?.length||0})</div>
    ${obs?'':`<div style="background:var(--bg);border:1px solid var(--bdr);border-radius:16px;padding:10px;margin-top:8px">
      <div class="mood-bar" id="det-moods"></div>
      <textarea class="input mt-8" id="det-note" rows="2" style="resize:none" placeholder="경험을 기록하세요…"></textarea>
      <div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn btn-pri" style="font-size:11px" onclick="addLog('${f.id}')">기록 추가</button></div></div>`}
    <div id="det-logs" class="mt-8">${f.logs?.length?f.logs.map(l=>`<div class="log-entry"><div class="top"><div class="d">${l.date}</div>${l.mood?`<div class="m">${l.mood}</div>`:''}</div><div class="note">${l.note}</div></div>`).join(''):'<div style="text-align:center;padding:14px;color:var(--mut);font-weight:800;font-size:11px">기록 없음</div>'}</div></div>
  ${obs?'':`<button class="btn btn-danger btn-block mt-12" onclick="deleteFeature('${f.id}')">🗑 삭제</button>`}`;
  if(!obs){
    const mb=document.getElementById('det-moods');
    if(mb)mb.innerHTML=MOODS.map((m,i)=>`<button class="mood-btn${i===0?' on':''}" onclick="document.querySelectorAll('#det-moods .mood-btn').forEach(b=>b.classList.remove('on'));this.classList.add('on')" data-mood="${m}">${m||'<span style="font-size:10px;font-weight:900;color:var(--mut)">없음</span>'}</button>`).join('')
  }
}
function saveDetail(fid){
  if(isObserver())return;
  const idx=features.findIndex(f=>f.id===fid);
  if(idx<0)return;
  const title=document.getElementById('det-title').value.trim()||'무제';
  const catEl=document.querySelector('#det-cats .cat-btn.on');
  const cat=catEl?.dataset.cat||features[idx].category;
  const tags=document.getElementById('det-tags').value.split(',').map(t=>t.trim()).filter(Boolean);
  features[idx]={...features[idx],title,category:cat,tags,isHl:document.getElementById('det-hl')?.checked||false,emoji:catById(cat).emoji};
  save();
  renderMapFeatures();
  toast('저장됨 ✅','s');
  renderDetailSheet(features[idx])
}
function addLog(fid){
  if(isObserver())return;
  const idx=features.findIndex(f=>f.id===fid);
  if(idx<0)return;
  const note=document.getElementById('det-note').value.trim();
  if(!note)return;
  const moodEl=document.querySelector('#det-moods .mood-btn.on');
  features[idx].logs=[{id:uid('l'),date:iso(),note,mood:moodEl?.dataset.mood||''},...(features[idx].logs||[])];
  save();
  document.getElementById('det-note').value='';
  renderDetailSheet(features[idx]);
  toast('기록 추가 📝','s')
}
function deleteFeature(fid){
  if(isObserver())return;
  showConfirm('피처 삭제','삭제하면 되돌릴 수 없습니다.',function(){
    features=features.filter(x=>x.id!==fid);
    selectedId=null;
    save();
    closeSheet('detail');
    renderMapFeatures();
    toast('삭제됨','s')
  })
}

// Poster
function renderPosterSheet(){
  const am=getActiveMap(),el=document.getElementById('poster-body');
  if(!am){el.innerHTML='<div style="padding:16px;color:var(--mut);font-weight:800">지도를 선택하세요.</div>';return}
  el.innerHTML=`<div style="font-size:16px;font-weight:900;margin-bottom:10px">🖼 포스터</div><div class="gap-8" style="margin-bottom:10px"><select class="input" id="ps-tpl" style="flex:1" onchange="updatePoster()"><option value="festival">🎉 축제</option><option value="tour">🚶 투어</option></select><select class="input" id="ps-ratio" style="width:100px" onchange="updatePoster()"><option value="9:16">9:16</option><option value="1:1">1:1</option></select></div><label class="label">제목</label><input class="input" id="ps-title" value="${am.title}" oninput="updatePoster()"><label class="label mt-8">부제</label><input class="input" id="ps-sub" value="${am.desc||''}" oninput="updatePoster()"><div style="background:#fff;border:1px solid var(--bdr);border-radius:18px;padding:10px;margin-top:12px;overflow:hidden"><div id="poster-preview" style="border-radius:14px;overflow:hidden;background:var(--bg)"></div></div><button class="btn btn-pri btn-block mt-12" onclick="exportPoster()">📥 PNG</button>`;
  setTimeout(updatePoster,50)
}
function updatePoster(){
  const am=getActiveMap();if(!am)return;
  const c=renderPosterCanvas(am,getFiltered(),{template:document.getElementById('ps-tpl')?.value||'festival',ratio:document.getElementById('ps-ratio')?.value||'9:16',meta:{title:document.getElementById('ps-title')?.value||am.title,subtitle:document.getElementById('ps-sub')?.value||''}});
  c.style.width='100%';c.style.height='auto';c.style.display='block';c.style.borderRadius='14px';
  const pr=document.getElementById('poster-preview');
  if(pr){pr.innerHTML='';pr.appendChild(c)}
}
function exportPoster(){
  const am=getActiveMap();if(!am)return;
  const c=renderPosterCanvas(am,getFiltered(),{template:document.getElementById('ps-tpl')?.value||'festival',ratio:document.getElementById('ps-ratio')?.value||'9:16',meta:{title:document.getElementById('ps-title')?.value||am.title,subtitle:document.getElementById('ps-sub')?.value||''}},2);
  const a=document.createElement('a');
  a.download=`loca-${iso()}.png`;
  a.href=c.toDataURL('image/png');
  a.click();
  toast('다운로드 완료','s')
}
function renderPosterCanvas(mo,feats,opts,scale=1){
  const W=1080,H=opts.ratio==='1:1'?1080:1920,cv=document.createElement('canvas');
  cv.width=W*scale;cv.height=H*scale;
  const ctx=cv.getContext('2d');
  ctx.scale(scale,scale);
  const ac=mo.theme||'#C9686E';
  ctx.fillStyle='#F7F9FC';ctx.fillRect(0,0,W,H);
  const g=ctx.createLinearGradient(0,0,W,0);
  g.addColorStop(0,ac);g.addColorStop(1,ac+'CC');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,230);
  ctx.fillStyle='#fff';ctx.font='900 48px sans-serif';ctx.fillText('LOCA',64,74);
  ctx.font='900 56px sans-serif';ctx.fillText(opts.meta.title||'',64,146);
  ctx.globalAlpha=.9;ctx.font='600 22px sans-serif';ctx.fillText(opts.meta.subtitle||'',64,186);
  ctx.globalAlpha=1;
  const mr={x:64,y:270,w:952,h:opts.ratio==='1:1'?580:1100,r:20};
  ctx.save();roundRect(ctx,mr.x,mr.y,mr.w,mr.h,mr.r);ctx.clip();
  ctx.fillStyle='rgba(255,255,255,.95)';ctx.fillRect(mr.x,mr.y,mr.w,mr.h);
  const coords=[];
  feats.forEach(f=>{
    const gg=f.geojson?.geometry;if(!gg)return;
    if(gg.type==='Point')coords.push(gg.coordinates);
    if(gg.type==='LineString')gg.coordinates.forEach(c=>coords.push(c));
    if(gg.type==='Polygon')(gg.coordinates?.[0]||[]).forEach(c=>coords.push(c))
  });
  if(coords.length){
    const mnLng=Math.min(...coords.map(c=>c[0])),
      mxLng=Math.max(...coords.map(c=>c[0])),
      mnLat=Math.min(...coords.map(c=>c[1])),
      mxLat=Math.max(...coords.map(c=>c[1]));
    const pd=.14,
      lr=(mxLng-mnLng)*(1+pd*2)||.02,
      latR=(mxLat-mnLat)*(1+pd*2)||.02,
      cLng=(mnLng+mxLng)/2,
      cLat=(mnLat+mxLat)/2,
      sc=Math.min(mr.w/lr,mr.h/latR),
      toX=lng=>mr.x+mr.w/2+(lng-cLng)*sc,
      toY=lat=>mr.y+mr.h/2-(lat-cLat)*sc;

    feats.forEach(f=>{
      const gg=f.geojson?.geometry;if(!gg)return;
      if(gg.type==='LineString'){
        ctx.strokeStyle=ac;ctx.lineWidth=4;ctx.lineCap='round';
        ctx.beginPath();
        gg.coordinates.forEach((c,i)=>{
          const x=toX(c[0]),y=toY(c[1]);
          i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)
        });
        ctx.stroke()
      }
      if(gg.type==='Polygon'){
        ctx.strokeStyle=ac;ctx.lineWidth=2.5;
        ctx.beginPath();
        (gg.coordinates?.[0]||[]).forEach((c,i)=>{
          const x=toX(c[0]),y=toY(c[1]);
          i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)
        });
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle=ac+'26';ctx.fill()
      }
      if(gg.type==='Point'){
        const x=toX(gg.coordinates[0]),y=toY(gg.coordinates[1]);
        ctx.fillStyle=ac;ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';ctx.font='16px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(f.emoji||'📍',x,y+1);
        ctx.textAlign='left';ctx.textBaseline='alphabetic'
      }
    })
  }
  ctx.restore();
  ctx.strokeStyle=ac+'88';ctx.lineWidth=2;
  roundRect(ctx,mr.x,mr.y,mr.w,mr.h,mr.r);ctx.stroke();
  ctx.fillStyle='#9C9590';ctx.font='600 18px sans-serif';
  ctx.fillText('Made with LOCA',64,Math.min(mr.y+mr.h+60,H-30));
  return cv
}
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);
  ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);
  ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);
  ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);
  ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath()
}

// Confirm
var confirmCb=null;
function showConfirm(t,m,cb){
  confirmCb=cb;
  document.getElementById('confirm-title').textContent=t;
  document.getElementById('confirm-msg').textContent=m;
  document.getElementById('confirm-dialog').classList.add('open')
}
function execConfirm(){
  document.getElementById('confirm-dialog').classList.remove('open');
  if(confirmCb)confirmCb();
  confirmCb=null
}
function closeConfirm(){
  document.getElementById('confirm-dialog').classList.remove('open');
  confirmCb=null
}
function deleteFromMini(fid){
  if(isObserver())return;
  showConfirm('삭제','되돌릴 수 없습니다.',function(){
    features=features.filter(x=>x.id!==fid);
    selectedId=null;
    save();
    hideMiniCard();
    renderMapFeatures();
    toast('삭제됨','s')
  })
}

// Search
let searchTimer=null,searchResults=[];
function onSearch(v){
  document.getElementById('search-clear').style.display=v?'block':'none';
  clearTimeout(searchTimer);
  searchTimer=setTimeout(()=>doSearch(v),400)
}
function clearSearch(){
  document.getElementById('search-input').value='';
  document.getElementById('search-clear').style.display='none';
  document.getElementById('search-results').classList.remove('open')
}
function pickResult(i){
  const r=searchResults[i];
  if(r)goTo(r.lat,r.lng,r.name)
}
async function doSearch(q){
  q=q.trim();
  if(!q){document.getElementById('search-results').classList.remove('open');return}
  const el=document.getElementById('search-results');
  el.classList.add('open');
  el.innerHTML='<div class="sr-item"><div class="n">검색 중…</div></div>';
  let items=[];
  try{
    const r=await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=ko`);
    if(r.ok){
      const d=await r.json();
      items=(d.features||[]).map(f=>{
        const p=f.properties||{};
        const[lng,lat]=f.geometry?.coordinates||[];
        return{name:p.name||q,addr:[p.city,p.state,p.country].filter(Boolean).join(' '),lat,lng}
      }).filter(x=>typeof x.lat==='number')
    }
  }catch(e){}
  if(!items.length){
    try{
      const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=ko&q=${encodeURIComponent(q)}`);
      if(r.ok){
        const d=await r.json();
        items=(d||[]).map(it=>({name:it.name||q,addr:it.display_name||'',lat:parseFloat(it.lat),lng:parseFloat(it.lon)})).filter(x=>!isNaN(x.lat))
      }
    }catch(e){}
  }
  searchResults=items;
  if(!items.length){el.innerHTML='<div class="sr-item"><div class="n">결과 없음</div></div>';return}
  el.innerHTML=items.map((r,i)=>`<div class="sr-item" onclick="pickResult(${i})"><div class="n">${r.name}</div><div class="a">${r.addr}</div></div>`).join('')
}
let searchMarker=null;
function goTo(lat,lng,name){
  if(searchMarker)map.removeLayer(searchMarker);
  clearSearch();
  setTimeout(()=>{
    map.invalidateSize();
    map.setView([lat,lng],16,{animate:true});
    searchMarker=L.marker([lat,lng],{
      icon:L.divIcon({
        html:`<div style="width:36px;height:36px;border-radius:14px;background:var(--pri);border:2px solid #fff;box-shadow:0 6px 20px rgba(201,104,110,.4);display:flex;align-items:center;justify-content:center;font-size:16px;transform:translateY(-8px);animation:bounce .5s ease">📍</div>`,
        className:'',
        iconSize:[36,36],
        iconAnchor:[18,36]
      })
    }).addTo(map);
    searchMarker.bindPopup(`<div style="font-weight:800">${name}</div>`).openPopup();
    setTimeout(()=>{if(searchMarker){map.removeLayer(searchMarker);searchMarker=null}},6000);
    toast(`📍 ${name}`,'s')
  },50)
}

// Import/Export
function exportJson(){
  const d=JSON.stringify({maps,features,cats:CATS,activeMapId,roles},null,2);
  const b=new Blob([d],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(b);
  a.download=`loca-${iso()}.json`;
  a.click();
  toast('다운로드 완료','s')
}
function importFile(e){
  const file=e.target.files?.[0];
  e.target.value='';
  if(!file)return;
  file.text().then(text=>{
    const d=JSON.parse(text);
    if(!d.maps){toast('올바르지 않은 파일','e');return}
    maps=d.maps;
    features=d.features||[];
    if(d.cats)CATS=d.cats;
    if(d.roles)roles=d.roles;
    activeMapId=d.activeMapId||maps[0]?.id;
    save();
    renderMapFeatures();
    fitToFeatures();
    updateStats();
    applyPermissionUI();
    toast('가져오기 완료 ✅','s')
  }).catch(()=>toast('파일 오류','e'))
}
function resetAll(){
  showConfirm('초기화','모든 데이터가 삭제됩니다.',function(){
    try{localStorage.removeItem('loca_v2')}catch(e){}
    location.reload()
  })
}

// Toast
function toast(msg,type='i'){
  const el=document.getElementById('toasts'),
    bg=type==='s'?'var(--sec)':type==='w'?'var(--warn)':type==='e'?'var(--danger)':'var(--txt)';
  const d=document.createElement('div');
  d.className='toast';
  d.style.background=bg;
  d.textContent=msg;
  el.appendChild(d);
  setTimeout(()=>{d.classList.add('out');setTimeout(()=>d.remove(),200)},2200)
}

// Sheet triggers
const origOpen=openSheet;
openSheet=function(id){
  if(id==='mapsel')renderMapSelSheet();
  if(id==='poster')renderPosterSheet();
  origOpen(id)
}

// Category helpers
function catGridHtml(sel,gid){
  return`<div class="cat-grid mt-8" id="${gid}">${CATS.map(c=>`<button class="cat-btn${sel===c.id?' on':''}" onclick="document.querySelectorAll('#${gid} .cat-btn').forEach(b=>b.classList.remove('on'));this.classList.add('on')" data-cat="${c.id}"><div class="e">${c.emoji}</div><div class="l">${c.label}</div></button>`).join('')}<button class="cat-btn" style="border:1px dashed var(--sec);background:var(--sec-lt)" onclick="showInlineCatAdd('${gid}')"><div class="e" style="font-size:14px">➕</div><div class="l" style="color:var(--sec)">추가</div></button></div><div id="${gid}-add" style="display:none;margin-top:8px;background:var(--sec-lt);border:1px dashed var(--sec);border-radius:14px;padding:10px"></div>`
}
function showInlineCatAdd(gid){
  const el=document.getElementById(gid+'-add');
  if(el.style.display==='block'){el.style.display='none';return}
  el.style.display='block';
  el.innerHTML=`<div style="display:flex;gap:6px;align-items:center"><button class="btn btn-out" id="${gid}-ae" onclick="toggleEP('${gid}')" style="font-size:18px;width:40px;height:40px;border-radius:12px;flex-shrink:0">📍</button><input class="input" id="${gid}-an" placeholder="새 카테고리" style="flex:1;font-size:12px;padding:9px 10px"><button class="btn btn-sec" style="font-size:11px;padding:8px 12px" onclick="submitCat('${gid}')">추가</button></div><div id="${gid}-ep" style="display:none"></div>`
}
function toggleEP(gid){
  const el=document.getElementById(gid+'-ep');
  if(!el)return;
  if(el.style.display==='flex'){el.style.display='none';return}
  el.style.display='flex';
  el.style.flexWrap='wrap';
  el.style.gap='3px';
  el.style.marginTop='6px';
  el.innerHTML=EMOJI_PICKS.map(e=>`<button onclick="document.getElementById('${gid}-ae').textContent='${e}';document.getElementById('${gid}-ep').style.display='none'" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--bdr);background:#fff;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">${e}</button>`).join('')
}
function submitCat(gid){
  const emoji=document.getElementById(gid+'-ae')?.textContent.trim()||'📍',
    name=document.getElementById(gid+'-an')?.value.trim();
  if(!name){toast('이름 입력','w');return}
  if(CATS.find(c=>c.label===name)){toast('이미 존재','w');return}
  const id='cat_'+uid('c');
  CATS.push({id,label:name,emoji});
  save();
  const gridEl=document.getElementById(gid),
    addEl=document.getElementById(gid+'-add');
  if(gridEl&&addEl){
    const tmp=document.createElement('div');
    tmp.innerHTML=catGridHtml(id,gid);
    gridEl.replaceWith(tmp.children[0]);
    addEl.replaceWith(tmp.children[0]||document.createElement('div'))
  }
  renderFilterChips('filter-chips');
  toast(`${emoji} ${name} 추가됨`,'s')
}

// PWA (✅ GitHub Pages용: SW 등록만)
function injectPWA(){
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
}

// ═══════════════════════════════════════
// Init
// ═══════════════════════════════════════
window.addEventListener('DOMContentLoaded',()=>{
  loadData();
  // 소유자가 없는 공유 지도에 owner 역할 자동 부여
  maps.forEach(m=>{if(m.kind==='our'&&!roles[m.id])roles[m.id]='owner'});
  initMap();
  renderFilterChips('filter-chips');
  renderMapFeatures();
  injectPWA();
  const am=getActiveMap();
  if(am?.kind==='our'&&hasSharedStorage){pushShared(am.id);startSync()}
  setTimeout(()=>{fitToFeatures();updateStats();applyPermissionUI();toast('LOCA에 오신 걸 환영해요 🗺','s')},300);
});
// ══════ GLOBALS ══════
var FB_CAT={id:'_none',label:'미분류',emoji:'📍'};
var CATS=[];
var CAT_EMOJIS=["📍","☕","🍽️","🌳","🛍️","🎨","🚇","🏠","📌","🏃","🎵","📚","🐾","💼","🏥","🍺","🧁","🌸","⛪","🏖️","🎮","🏋️","🛒","✂️","🔧","🎭","🏫","🏦","⛽","🅿️","🍕","🧋","💇","🎬","🏨","🌊","⛰️","🚲","💊","🛁"];
var MAX_CATS=7;
var MOODS=["","😊","🥰","😋","🤩","😌","🥲","😤","🧐"];
var THEMES=["#C9686E","#6BA08F","#F0C060","#9B7ED8","#4F86C6","#F28C8C"];
var STICKER_CATS=[
  {label:'감정',items:['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💖','✨','🌟','⭐','💫','🔥','💯','🎉','🥳']},
  {label:'여행',items:['✈️','🗺️','🧳','🏖️','🏔️','🌊','🌅','🌇','🚗','🚂','⛵','🎡','🏕️','🗼','🗽','⛩️']},
  {label:'음식',items:['☕','🍰','🧁','🍩','🍕','🍜','🍣','🍺','🧋','🍦','🫐','🍓','🥐','🍳','🥘','🍷']},
  {label:'자연',items:['🌸','🌺','🌻','🌹','🍀','🌿','🌴','🍁','🌈','☀️','🌙','⛅','🦋','🐾','🌵','💐']},
  {label:'데코',items:['📍','🎀','🏷️','📎','🖇️','✏️','📸','🎵','💌','🏅','👑','💎','🪄','🎨','📌','🔖']}
];

function catById(id){
  if(!id||id==='_none'||id==='unknown')return FB_CAT;
  var f=null;
  for(var i=0;i<CATS.length;i++){if(CATS[i].id===id){f=CATS[i];break;}}
  return f||FB_CAT;
}
function uid(p){return(p||'id')+'_'+Math.random().toString(36).slice(2,8)+Date.now().toString(36)}
function iso(){return new Date().toISOString().slice(0,10)}

var maps=[{id:"m1",kind:"my",title:"성수동 탐험",desc:"성수 일대 나만의 장소들",theme:"#C9686E",ver:1},{id:"m2",kind:"our",title:"우리의 데이트맵",desc:"함께한 장소 기록",theme:"#6BA08F",ver:1}];
var features=[
  {id:"f1",mapId:"m1",type:"pin",title:"블루보틀 성수",category:"_none",tags:["커피","디저트"],emoji:"☕",isHl:true,geojson:{type:"Feature",geometry:{type:"Point",coordinates:[127.056,37.544]},properties:{}},logs:[{id:"l1",date:iso(),note:"오트밀크 라떼가 최고!",mood:"😋"}]},
  {id:"f2",mapId:"m1",type:"pin",title:"서울숲",category:"_none",tags:["산책"],emoji:"🌳",isHl:false,geojson:{type:"Feature",geometry:{type:"Point",coordinates:[127.038,37.544]},properties:{}},logs:[]},
  {id:"f3",mapId:"m1",type:"line",title:"성수→뚝섬 산책로",category:"_none",tags:["산책"],emoji:"🚶",isHl:false,geojson:{type:"Feature",geometry:{type:"LineString",coordinates:[[127.044,37.543],[127.048,37.540],[127.052,37.536]]},properties:{}},logs:[]},
  {id:"f5",mapId:"m2",type:"pin",title:"우리 첫 만남 장소",category:"_none",tags:["추억"],emoji:"💕",isHl:true,geojson:{type:"Feature",geometry:{type:"Point",coordinates:[126.978,37.566]},properties:{}},logs:[{id:"l5",date:"2026-02-14",note:"1주년 기념 재방문!",mood:"🥰"}]}
];
var activeMapId="m1",roles={},selectedId=null,drawMode=null,draftPts=[],filterCats=[],currentTab="map",listSearchMode="all";
var confirmCb=null,searchDebounce=null;
var lmap,layerGroup,draftLayer,gpsMarker;
var _detCat=null,_addCatEmoji='📍',_editingCatId=null;
var stickerTarget='sticker-layer',stickerCatIdx=0;
var dragSticker=null,dragOff={x:0,y:0},activeSticker=null;
var posterMapInst=null,selectedFrame='default';
var importResults=[],reverseQueue=[],reverseTotal=0,importMapName='';

var FRAMES=[
  {id:'default',label:'기본',emoji:'🖼️',desc:'그라데이션',cat:'basic'},
  {id:'polaroid',label:'폴라로이드',emoji:'📷',desc:'하단 여백',cat:'basic'},
  {id:'film',label:'필름',emoji:'🎞️',desc:'필름 스트립',cat:'basic'},
  {id:'minimal',label:'미니멀',emoji:'⬜',desc:'깔끔한 흰색',cat:'basic'},
  {id:'dark',label:'다크',emoji:'🌙',desc:'어두운 배경',cat:'basic'},
  {id:'vintage',label:'빈티지',emoji:'📜',desc:'레트로 톤',cat:'basic'},
  {id:'stamp',label:'우표',emoji:'📮',desc:'우표 스타일',cat:'basic'},
  {id:'neon',label:'네온',emoji:'💜',desc:'글로우 효과',cat:'basic'}
];
var frameCatFilter='all';

// ══════ STORAGE ══════
function loadData(){try{var s=localStorage.getItem('loca_v2');if(s){var p=JSON.parse(s);if(p.maps&&p.maps.length){maps=p.maps;features=p.features||[];CATS=p.cats||[];activeMapId=p.activeMapId||maps[0].id;roles=p.roles||{};if(CATS.length>MAX_CATS)CATS=CATS.slice(0,MAX_CATS)}}}catch(e){}}
function save(){try{localStorage.setItem('loca_v2',JSON.stringify({maps:maps,features:features,cats:CATS,activeMapId:activeMapId,roles:roles}))}catch(e){}}

// ══════ HELPERS ══════
function getActiveMap(){return maps.find(function(m){return m.id===activeMapId})}
function getMapFeatures(mid){return features.filter(function(f){return f.mapId===(mid||activeMapId)})}
function toast(msg,type){var c=type==='s'?'var(--success)':type==='e'?'var(--danger)':type==='w'?'var(--warn)':'#555';var el=document.createElement('div');el.className='toast';el.style.background=c;el.textContent=msg;document.getElementById('toasts').appendChild(el);setTimeout(function(){el.classList.add('out');setTimeout(function(){el.remove()},220)},2200)}
function showConfirm(t,m,cb){document.getElementById('confirm-title').textContent=t;document.getElementById('confirm-msg').textContent=m;confirmCb=cb;document.getElementById('confirm-dialog').classList.add('open')}
function closeConfirm(){document.getElementById('confirm-dialog').classList.remove('open');confirmCb=null}
function execConfirm(){if(confirmCb)confirmCb();closeConfirm()}
function openSheet(n){document.getElementById('sheet-'+n).classList.add('open')}
function closeSheet(n){document.getElementById('sheet-'+n).classList.remove('open')}
function formatDate(d){if(!d)return'';try{var dt=new Date(d);return dt.getFullYear()+'.'+String(dt.getMonth()+1).padStart(2,'0')+'.'+String(dt.getDate()).padStart(2,'0')}catch(e){return d}}
function getRole(mid){return roles[mid]||null}
function canEdit(){var am=getActiveMap();if(!am)return false;if(am.kind==='my')return true;var r=getRole(am.id);return r==='owner'||r==='editor'}
function isObserver(){var am=getActiveMap();if(!am||am.kind==='my')return false;return getRole(am.id)==='observer'}
function roleLabelKo(r){return r==='owner'?'👑 소유자':r==='editor'?'✏️ 편집자':r==='observer'?'👁 관찰자':''}
function roleBadgeHtml(r){return'<span class="role-badge '+(r==='owner'?'role-owner':r==='editor'?'role-editor':'role-observer')+'">'+roleLabelKo(r)+'</span>'}
function applyPermissionUI(){var obs=isObserver();document.querySelectorAll('.editor-only').forEach(function(el){el.style.display=obs?'none':'flex'});document.getElementById('observer-map-banner').style.display=obs?'block':'none';var am=getActiveMap();var si=document.getElementById('sync-indicator');if(am&&am.kind==='our'){si.style.display='flex';si.innerHTML='<div class="sync-dot sync-active" style="width:8px;height:8px;border-radius:4px;background:#22C55E;animation:syncPulse 2s infinite"></div>'}else si.style.display='none';var sr=document.getElementById('stats-role');if(am&&am.kind==='our'){sr.style.display='block';sr.innerHTML=roleBadgeHtml(getRole(am.id)||'owner')}else sr.style.display='none'}

// ══════ CATEGORY SYSTEM ══════
function getFilterableCats(){
  var all=CATS.slice();
  var hasNone=features.some(function(f){
    if(f.mapId!==activeMapId)return false;
    return !f.category||f.category==='_none'||f.category==='unknown'||!CATS.some(function(c){return c.id===f.category});
  });
  if(hasNone)all.push(FB_CAT);
  return all;
}
function featureMatchesCatFilter(f){
  if(!filterCats.length)return true;
  var fCat=f.category;
  var isNone=!fCat||fCat==='_none'||fCat==='unknown'||!CATS.some(function(c){return c.id===fCat});
  if(isNone)return filterCats.indexOf('_none')>=0;
  return filterCats.indexOf(fCat)>=0;
}
function buildCatGrid(activeCat){
  var h='';
  for(var ci=0;ci<7;ci++){
    if(ci<CATS.length){
      var c=CATS[ci];
      h+='<div class="cat-btn '+(activeCat===c.id?'on':'')+'" data-cid="'+c.id+'" data-action="selectcat"><div class="e">'+c.emoji+'</div><div class="l">'+c.label+'</div></div>';
    }else{
      h+='<div class="cat-btn" data-action="addcat" style="border-style:dashed;opacity:.6"><div class="e" style="font-size:15px">➕</div><div class="l">추가</div></div>';
    }
  }
  h+='<div class="cat-btn" data-action="managecat" style="background:var(--bg)"><div class="e" style="font-size:14px">⚙️</div><div class="l">관리</div></div>';
  return h;
}
function buildEmojiPicker(sel){
  var h='<div class="label">아이콘 선택</div><div style="display:flex;gap:5px;flex-wrap:wrap" id="addcat-emojis">';
  for(var i=0;i<CAT_EMOJIS.length;i++){
    var em=CAT_EMOJIS[i];var s=em===sel;
    h+='<div class="emoji-pick" data-eidx="'+i+'" style="width:36px;height:36px;border-radius:12px;border:2px solid '+(s?'var(--pri)':'var(--bdr)')+';background:'+(s?'var(--pri-lt)':'#fff')+';display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer">'+em+'</div>';
  }
  h+='</div>';return h;
}
function setDetCat(c){
  _detCat=c;
  document.querySelectorAll('#det-cats .cat-btn').forEach(function(el){
    var cid=el.getAttribute('data-cid');
    if(cid)el.classList.toggle('on',cid===c);
  });
}
function showAddCatSheet(){
  _addCatEmoji='📍';_editingCatId=null;
  var body=document.getElementById('catmgr-body');
  var h='<div style="font-size:15px;font-weight:900;margin-bottom:10px">➕ 새 카테고리 만들기</div>';
  if(CATS.length>=MAX_CATS){
    h+='<div style="text-align:center;padding:20px;color:var(--danger);font-size:13px;font-weight:700">카테고리는 최대 '+MAX_CATS+'개까지 만들 수 있어요</div><button class="btn btn-out btn-block mt-8" onclick="closeSheet(\'catmgr\')">닫기</button>';
    body.innerHTML=h;openSheet('catmgr');return;
  }
  h+=buildEmojiPicker(_addCatEmoji);
  h+='<div class="label mt-12">카테고리 이름</div><input class="input" id="addcat-name" placeholder="예: 카페, 맛집, 공원…" maxlength="10">';
  h+='<button class="btn btn-pri btn-block mt-14" onclick="confirmAddCat()">✨ 만들기</button>';
  h+='<button class="btn btn-out btn-block mt-8" onclick="closeSheet(\'catmgr\')">취소</button>';
  body.innerHTML=h;openSheet('catmgr');
}
function confirmAddCat(){
  var name=(document.getElementById('addcat-name').value||'').trim();
  if(!name){toast('이름을 입력하세요','w');return}
  if(CATS.length>=MAX_CATS){toast('최대 '+MAX_CATS+'개까지','w');return}
  if(CATS.some(function(c){return c.label===name})){toast('이미 있는 이름이에요','w');return}
  CATS.push({id:uid('cat'),label:name,emoji:_addCatEmoji});
  save();closeSheet('catmgr');
  toast(_addCatEmoji+' '+name+' 추가 완료!','s');
  if(selectedId)setTimeout(function(){showDetail(selectedId)},200);
}
function showCatManager(){
  var body=document.getElementById('catmgr-body');
  var h='<div style="font-size:15px;font-weight:900;margin-bottom:4px">⚙️ 카테고리 관리</div><div style="font-size:11px;color:var(--mut);font-weight:700;margin-bottom:12px">'+CATS.length+'/'+MAX_CATS+'개 사용 중</div>';
  if(!CATS.length){
    h+='<div style="text-align:center;padding:30px;color:var(--mut)"><div style="font-size:28px">📂</div><div style="font-size:12px;font-weight:700;margin-top:6px">카테고리가 없어요</div></div>';
  }else{
    for(var i=0;i<CATS.length;i++){
      var c=CATS[i];var fc=0;
      for(var j=0;j<features.length;j++){if(features[j].category===c.id)fc++;}
      h+='<div class="card" style="margin-bottom:8px;padding:10px 12px"><div style="display:flex;align-items:center;gap:10px"><div style="width:40px;height:40px;border-radius:14px;background:var(--pri-lt);display:flex;align-items:center;justify-content:center;font-size:18px">'+c.emoji+'</div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:900">'+c.label+'</div><div style="font-size:10px;color:var(--mut);font-weight:700;margin-top:1px">📍 '+fc+'개 장소</div></div><button class="btn btn-out" style="padding:6px 10px;font-size:10px" data-action="editcat" data-cid="'+c.id+'">✏️</button><button class="btn btn-danger" style="padding:6px 10px;font-size:10px" data-action="deletecat" data-cid="'+c.id+'">🗑</button></div></div>';
    }
  }
  if(CATS.length<MAX_CATS)h+='<button class="btn btn-sec btn-block mt-8" onclick="showAddCatSheet()">➕ 새 카테고리 추가</button>';
  h+='<button class="btn btn-out btn-block mt-8" onclick="closeSheet(\'catmgr\')">닫기</button>';
  body.innerHTML=h;openSheet('catmgr');
}
function showEditCat(cid){
  var c=null;for(var i=0;i<CATS.length;i++){if(CATS[i].id===cid){c=CATS[i];break;}}
  if(!c)return;
  _addCatEmoji=c.emoji;_editingCatId=cid;
  var body=document.getElementById('catmgr-body');
  var h='<div style="font-size:15px;font-weight:900;margin-bottom:10px">✏️ 카테고리 수정</div>';
  h+=buildEmojiPicker(c.emoji);
  h+='<div class="label mt-12">카테고리 이름</div><input class="input" id="addcat-name" value="'+c.label+'" maxlength="10">';
  h+='<button class="btn btn-pri btn-block mt-14" onclick="confirmEditCat()">💾 저장</button>';
  h+='<button class="btn btn-out btn-block mt-8" onclick="showCatManager()">← 뒤로</button>';
  body.innerHTML=h;
}
function confirmEditCat(){
  if(!_editingCatId)return;
  var c=null;for(var i=0;i<CATS.length;i++){if(CATS[i].id===_editingCatId){c=CATS[i];break;}}
  if(!c)return;
  var name=(document.getElementById('addcat-name').value||'').trim();
  if(!name){toast('이름을 입력하세요','w');return}
  c.label=name;c.emoji=_addCatEmoji;_editingCatId=null;
  save();toast('수정 완료 ✅','s');showCatManager();renderMapFeatures();
  if(selectedId)setTimeout(function(){showDetail(selectedId)},300);
}
function deleteCat(cid){
  var c=null;for(var i=0;i<CATS.length;i++){if(CATS[i].id===cid){c=CATS[i];break;}}
  if(!c)return;
  var fc=0;for(var j=0;j<features.length;j++){if(features[j].category===cid)fc++;}
  showConfirm('삭제',c.emoji+' '+c.label+' 삭제?'+(fc?' ('+fc+'개 장소→미분류)':''),function(){
    for(var k=0;k<features.length;k++){if(features[k].category===cid)features[k].category='_none';}
    CATS=CATS.filter(function(x){return x.id!==cid});
    filterCats=filterCats.filter(function(x){return x!==cid});
    save();toast('삭제 완료','s');showCatManager();renderMapFeatures();updateStats();
    if(selectedId)setTimeout(function(){showDetail(selectedId)},300);
  });
}
// Cat delegated events
document.addEventListener('click',function(e){
  var btn=e.target.closest('[data-action]');if(!btn)return;
  var act=btn.getAttribute('data-action');
  if(act==='selectcat'){setDetCat(btn.getAttribute('data-cid'))}
  else if(act==='addcat'){showAddCatSheet()}
  else if(act==='managecat'){showCatManager()}
  else if(act==='editcat'){showEditCat(btn.getAttribute('data-cid'))}
  else if(act==='deletecat'){deleteCat(btn.getAttribute('data-cid'))}
});
document.addEventListener('click',function(e){
  var pick=e.target.closest('.emoji-pick');if(!pick)return;
  var idx=parseInt(pick.getAttribute('data-eidx'));
  if(isNaN(idx)||!CAT_EMOJIS[idx])return;
  _addCatEmoji=CAT_EMOJIS[idx];
  document.querySelectorAll('#addcat-emojis .emoji-pick').forEach(function(d){d.style.borderColor='var(--bdr)';d.style.background='#fff'});
  pick.style.borderColor='var(--pri)';pick.style.background='var(--pri-lt)';
});

// ══════ MAP ══════
function initMap(){lmap=L.map('map',{zoomControl:false}).setView([37.544,127.056],14);L.control.zoom({position:'topright'}).addTo(lmap);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM',maxZoom:19}).addTo(lmap);layerGroup=L.layerGroup().addTo(lmap);draftLayer=L.layerGroup().addTo(lmap);lmap.on('click',onMapClick)}
function onMapClick(e){if(!drawMode)return;if(!canEdit()){toast('편집 권한 없음','w');return}var ll=[e.latlng.lng,e.latlng.lat];if(drawMode==='pin'){addFeatureAtCoord(ll);cancelDraft()}else{draftPts.push(ll);renderDraft();document.getElementById('pts-count').textContent=draftPts.length}}
function toggleDraw(mode){if(drawMode===mode){cancelDraft();return}cancelDraft();drawMode=mode;var labels={pin:'📍 탭하여 핀 추가',line:'🔀 경로 점 추가',poly:'⬡ 구역 점 추가'};var pill=document.getElementById('draw-pill');pill.textContent=labels[mode];pill.style.background=(getActiveMap()||{}).theme||'var(--pri)';pill.classList.add('on');if(mode!=='pin')document.getElementById('draw-ctrl').classList.add('on');document.getElementById('map').className='cursor-'+mode;document.querySelectorAll('.fab').forEach(function(f){f.classList.remove('active')});var fb=document.getElementById('fab-'+mode);if(fb)fb.classList.add('active')}
function cancelDraft(){drawMode=null;draftPts=[];draftLayer.clearLayers();document.getElementById('draw-pill').classList.remove('on');document.getElementById('draw-ctrl').classList.remove('on');document.getElementById('map').className='';document.querySelectorAll('.fab').forEach(function(f){f.classList.remove('active')})}
function undoDraft(){if(draftPts.length){draftPts.pop();renderDraft();document.getElementById('pts-count').textContent=draftPts.length}}
function finishDraft(){if(drawMode==='line'&&draftPts.length<2){toast('2개 이상 점 필요','w');return}if(drawMode==='poly'&&draftPts.length<3){toast('3개 이상 점 필요','w');return}var type=drawMode;var geom=type==='line'?{type:"LineString",coordinates:draftPts.slice()}:{type:"Polygon",coordinates:[draftPts.concat([draftPts[0]])]};var f={id:uid('f'),mapId:activeMapId,type:type,title:type==='line'?'새 경로':'새 구역',category:'_none',tags:[],emoji:type==='line'?'🔀':'⬡',isHl:false,geojson:{type:"Feature",geometry:geom,properties:{}},logs:[]};features.push(f);save();cancelDraft();renderMapFeatures();updateStats();showDetail(f.id)}
function renderDraft(){draftLayer.clearLayers();if(!draftPts.length)return;var c=(getActiveMap()||{}).theme||'#C9686E';draftPts.forEach(function(p){L.circleMarker([p[1],p[0]],{radius:5,color:c,fillColor:c,fillOpacity:.7}).addTo(draftLayer)});if(draftPts.length>=2){var ll=draftPts.map(function(p){return[p[1],p[0]]});if(drawMode==='line')L.polyline(ll,{color:c,weight:3,dashArray:'6,6'}).addTo(draftLayer);else L.polygon(ll,{color:c,fillColor:c,fillOpacity:.15,weight:2,dashArray:'6,6'}).addTo(draftLayer)}}
function addFeatureAtCoord(coord){var f={id:uid('f'),mapId:activeMapId,type:'pin',title:'새 장소',category:'_none',tags:[],emoji:'📍',isHl:false,geojson:{type:"Feature",geometry:{type:"Point",coordinates:coord},properties:{}},logs:[]};features.push(f);save();renderMapFeatures();updateStats();showDetail(f.id)}
function renderMapFeatures(){layerGroup.clearLayers();var am=getActiveMap();if(!am)return;var c=am.theme||'#C9686E';var fs=getMapFeatures();if(filterCats.length)fs=fs.filter(featureMatchesCatFilter);fs.forEach(function(f){var g=f.geojson&&f.geojson.geometry;if(!g)return;if(g.type==='Point'){var ll=[g.coordinates[1],g.coordinates[0]];var html='<div style="width:34px;height:34px;border-radius:17px;background:'+(f.isHl?c:'#fff')+';border:2.5px solid '+c+';display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 14px rgba(0,0,0,.18);cursor:pointer">'+(f.emoji||'📍')+'</div>';L.marker(ll,{icon:L.divIcon({html:html,className:'',iconSize:[34,34],iconAnchor:[17,17]})}).addTo(layerGroup).on('click',function(){showMiniCard(f)})}else if(g.type==='LineString'){L.polyline(g.coordinates.map(function(p){return[p[1],p[0]]}),{color:c,weight:4,opacity:.8}).addTo(layerGroup).on('click',function(){showMiniCard(f)})}else if(g.type==='Polygon'){L.polygon(g.coordinates[0].map(function(p){return[p[1],p[0]]}),{color:c,fillColor:c,fillOpacity:.12,weight:2}).addTo(layerGroup).on('click',function(){showMiniCard(f)})}});updateMapTitle();renderFilterChips()}
function updateMapTitle(){var am=getActiveMap();if(!am)return;document.getElementById('map-title-display').textContent=am.title;document.getElementById('map-dot').style.background=am.theme||'#C9686E'}
function fitToFeatures(){var fs=getMapFeatures();if(!fs.length)return;var b=[];fs.forEach(function(f){var g=f.geojson&&f.geojson.geometry;if(!g)return;if(g.type==='Point')b.push([g.coordinates[1],g.coordinates[0]]);else if(g.type==='LineString')g.coordinates.forEach(function(p){b.push([p[1],p[0]])});else if(g.type==='Polygon')g.coordinates[0].forEach(function(p){b.push([p[1],p[0]])})});if(b.length)lmap.fitBounds(b,{padding:[50,50],maxZoom:16})}
function showMiniCard(f){selectedId=f.id;var cat=catById(f.category);var el=document.getElementById('mini-card');el.style.display='block';el.innerHTML='<div style="display:flex;align-items:center;gap:10px"><div style="width:40px;height:40px;border-radius:14px;background:var(--pri-lt);display:flex;align-items:center;justify-content:center;font-size:18px">'+(f.emoji||cat.emoji)+'</div><div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:900;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">'+(f.isHl?'⭐ ':'')+f.title+'</div><div style="font-size:10px;color:var(--mut);font-weight:700;margin-top:2px">'+cat.emoji+' '+cat.label+'</div></div><button class="btn btn-pri" style="padding:8px 14px;font-size:11px" onclick="showDetail(\''+f.id+'\')">상세</button><button class="btn btn-out" style="padding:8px 10px;font-size:11px" onclick="closeMiniCard()">✕</button></div>'}
function closeMiniCard(){document.getElementById('mini-card').style.display='none';selectedId=null}
function renderFilterChips(){var cats=getFilterableCats();document.getElementById('filter-chips').innerHTML=cats.map(function(c){return'<span class="chip '+(filterCats.indexOf(c.id)>=0?'on':'')+'" onclick="toggleFilter(\''+c.id+'\')">'+c.emoji+' '+c.label+'</span>'}).join('');document.getElementById('filter-count').textContent=filterCats.length?'('+filterCats.length+')':''}
function toggleFilter(c){var i=filterCats.indexOf(c);if(i>=0)filterCats.splice(i,1);else filterCats.push(c);renderFilterChips();renderMapFeatures()}
function toggleFilterBar(){var ct=document.getElementById('filter-content');var bar=document.getElementById('filter-bar');var arr=document.getElementById('filter-arrow');if(ct.style.display==='none'){ct.style.display='block';bar.classList.add('open');arr.textContent='▼'}else{ct.style.display='none';bar.classList.remove('open');arr.textContent='▲'}}
function updateStats(){var am=getActiveMap();if(!am)return;var fs=getMapFeatures();document.getElementById('stats-title').textContent=am.title;document.getElementById('stats-sub').textContent='📍'+fs.filter(function(f){return f.type==='pin'}).length+' · 🔀'+fs.filter(function(f){return f.type==='line'}).length+' · 📝'+fs.reduce(function(s,f){return s+(f.logs?f.logs.length:0)},0)}

// ══════ DETAIL ══════
function showDetail(fId){var f=null;for(var i=0;i<features.length;i++){if(features[i].id===fId){f=features[i];break;}}if(!f)return;closeMiniCard();selectedId=fId;_detCat=null;var cat=catById(f.category);var ed=canEdit();var h='<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><div style="width:48px;height:48px;border-radius:16px;background:var(--pri-lt);display:flex;align-items:center;justify-content:center;font-size:22px">'+(f.emoji||cat.emoji)+'</div><div style="flex:1"><div style="font-size:16px;font-weight:900">'+(f.isHl?'⭐ ':'')+f.title+'</div><div style="font-size:10px;color:var(--mut);font-weight:700;margin-top:2px">'+cat.emoji+' '+cat.label+'</div></div></div>';if(ed){h+='<div class="card" style="margin-bottom:10px"><div class="label">제목</div><input class="input" id="det-title" value="'+f.title+'"><div class="label mt-8">카테고리</div><div class="cat-grid mt-8" id="det-cats">'+buildCatGrid(f.category)+'</div><div class="label mt-8">태그 (쉼표)</div><input class="input" id="det-tags" value="'+(f.tags||[]).join(', ')+'"><div style="display:flex;align-items:center;gap:8px;margin-top:8px"><input type="checkbox" id="det-hl" '+(f.isHl?'checked':'')+'><label for="det-hl" style="font-size:12px;font-weight:700">⭐ 하이라이트</label></div><button class="btn btn-pri btn-block mt-12" onclick="saveDetail(\''+f.id+'\')">💾 저장</button></div>'}h+='<div style="font-size:14px;font-weight:900;margin-bottom:8px">📝 방문 로그 ('+(f.logs?f.logs.length:0)+')</div>';if(ed){h+='<div class="card" style="margin-bottom:10px"><div class="label">기분</div><div class="mood-bar" id="det-mood">'+MOODS.map(function(m,i){return i===0?'':'<div class="mood-btn" data-m="'+m+'" onclick="pickMood(this)">'+m+'</div>'}).join('')+'</div><div class="label mt-8">메모</div><textarea class="input" id="det-log-note" rows="2" placeholder="오늘의 기록…"></textarea><button class="btn btn-sec btn-block mt-8" onclick="addLog(\''+f.id+'\')">+ 로그 추가</button></div>'}(f.logs||[]).slice().reverse().forEach(function(l){h+='<div class="log-entry"><div class="top"><div class="d">'+formatDate(l.date)+'</div><div style="font-size:15px">'+(l.mood||'')+'</div></div><div class="note">'+(l.note||'')+'</div>'+(ed?'<div style="text-align:right;margin-top:4px"><button class="btn btn-danger" style="padding:4px 10px;font-size:10px" onclick="deleteLog(\''+f.id+'\',\''+l.id+'\')">삭제</button></div>':'')+'</div>'});if(ed)h+='<div class="mt-16"><button class="btn btn-danger btn-block" onclick="deleteFeature(\''+f.id+'\')">🗑 삭제</button></div>';document.getElementById('detail-body').innerHTML=h;openSheet('detail')}
function saveDetail(fId){var f=null;for(var i=0;i<features.length;i++){if(features[i].id===fId){f=features[i];break;}}if(!f)return;f.title=document.getElementById('det-title').value.trim()||f.title;if(_detCat){f.category=_detCat;var nc=catById(_detCat);if(nc)f.emoji=nc.emoji;}_detCat=null;f.tags=document.getElementById('det-tags').value.split(',').map(function(t){return t.trim()}).filter(Boolean);f.isHl=document.getElementById('det-hl').checked;save();renderMapFeatures();updateStats();toast('저장 ✅','s');showDetail(fId)}
function pickMood(el){document.querySelectorAll('#det-mood .mood-btn').forEach(function(b){b.classList.remove('on')});el.classList.add('on')}
function addLog(fId){var f=null;for(var i=0;i<features.length;i++){if(features[i].id===fId){f=features[i];break;}}if(!f)return;var mEl=document.querySelector('#det-mood .mood-btn.on');var mood=mEl?mEl.dataset.m:'';var note=document.getElementById('det-log-note').value.trim();if(!note){toast('메모 입력','w');return}if(!f.logs)f.logs=[];f.logs.push({id:uid('l'),date:iso(),note:note,mood:mood});save();showDetail(fId)}
function deleteLog(fId,lId){showConfirm('삭제','로그를 삭제?',function(){var f=null;for(var i=0;i<features.length;i++){if(features[i].id===fId){f=features[i];break;}}if(f)f.logs=(f.logs||[]).filter(function(l){return l.id!==lId});save();showDetail(fId)})}
function deleteFeature(fId){showConfirm('삭제','피처를 삭제?',function(){features=features.filter(function(f){return f.id!==fId});save();closeSheet('detail');renderMapFeatures();updateStats()})}

// ══════ SEARCH ══════
function onSearch(val){clearTimeout(searchDebounce);var clr=document.getElementById('search-clear');if(!val.trim()){clr.style.display='none';document.getElementById('search-results').classList.remove('open');return}clr.style.display='block';searchDebounce=setTimeout(function(){doSearch(val.trim())},400)}
function doSearch(q){fetch('https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(q)+'&format=json&limit=6&accept-language=ko').then(function(r){return r.json()}).then(function(data){var box=document.getElementById('search-results');if(!data.length){box.innerHTML='<div class="sr-item"><div class="n">결과 없음</div></div>';box.classList.add('open');return}box.innerHTML=data.map(function(d){return'<div class="sr-item" onclick="goToSearch('+d.lat+','+d.lon+')"><div class="n">'+(d.display_name||'').split(',')[0]+'</div><div class="a">'+(d.display_name||'').substring(0,80)+'</div></div>'}).join('');box.classList.add('open')})}
function goToSearch(lat,lng){lmap.setView([lat,lng],16);document.getElementById('search-results').classList.remove('open')}
function clearSearch(){document.getElementById('search-input').value='';document.getElementById('search-clear').style.display='none';document.getElementById('search-results').classList.remove('open')}
function goToMyLocation(){if(!navigator.geolocation){toast('위치 불가','w');return}navigator.geolocation.getCurrentPosition(function(pos){var ll=[pos.coords.latitude,pos.coords.longitude];lmap.setView(ll,16);if(gpsMarker)lmap.removeLayer(gpsMarker);gpsMarker=L.marker(ll,{icon:L.divIcon({html:'<div style="width:18px;height:18px;border-radius:9px;background:#4F86C6;border:3px solid #fff;box-shadow:0 2px 8px rgba(79,134,198,.5);animation:gpsPulse 2s infinite"></div>',className:'',iconSize:[18,18],iconAnchor:[9,9]})}).addTo(lmap)},function(){toast('위치 불가','e')},{enableHighAccuracy:true,timeout:8000})}

// ══════ LIST TAB ══════
function setListSearchMode(mode){listSearchMode=mode;document.querySelectorAll('#search-mode-tabs .chip').forEach(function(c){c.classList.toggle('on',c.dataset.smode===mode)});var inp=document.getElementById('list-search');var ph={all:'제목·메모·태그·카테고리 통합 검색',title:'제목으로 검색',memo:'메모(방문 로그) 내용으로 검색',tag:'태그로 검색',category:'카테고리로 검색'};inp.placeholder=ph[mode]||'검색…';renderList()}
function renderListSearchTabs(){var modes=[{id:'all',label:'🔍 전체'},{id:'title',label:'📌 제목'},{id:'memo',label:'📝 메모'},{id:'tag',label:'🏷️ 태그'},{id:'category',label:'📂 카테고리'}];document.getElementById('search-mode-tabs').innerHTML='<span style="font-size:9px;font-weight:900;color:var(--mut);flex-shrink:0;margin-right:2px">검색 유형</span>'+modes.map(function(m){return'<span class="chip '+(listSearchMode===m.id?'on':'')+'" data-smode="'+m.id+'" onclick="setListSearchMode(\''+m.id+'\')" style="flex-shrink:0;white-space:nowrap">'+m.label+'</span>'}).join('')}
function matchSearch(f,q){if(!q)return true;var ql=q.toLowerCase();var cat=catById(f.category);switch(listSearchMode){case'title':return f.title.toLowerCase().indexOf(ql)>=0;case'memo':return(f.logs||[]).some(function(l){return(l.note||'').toLowerCase().indexOf(ql)>=0});case'tag':return(f.tags||[]).some(function(t){return t.toLowerCase().indexOf(ql)>=0});case'category':return cat.label.toLowerCase().indexOf(ql)>=0;default:return f.title.toLowerCase().indexOf(ql)>=0||(f.tags||[]).some(function(t){return t.toLowerCase().indexOf(ql)>=0})||(f.logs||[]).some(function(l){return(l.note||'').toLowerCase().indexOf(ql)>=0})||cat.label.toLowerCase().indexOf(ql)>=0}}
function getMatchContext(f,q){if(!q)return'';var ql=q.toLowerCase();var ctx=[];if(listSearchMode==='memo'||listSearchMode==='all'){(f.logs||[]).forEach(function(l){if((l.note||'').toLowerCase().indexOf(ql)>=0){var idx=(l.note||'').toLowerCase().indexOf(ql);var s=Math.max(0,idx-12);var e=Math.min(l.note.length,idx+q.length+12);ctx.push('📝 '+(s>0?'…':'')+l.note.substring(s,e)+(e<l.note.length?'…':''))}})}if(listSearchMode==='tag'||listSearchMode==='all'){(f.tags||[]).forEach(function(t){if(t.toLowerCase().indexOf(ql)>=0)ctx.push('🏷️ '+t)})}if(listSearchMode==='category'||listSearchMode==='all'){var cat=catById(f.category);if(cat.label.toLowerCase().indexOf(ql)>=0)ctx.push('📂 '+cat.label)}return ctx.slice(0,2).join(' · ')}
function renderList(){var am=getActiveMap();if(!am)return;renderListSearchTabs();var q=(document.getElementById('list-search')||{value:''}).value.trim();var fs=getMapFeatures();if(filterCats.length)fs=fs.filter(featureMatchesCatFilter);if(q)fs=fs.filter(function(f){return matchSearch(f,q)});document.getElementById('list-subtitle').textContent=am.title+' · '+fs.length+'개'+(q?' (검색: "'+q+'")':'');document.getElementById('list-chips').innerHTML='<span style="font-size:9px;font-weight:900;color:var(--mut);flex-shrink:0;margin-right:2px">카테고리 필터</span>'+getFilterableCats().map(function(c){return'<span class="chip '+(filterCats.indexOf(c.id)>=0?'on':'')+'" onclick="toggleFilter(\''+c.id+'\');renderList()">'+c.emoji+' '+c.label+'</span>'}).join('');var sc=document.getElementById('list-scroll');if(!fs.length){sc.innerHTML='<div style="text-align:center;padding:40px;color:var(--mut)"><div style="font-size:32px">'+(q?'🔍':'📭')+'</div><div style="margin-top:8px;font-size:13px;font-weight:700">'+(q?'"'+q+'" 검색 결과가 없어요':'피처가 없어요')+'</div></div>';return}sc.innerHTML=fs.map(function(f){var cat=catById(f.category);var mc=q?getMatchContext(f,q):'';return'<div class="f-card" onclick="showDetail(\''+f.id+'\');switchTab(\'map\')"><div class="icon" style="background:var(--pri-lt)">'+(f.emoji||cat.emoji)+'</div><div class="info"><div class="n">'+(f.isHl?'⭐ ':'')+f.title+'</div><div class="meta">'+cat.emoji+' '+cat.label+(f.tags&&f.tags.length?' · 🏷️'+f.tags.slice(0,2).join(', '):'')+'</div>'+(mc?'<div style="font-size:9px;color:var(--pri);font-weight:700;margin-top:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">'+mc+'</div>':'')+'</div><div class="right"><div class="d">📝 '+(f.logs?f.logs.length:0)+'</div></div></div>'}).join('')}

// ══════ TABS ══════
function switchTab(tab){currentTab=tab;document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.toggle('on',b.dataset.tab===tab)});document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active')});document.getElementById('screen-'+tab).classList.add('active');document.getElementById('topbar').classList.toggle('solid',tab!=='map');if(tab==='list')renderList();if(tab==='together')renderTogether()}

// ══════ TOGETHER ══════
function renderTogether(){var el=document.getElementById('together-scroll');var shared=maps.filter(function(m){return m.kind==='our'});var h='<div class="page-title">👥 함께 쓰는 지도</div><div class="page-sub">공유 지도를 만들고 초대하세요</div>';if(!shared.length)h+='<div style="text-align:center;padding:40px;color:var(--mut)"><div style="font-size:36px">🌐</div><div style="margin-top:8px;font-size:13px;font-weight:700">공유 지도가 없어요</div></div>';else shared.forEach(function(m){var fs=features.filter(function(f){return f.mapId===m.id});var role=getRole(m.id)||'owner';h+='<div class="card mt-8"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><div style="width:12px;height:12px;border-radius:6px;background:'+m.theme+'"></div><div style="font-size:14px;font-weight:900;flex:1">'+m.title+'</div>'+roleBadgeHtml(role)+'</div><div style="font-size:11px;color:var(--mut);font-weight:700">📍 '+fs.length+'개</div><button class="btn btn-pri btn-block mt-8" style="background:'+m.theme+'" onclick="switchToMap(\''+m.id+'\')">열기</button></div>'});el.innerHTML=h}
function switchToMap(mid){activeMapId=mid;save();renderMapFeatures();fitToFeatures();updateStats();applyPermissionUI();switchTab('map')}

// ══════ MAP SELECTION ══════
function renderMapSelSheet(){var body=document.getElementById('mapsel-body');var h='<div style="font-size:15px;font-weight:900;margin-bottom:10px">🗺 지도 선택</div>';maps.forEach(function(m){var cnt=features.filter(function(f){return f.mapId===m.id}).length;var isCur=m.id===activeMapId;h+='<div class="f-card" style="'+(isCur?'border-color:var(--pri);background:var(--pri-lt)':'')+'"><div class="icon" style="background:'+m.theme+'20;cursor:pointer" onclick="switchToMap(\''+m.id+'\');closeSheet(\'mapsel\')"><div style="width:14px;height:14px;border-radius:7px;background:'+m.theme+'"></div></div><div class="info" style="cursor:pointer" onclick="switchToMap(\''+m.id+'\');closeSheet(\'mapsel\')"><div class="n">'+m.title+(m.kind==='our'?' 🌐':'')+'</div><div class="meta">'+(m.desc||'')+'</div></div><div class="right"><span style="font-size:10px;color:var(--mut);font-weight:800">📍 '+cnt+'</span></div></div>'});h+='<button class="btn btn-out btn-block mt-12" onclick="closeSheet(\'mapsel\')">닫기</button>';body.innerHTML=h;openSheet('mapsel')}
function showNewMapInput(kind){document.getElementById('newmap-body').innerHTML='<div style="font-size:15px;font-weight:900;margin-bottom:10px">'+(kind==='our'?'🌐 공유':'📌 내')+' 지도 만들기</div><div class="label">이름</div><input class="input" id="newmap-title" placeholder="예: 제주도 여행"><div class="label mt-8">설명</div><input class="input" id="newmap-desc"><div class="label mt-8">색상</div><div style="display:flex;gap:8px;margin-top:4px" id="newmap-themes">'+THEMES.map(function(c,i){return'<div style="width:32px;height:32px;border-radius:16px;background:'+c+';cursor:pointer;border:3px solid '+(i===0?'var(--txt)':'transparent')+'" onclick="pickNewTheme(this,\''+c+'\')"></div>'}).join('')+'</div><input type="hidden" id="newmap-theme" value="'+THEMES[0]+'"><input type="hidden" id="newmap-kind" value="'+kind+'"><button class="btn btn-pri btn-block mt-14" onclick="createNewMap()">✨ 만들기</button>';openSheet('newmap')}
function pickNewTheme(el,c){document.querySelectorAll('#newmap-themes div').forEach(function(d){d.style.borderColor='transparent'});el.style.borderColor='var(--txt)';document.getElementById('newmap-theme').value=c}
function createNewMap(){var title=document.getElementById('newmap-title').value.trim();if(!title){toast('이름 필요','w');return}var m={id:uid('m'),kind:document.getElementById('newmap-kind').value,title:title,desc:document.getElementById('newmap-desc').value.trim(),theme:document.getElementById('newmap-theme').value,ver:1};maps.push(m);if(m.kind==='our')roles[m.id]='owner';activeMapId=m.id;save();closeSheet('newmap');renderMapFeatures();updateStats();applyPermissionUI();toast('"'+title+'" 생성 ✨','s')}
function showRenameMap(mid){var am=mid?maps.find(function(m){return m.id===mid}):getActiveMap();if(!am)return;document.getElementById('rename-body').innerHTML='<div style="font-size:15px;font-weight:900;margin-bottom:10px">✏️ 이름 변경</div><div class="label">이름</div><input class="input" id="rename-title" value="'+am.title+'"><div class="label mt-8">설명</div><input class="input" id="rename-desc" value="'+(am.desc||'')+'"><div class="label mt-8">색상</div><div style="display:flex;gap:8px;margin-top:4px" id="rename-themes">'+THEMES.map(function(c){return'<div style="width:32px;height:32px;border-radius:16px;background:'+c+';cursor:pointer;border:3px solid '+(c===am.theme?'var(--txt)':'transparent')+'" onclick="pickRenameTheme(this,\''+c+'\')"></div>'}).join('')+'</div><input type="hidden" id="rename-theme" value="'+am.theme+'"><input type="hidden" id="rename-mid" value="'+am.id+'"><div class="gap-8 mt-14"><button class="btn btn-out" style="flex:1" onclick="closeSheet(\'rename\')">취소</button><button class="btn btn-pri" style="flex:1" onclick="saveRename()">저장</button></div><button class="btn btn-danger btn-block mt-8" onclick="deleteMap()">🗑 삭제</button>';openSheet('rename')}
function pickRenameTheme(el,c){document.querySelectorAll('#rename-themes div').forEach(function(d){d.style.borderColor='transparent'});el.style.borderColor='var(--txt)';document.getElementById('rename-theme').value=c}
function saveRename(){var mid=document.getElementById('rename-mid').value;var am=maps.find(function(m){return m.id===mid});if(!am)return;am.title=document.getElementById('rename-title').value.trim()||am.title;am.desc=document.getElementById('rename-desc').value.trim();am.theme=document.getElementById('rename-theme').value;save();closeSheet('rename');renderMapFeatures();updateStats();toast('저장 ✅','s')}
function deleteMap(){var mid=document.getElementById('rename-mid').value;showConfirm('삭제','지도를 삭제?',function(){features=features.filter(function(f){return f.mapId!==mid});maps=maps.filter(function(m){return m.id!==mid});if(activeMapId===mid)activeMapId=maps.length?maps[0].id:'';if(!activeMapId){var m={id:uid('m'),kind:'my',title:'새 지도',desc:'',theme:'#C9686E',ver:1};maps.push(m);activeMapId=m.id}save();closeSheet('rename');renderMapFeatures();fitToFeatures();updateStats();applyPermissionUI()})}

// ══════ EXPORT / IMPORT ══════
function exportJson(){var blob=new Blob([JSON.stringify({maps:maps,features:features,cats:CATS,roles:roles},null,2)],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='loca_'+iso()+'.json';a.click();toast('백업 완료 📦','s')}
function showImportSheet(){
  var h='<div style="font-size:15px;font-weight:900;margin-bottom:4px">📥 지도 가져오기</div>';
  h+='<div style="font-size:11px;color:var(--mut);font-weight:700;margin-bottom:12px">네이버맵·카카오맵·구글맵 URL 파싱</div>';
  h+='<div class="card" style="margin-bottom:10px">';
  h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px"><div style="font-size:18px">🔗</div><div><div style="font-size:13px;font-weight:900">지도 URL 붙여넣기</div><div style="font-size:10px;color:var(--mut);font-weight:700;margin-top:1px">공유 링크를 한 줄에 하나씩 붙여넣으세요</div></div></div>';
  h+='<textarea class="input" id="import-urls" rows="8" placeholder="예시:\nhttps://map.naver.com/p/entry/place/...?c=127.056,37.544,15\nhttps://map.kakao.com/link/map/블루보틀,37.544,127.056\nhttps://www.google.com/maps/place/.../@37.544,127.038,16z\n\n💡 장소명을 URL 윗줄에 적으면 이름으로 사용:\n블루보틀 성수\nhttps://map.naver.com/...\n\n좌표 직접 입력도 가능:\n37.544, 127.056" style="font-size:11px;line-height:1.5"></textarea>';
  h+='<div class="label mt-8">지도 이름</div><input class="input" id="import-map-name" placeholder="예: 성수동 맛집">';
  h+='<button class="btn btn-pri btn-block mt-8" onclick="startUrlImport()">🔍 URL 파싱 & 가져오기</button></div>';
  h+='<div style="background:var(--bg);border-radius:14px;padding:10px 12px;margin-bottom:10px"><div style="font-size:11px;font-weight:900;margin-bottom:6px">💡 URL 복사 방법</div><div style="font-size:10px;color:var(--mut);font-weight:700;line-height:1.8"><div style="margin-bottom:4px"><b style="color:#1EC800">N 네이버맵:</b> 장소 → 공유 → URL 복사</div><div style="margin-bottom:4px"><b style="color:#FEE500;text-shadow:0 0 2px #999">K 카카오맵:</b> 장소 → 공유 → URL 복사</div><div style="margin-bottom:4px"><b>🌐 구글맵:</b> 장소 → 공유 → 링크 복사</div><div><b>📌 좌표:</b> 37.544, 127.056</div></div></div>';
  h+='<div id="import-progress" style="display:none"></div><div id="import-results" style="display:none"></div>';
  h+='<div class="card" style="cursor:pointer;padding:10px 12px" onclick="document.getElementById(\'import-file\').click()"><div style="display:flex;align-items:center;gap:8px"><div style="font-size:16px">🗺️</div><div style="font-size:12px;font-weight:900">LOCA/KML/GPX 파일 가져오기</div></div></div>';
  h+='<button class="btn btn-out btn-block mt-12" onclick="closeSheet(\'import\')">닫기</button>';
  document.getElementById('import-body').innerHTML=h;openSheet('import');
}
function parseMapUrl(line){
  line=line.trim();if(!line)return null;
  var pc=line.match(/^(-?\d{1,3}\.\d{3,})\s*[,\s]\s*(-?\d{1,3}\.\d{3,})$/);
  if(pc){var a=parseFloat(pc[1]),b=parseFloat(pc[2]);if(a>=33&&a<=44&&b>=124&&b<=133)return{lat:a,lng:b,name:'',source:'좌표'};if(b>=33&&b<=44&&a>=124&&a<=133)return{lat:b,lng:a,name:'',source:'좌표'};if(Math.abs(a)<=90&&Math.abs(b)<=180)return{lat:a,lng:b,name:'',source:'좌표'};return null}
  if(line.indexOf('http')<0&&line.indexOf('map')<0)return null;
  var r=null;
  var gAt=line.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if(gAt){var gn='';var gp=line.match(/\/place\/([^/@]+)/);if(gp)gn=decodeURIComponent(gp[1].replace(/\+/g,' '));r={lat:parseFloat(gAt[1]),lng:parseFloat(gAt[2]),name:gn,source:'구글맵'}}
  if(!r){var gQ=line.match(/[?&]q=(-?\d+\.?\d+),(-?\d+\.?\d+)/);if(gQ)r={lat:parseFloat(gQ[1]),lng:parseFloat(gQ[2]),name:'',source:'구글맵'}}
  if(!r&&line.indexOf('google')>=0){var gD=line.match(/!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);if(gD)r={lat:parseFloat(gD[1]),lng:parseFloat(gD[2]),name:'',source:'구글맵'}}
  if(!r){var kL=line.match(/link\/(?:map|to)\/([^,]+),(-?\d+\.?\d+),(-?\d+\.?\d+)/);if(kL)r={lat:parseFloat(kL[2]),lng:parseFloat(kL[3]),name:decodeURIComponent(kL[1]),source:'카카오맵'}}
  if(!r&&line.indexOf('kakao')>=0){var kC=line.match(/[?&]itemLat=(-?\d+\.?\d+)/);var kCl=line.match(/[?&]itemLng=(-?\d+\.?\d+)/);if(kC&&kCl)r={lat:parseFloat(kC[1]),lng:parseFloat(kCl[1]),name:'',source:'카카오맵'}}
  if(!r){var nLa=line.match(/[?&#]lat=(-?\d+\.?\d+)/);var nLn=line.match(/[?&#]lng=(-?\d+\.?\d+)/);if(nLa&&nLn)r={lat:parseFloat(nLa[1]),lng:parseFloat(nLn[1]),name:'',source:'네이버맵'}}
  if(!r){var nC=line.match(/[?&#]c=(-?\d+\.?\d+),(-?\d+\.?\d+)/);if(nC)r={lat:parseFloat(nC[2]),lng:parseFloat(nC[1]),name:'',source:'네이버맵'}}
  if(!r&&line.indexOf('naver')>=0){var nY=line.match(/[?&#]y=(-?\d+\.?\d+)/);var nX=line.match(/[?&#]x=(-?\d+\.?\d+)/);if(nY&&nX)r={lat:parseFloat(nY[1]),lng:parseFloat(nX[1]),name:'',source:'네이버맵'}}
  if(!r){var gc=line.match(/(-?\d{1,3}\.\d{4,})[,/\s]+(-?\d{1,3}\.\d{4,})/g);if(gc){for(var gi=0;gi<gc.length;gi++){var gm=gc[gi].match(/(-?\d{1,3}\.\d{4,})/g);if(gm&&gm.length>=2){var ca=parseFloat(gm[0]),cb=parseFloat(gm[1]);if(ca>=33&&ca<=44&&cb>=124&&cb<=133){r={lat:ca,lng:cb,name:'',source:'URL'};break}if(cb>=33&&cb<=44&&ca>=124&&ca<=133){r={lat:cb,lng:ca,name:'',source:'URL'};break}if(Math.abs(ca)<=90&&Math.abs(cb)<=180){r={lat:ca,lng:cb,name:'',source:'URL'};break}}}}}
  return r;
}
function startUrlImport(){
  var raw=document.getElementById('import-urls').value.trim();
  if(!raw){toast('URL을 입력하세요','w');return}
  importMapName=document.getElementById('import-map-name').value.trim()||'가져온 지도';
  var lines=raw.split('\n').map(function(l){return l.trim()}).filter(function(l){return l.length>0});
  if(!lines.length){toast('URL을 입력하세요','w');return}
  var items=[];var nameHints={};
  for(var i=0;i<lines.length;i++){var ln=lines[i];
    if(ln.indexOf('http')<0&&!ln.match(/\d{2,}\.\d{3,}/)){
      var clean=ln.replace(/^[네이버카카오구글]+\s*지도\s*/,'').trim();
      if(clean&&i+1<lines.length&&(lines[i+1].indexOf('http')>=0||lines[i+1].match(/\d{2,}\.\d{3,}/))){nameHints[i+1]=clean;continue}
      continue;
    }
    items.push({line:ln,idx:i,nameHint:nameHints[i]||''});
  }
  if(!items.length){toast('파싱 가능한 URL이 없어요','w');return}
  importResults=[];
  items.forEach(function(it){
    var parsed=parseMapUrl(it.line);
    if(parsed){if(!parsed.name&&it.nameHint)parsed.name=it.nameHint;importResults.push({lat:parsed.lat,lng:parsed.lng,name:parsed.name||'',found:true,original:it.line,source:parsed.source,category:'_none'})}
    else{importResults.push({lat:0,lng:0,name:it.nameHint||it.line.substring(0,50),found:false,original:it.line,source:'파싱 실패',category:'_none'})}
  });
  var pg=document.getElementById('import-progress');pg.style.display='block';
  pg.innerHTML='<div style="background:var(--srf);border:1px solid var(--bdr);border-radius:16px;padding:12px"><div style="display:flex;align-items:center;gap:8px"><div style="font-size:16px;animation:syncPulse 1s infinite">🔍</div><div style="font-size:13px;font-weight:900">URL 파싱 완료 → 주소 조회 중…</div></div><div style="height:6px;background:var(--bdr);border-radius:3px;overflow:hidden;margin-top:8px"><div id="gc-bar" style="height:100%;background:var(--pri);border-radius:3px;width:10%;transition:width .3s"></div></div><div id="gc-status" style="font-size:10px;color:var(--mut);font-weight:700;margin-top:6px"></div></div>';
  document.getElementById('import-results').style.display='none';
  reverseQueue=[];reverseTotal=0;
  importResults.forEach(function(r,i){if(r.found&&!r.name)reverseQueue.push(i)});
  reverseTotal=reverseQueue.length;
  if(reverseTotal>0)processNextReverse();else finishUrlImport();
}
function processNextReverse(){
  if(!reverseQueue.length){finishUrlImport();return}
  var idx=reverseQueue.shift();var r=importResults[idx];
  var done=reverseTotal-reverseQueue.length;
  document.getElementById('gc-bar').style.width=Math.round(10+done/reverseTotal*90)+'%';
  document.getElementById('gc-status').textContent='주소 조회 중 ('+done+'/'+reverseTotal+')';
  fetch('https://nominatim.openstreetmap.org/reverse?lat='+r.lat+'&lon='+r.lng+'&format=json&accept-language=ko&zoom=18')
  .then(function(resp){return resp.json()}).then(function(data){
    if(data&&data.display_name){var parts=(data.display_name||'').split(',');r.name=r.name||(parts[0]||'').trim();r.address=(data.display_name||'').substring(0,60)}
    if(!r.name)r.name='장소 '+(idx+1);setTimeout(processNextReverse,350);
  }).catch(function(){if(!r.name)r.name='장소 '+(idx+1);setTimeout(processNextReverse,350)});
}
function finishUrlImport(){
  var found=importResults.filter(function(r){return r.found});var notFound=importResults.filter(function(r){return!r.found});
  document.getElementById('gc-bar').style.width='100%';document.getElementById('gc-status').textContent='완료!';
  var rs=document.getElementById('import-results');rs.style.display='block';
  var h='<div style="background:var(--srf);border:1px solid var(--bdr);border-radius:16px;padding:12px"><div style="font-size:13px;font-weight:900;margin-bottom:8px">파싱 결과</div>';
  h+='<div style="display:flex;gap:12px;margin-bottom:10px"><div style="text-align:center"><div style="font-size:20px;font-weight:900;color:var(--success)">'+found.length+'</div><div style="font-size:9px;font-weight:800;color:var(--mut)">성공 ✅</div></div>';
  if(notFound.length)h+='<div style="text-align:center"><div style="font-size:20px;font-weight:900;color:var(--danger)">'+notFound.length+'</div><div style="font-size:9px;font-weight:800;color:var(--mut)">실패 ❌</div></div>';
  h+='</div>';
  if(found.length){h+='<div style="max-height:200px;overflow-y:auto;margin-bottom:8px">';found.forEach(function(r){h+='<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--bdr)"><div style="font-size:14px">📍</div><div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:900;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">'+(r.name||'장소')+'</div><div style="font-size:9px;color:var(--mut);font-weight:700">'+r.source+' · '+r.lat.toFixed(4)+', '+r.lng.toFixed(4)+'</div></div><div style="font-size:9px;color:var(--success);font-weight:900">✅</div></div>'});h+='</div>';}
  if(found.length)h+='<button class="btn btn-pri btn-block" onclick="confirmUrlImport()">📍 '+found.length+'개 장소 추가</button>';
  else h+='<div style="text-align:center;color:var(--danger);font-size:12px;font-weight:700;padding:8px">파싱할 수 있는 URL이 없어요</div>';
  h+='</div>';rs.innerHTML=h;
}
function confirmUrlImport(){
  var found=importResults.filter(function(r){return r.found});if(!found.length)return;
  var m={id:uid('m'),kind:'my',title:importMapName,desc:found.length+'개 장소',theme:THEMES[Math.floor(Math.random()*THEMES.length)],ver:1};
  maps.push(m);activeMapId=m.id;
  found.forEach(function(r){features.push({id:uid('f'),mapId:m.id,type:'pin',title:r.name||'장소',category:'_none',tags:[],emoji:'📍',isHl:false,geojson:{type:"Feature",geometry:{type:"Point",coordinates:[r.lng,r.lat]},properties:{}},logs:[]})});
  save();closeSheet('import');renderMapFeatures();fitToFeatures();updateStats();applyPermissionUI();toast(importMapName+' '+found.length+'개 추가!','s');
}
function importFile(e){var file=e.target.files[0];if(!file)return;var r=new FileReader();r.onload=function(ev){try{var txt=ev.target.result;if(file.name.endsWith('.json')){var d=JSON.parse(txt);if(d.maps){maps=d.maps;features=d.features||[];CATS=d.cats||[];if(d.roles)roles=d.roles;activeMapId=maps[0]?maps[0].id:''}save();renderMapFeatures();fitToFeatures();updateStats();applyPermissionUI();closeSheet('import');toast('데이터 가져오기 완료','s')}else{importGeoFile(txt,file.name)}}catch(err){toast('파일 형식 오류','e')}};r.readAsText(file);e.target.value=''}
function importGeoFile(txt,fname){var items=[];if(fname.endsWith('.kml')){var doc=new DOMParser().parseFromString(txt,'text/xml');doc.querySelectorAll('Placemark').forEach(function(pm){var name=(pm.querySelector('name')||{}).textContent||'장소';var coord=pm.querySelector('coordinates');if(coord){var parts=coord.textContent.trim().split(',');if(parts.length>=2)items.push({title:name,lng:parseFloat(parts[0]),lat:parseFloat(parts[1])})}})}else if(fname.endsWith('.gpx')){var doc=new DOMParser().parseFromString(txt,'text/xml');doc.querySelectorAll('wpt').forEach(function(wpt){items.push({title:(wpt.querySelector('name')||{}).textContent||'장소',lat:parseFloat(wpt.getAttribute('lat')||0),lng:parseFloat(wpt.getAttribute('lon')||0)})})}if(!items.length){toast('가져올 장소가 없어요','w');return}var m={id:uid('m'),kind:'my',title:'가져온 지도',desc:items.length+'개',theme:'#4F86C6',ver:1};maps.push(m);activeMapId=m.id;items.forEach(function(it){features.push({id:uid('f'),mapId:m.id,type:'pin',title:it.title,category:'_none',tags:[],emoji:'📍',isHl:false,geojson:{type:"Feature",geometry:{type:"Point",coordinates:[it.lng,it.lat]},properties:{}},logs:[]})});save();closeSheet('import');renderMapFeatures();fitToFeatures();updateStats();applyPermissionUI();toast(items.length+'개 장소 가져오기 완료!','s')}
function resetAll(){showConfirm('초기화','모든 데이터 삭제?',function(){localStorage.removeItem('loca_v2');location.reload()})}

// ══════ POSTER ══════
var FRAME_DECOS={
  cafe:{bg:'#FDF6F0',bg2:'#F5E6D8',border:'#D4A574',emojis:['☕','🍰','🧁','🍩','🥐','🍪','🫖','🥯','🎂','🍮'],accent:'#8B5E3C'},
  foodie:{bg:'#FFF8F0',bg2:'#FFE8D6',border:'#E8764B',emojis:['🍕','🍜','🍣','🍔','🌮','🥘','🍝','🫕','🥗','🍱'],accent:'#D4542B'},
  dessert:{bg:'#FFF0F5',bg2:'#FFE0EB',border:'#E891A8',emojis:['🧁','🍰','🍩','🍭','🍬','🍫','🍮','🎂','🍦','🥧'],accent:'#C4607A'},
  sushi:{bg:'#FFF5F5',bg2:'#FFE8E8',border:'#D4544B',emojis:['🍣','🍱','🍜','🍙','🥟','🍡','🍶','🥢','🍤','🍥'],accent:'#B8342B'},
  beer:{bg:'#FFFCF0',bg2:'#FFF3D4',border:'#D4960A',emojis:['🍺','🍻','🥂','🍷','🍸','🍹','🫗','🥃','🍶','🧊'],accent:'#B8800A'},
  nature:{bg:'#F0F8F0',bg2:'#DCEFD8',border:'#6BA08F',emojis:['🌿','🍀','🌱','🌳','🌲','🍃','🦋','🐛','🌻','🌼'],accent:'#4A8070'},
  ocean:{bg:'#F0F5FF',bg2:'#D8E8FF',border:'#4F86C6',emojis:['🌊','🐚','🐠','🐙','🦀','🏖️','⛵','🐬','🦑','🪸'],accent:'#3A6AA0'},
  sakura:{bg:'#FFF5F8',bg2:'#FFE8EF',border:'#E8A0B0',emojis:['🌸','🌺','💮','🏵️','🌷','🦋','🎀','💗','🌹','🪷'],accent:'#C07088'},
  autumn:{bg:'#FFF8F0',bg2:'#FFE8D0',border:'#C87830',emojis:['🍂','🍁','🍄','🌾','🎃','🦊','🌰','🥜','🍎','🍇'],accent:'#A05820'},
  winter:{bg:'#F0F5FF',bg2:'#E0EAFF',border:'#7090C0',emojis:['❄️','⛄','🎄','🎅','🦌','🎁','🧣','🧤','⭐','🔔'],accent:'#5070A0'},
  love:{bg:'#FFF0F3',bg2:'#FFE0E8',border:'#E06080',emojis:['💕','💖','💗','💘','💝','🥰','😍','💑','💐','🌹'],accent:'#C04060'},
  travel:{bg:'#F0F8FF',bg2:'#D8ECFF',border:'#4A90C0',emojis:['✈️','🗺️','🧳','🗼','🗽','⛩️','🏰','🎡','🚂','🌍'],accent:'#3070A0'},
  camping:{bg:'#F5F8F0',bg2:'#E0ECD0',border:'#708040',emojis:['🏕️','⛺','🔥','🌲','🥾','🎒','🏔️','🦌','⭐','🌙'],accent:'#506030'},
  pet:{bg:'#FFF8F0',bg2:'#FFE8D8',border:'#C08050',emojis:['🐾','🐶','🐱','🐕','🐈','🦴','🐾','🐹','🐰','🐦'],accent:'#A06030'},
  music:{bg:'#F5F0FF',bg2:'#E8DCFF',border:'#9060D0',emojis:['🎵','🎶','🎸','🎹','🎤','🥁','🎷','🎺','🎧','🪇'],accent:'#7040B0'},
  sport:{bg:'#F0FFF0',bg2:'#D8FFD8',border:'#40A040',emojis:['⚽','🏀','🎾','🏃','🚴','⛳','🏊','🥊','🎯','🏆'],accent:'#308030'},
  space:{bg:'#0D0D2B',bg2:'#151540',border:'#4040A0',emojis:['🚀','🌙','⭐','💫','🪐','🛸','👽','🌌','☄️','🌟'],accent:'#6060C0',dark:true},
  horror:{bg:'#1A0A1A',bg2:'#2A1030',border:'#8030A0',emojis:['👻','🎃','💀','🦇','🕷️','🕸️','😱','🧟','🔮','🌙'],accent:'#A050C0',dark:true},
  party:{bg:'#FFFBF0',bg2:'#FFF0D0',border:'#E8A020',emojis:['🎉','🎊','🥳','🎈','🎁','🎂','🪅','🍾','🎆','🎇'],accent:'#D08010'},
  study:{bg:'#F8F5FF',bg2:'#EDE8FF',border:'#7060A0',emojis:['📚','📖','✏️','📝','🎓','💡','🔖','📎','🖊️','🧠'],accent:'#5040A0'}
};
var THEME_FRAMES=[
  {id:'cafe',label:'카페',emoji:'☕',desc:'커피 & 디저트',cat:'theme'},
  {id:'foodie',label:'맛집투어',emoji:'🍽️',desc:'음식 가득',cat:'theme'},
  {id:'dessert',label:'디저트',emoji:'🧁',desc:'달콤한 간식',cat:'theme'},
  {id:'sushi',label:'일식',emoji:'🍣',desc:'스시 & 라멘',cat:'theme'},
  {id:'beer',label:'술집',emoji:'🍺',desc:'맥주 & 칵테일',cat:'theme'},
  {id:'nature',label:'자연',emoji:'🌿',desc:'숲 & 나뭇잎',cat:'theme'},
  {id:'ocean',label:'바다',emoji:'🌊',desc:'파도 & 조개',cat:'theme'},
  {id:'sakura',label:'벚꽃',emoji:'🌸',desc:'봄 분위기',cat:'theme'},
  {id:'autumn',label:'가을',emoji:'🍂',desc:'단풍 & 낙엽',cat:'theme'},
  {id:'winter',label:'겨울',emoji:'❄️',desc:'눈 & 크리스마스',cat:'theme'},
  {id:'love',label:'데이트',emoji:'💕',desc:'하트 & 커플',cat:'theme'},
  {id:'travel',label:'여행',emoji:'✈️',desc:'세계여행',cat:'theme'},
  {id:'camping',label:'캠핑',emoji:'🏕️',desc:'아웃도어',cat:'theme'},
  {id:'pet',label:'반려동물',emoji:'🐾',desc:'댕댕이 & 냥이',cat:'theme'},
  {id:'music',label:'음악',emoji:'🎵',desc:'뮤직 & 페스티벌',cat:'theme'},
  {id:'sport',label:'운동',emoji:'⚽',desc:'스포츠',cat:'theme'},
  {id:'space',label:'우주',emoji:'🚀',desc:'별 & 행성',cat:'theme'},
  {id:'horror',label:'귀신',emoji:'👻',desc:'할로윈 무드',cat:'theme'},
  {id:'party',label:'파티',emoji:'🎉',desc:'축하 & 생일',cat:'theme'},
  {id:'study',label:'공부',emoji:'📚',desc:'카공 & 서점',cat:'theme'}
];
var ALL_FRAMES=FRAMES.concat(THEME_FRAMES);

function getFrameById(fid){for(var i=0;i<ALL_FRAMES.length;i++){if(ALL_FRAMES[i].id===fid)return ALL_FRAMES[i]}return ALL_FRAMES[0]}
function buildFrameListHtml(cat){
  var list=ALL_FRAMES.filter(function(f){return cat==='all'||f.cat===cat});
  return list.map(function(fr){
    var sel=fr.id===selectedFrame;
    return '<div data-action="pickframe" data-fid="'+fr.id+'" style="min-width:72px;padding:8px 6px;border-radius:14px;border:2px solid '+(sel?'var(--pri)':'var(--bdr)')+';background:'+(sel?'var(--pri-lt)':'#fff')+';text-align:center;cursor:pointer;flex-shrink:0"><div style="font-size:20px">'+fr.emoji+'</div><div style="font-size:9px;font-weight:900;margin-top:2px;color:'+(sel?'var(--pri)':'var(--txt2)')+'">'+fr.label+'</div><div style="font-size:7px;color:var(--mut);font-weight:700">'+fr.desc+'</div></div>';
  }).join('');
}
function filterFrames(cat){
  frameCatFilter=cat;
  document.querySelectorAll('#frame-cat-tabs .chip').forEach(function(c){c.classList.toggle('on',c.dataset.fcat===cat)});
  document.getElementById('frame-list').innerHTML=buildFrameListHtml(cat);
}
function pickFrame(fid){
  selectedFrame=fid;
  document.getElementById('frame-list').innerHTML=buildFrameListHtml(frameCatFilter);
  applyFramePreview();
}
function applyFramePreview(){
  var am=getActiveMap();if(!am)return;
  var preview=document.getElementById('poster-preview');if(!preview)return;
  var tc=am.theme||'#C9686E';var deco=FRAME_DECOS[selectedFrame];
  var isDk=selectedFrame==='film'||selectedFrame==='dark'||selectedFrame==='neon'||(deco&&deco.dark);
  var styles={
    default:'background:linear-gradient(165deg,#fff,'+tc+'08,'+tc+'15);border:2px solid '+tc+'33',
    polaroid:'background:#fff;border:none;box-shadow:0 4px 20px rgba(0,0,0,.15)',
    film:'background:#1a1a1a;border:2px solid #333',
    minimal:'background:#fff;border:1px solid #e0e0e0',
    dark:'background:linear-gradient(165deg,#1a1a2e,#16213e,#0f3460);border:2px solid #333',
    vintage:'background:linear-gradient(165deg,#f5e6d3,#e8d5b7,#d4c4a8);border:2px solid #c4a882',
    stamp:'background:#fff;border:3px dashed '+tc,
    neon:'background:linear-gradient(165deg,#0a0a1a,#1a0a2e,#0a1a2e);border:2px solid '+tc
  };
  if(deco){
    preview.style.cssText='width:100%;aspect-ratio:4/5;border-radius:22px;display:flex;flex-direction:column;overflow:hidden;position:relative;z-index:1;background:linear-gradient(165deg,'+deco.bg+','+deco.bg2+');border:2.5px solid '+deco.border;
  }else{
    preview.style.cssText='width:100%;aspect-ratio:4/5;border-radius:22px;display:flex;flex-direction:column;overflow:hidden;position:relative;z-index:1;'+(styles[selectedFrame]||styles['default']);
  }
  var titleEl=document.getElementById('poster-title-el');
  var logoEl=document.getElementById('poster-logo-el');
  if(titleEl)titleEl.style.color=isDk?'#fff':'';
  if(logoEl)logoEl.style.color=isDk?tc:tc;
}
// Sticker system
function addStickerToLayer(emoji){
  var layer=document.getElementById(stickerTarget);if(!layer)return;
  var rect=layer.getBoundingClientRect();if(rect.width<10||rect.height<10)return;
  var x=(rect.width/2)-15,y=(rect.height/2)-15,rot=Math.round(Math.random()*30-15),size=30;
  var el=document.createElement('div');el.textContent=emoji;el.dataset.rot=String(rot);el.dataset.size=String(size);
  el.style.cssText='position:absolute;left:'+x+'px;top:'+y+'px;font-size:'+size+'px;cursor:grab;user-select:none;pointer-events:auto;z-index:20;filter:drop-shadow(0 2px 4px rgba(0,0,0,.15));line-height:1;transform:rotate('+rot+'deg);transition:transform .15s,font-size .15s';
  el.addEventListener('mousedown',function(ev){stickerDragStart(ev,el)});
  el.addEventListener('touchstart',function(ev){stickerDragStart(ev,el)},{passive:false});
  el.addEventListener('dblclick',function(){removeStickerEl(el)});
  var lt=0;el.addEventListener('touchend',function(){var now=Date.now();if(now-lt<300)removeStickerEl(el);lt=now});
  el.addEventListener('click',function(ev){ev.stopPropagation();selectSticker(el)});
  layer.appendChild(el);
  el.style.transform='rotate('+rot+'deg) scale(1.3)';
  setTimeout(function(){el.style.transform='rotate('+rot+'deg) scale(1)'},150);
  selectSticker(el);
}
function removeStickerEl(el){if(el===activeSticker)deselectSticker();el.style.transform+=' scale(0)';el.style.opacity='0';setTimeout(function(){el.remove()},200)}
function clearAllStickers(){deselectSticker();var layer=document.getElementById(stickerTarget);if(layer)layer.innerHTML=''}
function selectSticker(el){if(activeSticker&&activeSticker!==el)activeSticker.style.outline='none';activeSticker=el;el.style.outline='2px solid var(--pri)';el.style.outlineOffset='2px';el.style.borderRadius='6px';var ep=document.getElementById('sticker-edit');if(!ep)return;ep.style.display='block';document.getElementById('sticker-edit-preview').textContent=el.textContent;document.getElementById('sticker-size').value=parseInt(el.dataset.size)||30;document.getElementById('sticker-rot').value=parseInt(el.dataset.rot)||0;document.getElementById('sticker-size-val').textContent=(parseInt(el.dataset.size)||30)+'';document.getElementById('sticker-rot-val').textContent=(parseInt(el.dataset.rot)||0)+'°'}
function deselectSticker(){if(activeSticker){activeSticker.style.outline='none';activeSticker=null}var ep=document.getElementById('sticker-edit');if(ep)ep.style.display='none'}
function onStickerSize(val){if(!activeSticker)return;activeSticker.dataset.size=val;activeSticker.style.fontSize=val+'px';document.getElementById('sticker-size-val').textContent=val}
function onStickerRot(val){if(!activeSticker)return;activeSticker.dataset.rot=val;activeSticker.style.transform='rotate('+val+'deg)';document.getElementById('sticker-rot-val').textContent=val+'°'}
function stickerDragStart(e,el){e.preventDefault();e.stopPropagation();dragSticker=el;el.style.cursor='grabbing';el.style.zIndex='30';el.style.transition='none';el.style.filter='drop-shadow(0 4px 10px rgba(0,0,0,.25))';var layer=document.getElementById(stickerTarget);if(!layer)return;var rect=layer.getBoundingClientRect();var cx=e.touches?e.touches[0].clientX:e.clientX;var cy=e.touches?e.touches[0].clientY:e.clientY;dragOff={x:cx-el.offsetLeft-rect.left,y:cy-el.offsetTop-rect.top}}
document.addEventListener('mousemove',function(e){if(!dragSticker)return;e.preventDefault();var layer=document.getElementById(stickerTarget);if(!layer)return;var r=layer.getBoundingClientRect();dragSticker.style.left=Math.max(-10,Math.min(r.width-20,e.clientX-r.left-dragOff.x))+'px';dragSticker.style.top=Math.max(-10,Math.min(r.height-20,e.clientY-r.top-dragOff.y))+'px'});
document.addEventListener('touchmove',function(e){if(!dragSticker)return;e.preventDefault();var layer=document.getElementById(stickerTarget);if(!layer)return;var r=layer.getBoundingClientRect();var t=e.touches[0];dragSticker.style.left=Math.max(-10,Math.min(r.width-20,t.clientX-r.left-dragOff.x))+'px';dragSticker.style.top=Math.max(-10,Math.min(r.height-20,t.clientY-r.top-dragOff.y))+'px'},{passive:false});
document.addEventListener('mouseup',function(){if(!dragSticker)return;dragSticker.style.cursor='grab';dragSticker.style.zIndex='20';dragSticker.style.filter='drop-shadow(0 2px 4px rgba(0,0,0,.15))';dragSticker.style.transition='transform .15s,font-size .15s';selectSticker(dragSticker);dragSticker=null});
document.addEventListener('touchend',function(){if(!dragSticker)return;dragSticker.style.cursor='grab';dragSticker.style.zIndex='20';dragSticker.style.filter='drop-shadow(0 2px 4px rgba(0,0,0,.15))';dragSticker.style.transition='transform .15s,font-size .15s';dragSticker=null});
document.addEventListener('click',function(e){var item=e.target.closest('.stk-item');if(!item)return;var ci=parseInt(item.dataset.cat);var ii=parseInt(item.dataset.idx);if(isNaN(ci)||isNaN(ii))return;var emoji=STICKER_CATS[ci]&&STICKER_CATS[ci].items[ii];if(emoji)addStickerToLayer(emoji)});
document.addEventListener('click',function(e){if(!activeSticker)return;if(e.target.closest('.stk-item')||e.target.closest('#sticker-edit'))return;var layer=document.getElementById(stickerTarget);if(layer&&layer.contains(e.target))return;if(e.target.closest('#poster-outer'))deselectSticker()});
document.addEventListener('click',function(e){var fb=e.target.closest('[data-action="pickframe"]');if(fb)pickFrame(fb.dataset.fid)});
function switchStickerCat(idx){stickerCatIdx=idx;document.querySelectorAll('#sticker-cat-tabs .chip').forEach(function(c){c.classList.toggle('on',c.dataset.stab==idx)});var box=document.getElementById('sticker-items');box.innerHTML='';STICKER_CATS[idx].items.forEach(function(s,i){var d=document.createElement('div');d.className='stk-item';d.textContent=s;d.dataset.idx=String(i);d.dataset.cat=String(idx);box.appendChild(d)})}

// QR
function buildSharePayload(mapObj,feats){var center=[0,0],n=0;feats.forEach(function(f){var g=f.geojson&&f.geojson.geometry;if(!g)return;if(g.type==='Point'){center[0]+=g.coordinates[0];center[1]+=g.coordinates[1];n++}});if(n){center[0]/=n;center[1]/=n}return{v:1,t:mapObj.title,d:mapObj.desc||'',c:mapObj.theme,center:[+center[0].toFixed(5),+center[1].toFixed(5)],pins:feats.filter(function(f){return f.type==='pin'}).slice(0,20).map(function(f){var g=f.geojson.geometry;return{n:f.title,e:f.emoji||'📍',p:[+g.coordinates[0].toFixed(5),+g.coordinates[1].toFixed(5)],h:f.isHl?1:0}})}}
function getShareUrl(mapObj,feats){return'https://loca.app/m/'+btoa(unescape(encodeURIComponent(JSON.stringify(buildSharePayload(mapObj,feats)))))}
function makeQRDataUrl(text,size){try{var errLvl=text.length>600?'L':'M';var qr2=qrcode(0,errLvl);qr2.addData(text,'Byte');qr2.make();var mc=qr2.getModuleCount();var cv2=document.createElement('canvas');var cs=Math.max(2,Math.floor(size/mc));cv2.width=mc*cs;cv2.height=mc*cs;var c2=cv2.getContext('2d');c2.fillStyle='#fff';c2.fillRect(0,0,cv2.width,cv2.height);c2.fillStyle='#000';for(var r=0;r<mc;r++)for(var cl=0;cl<mc;cl++)if(qr2.isDark(r,cl))c2.fillRect(cl*cs,r*cs,cs,cs);return{url:cv2.toDataURL(),w:cv2.width,h:cv2.height}}catch(e){return null}}

// Poster map
function initPosterMap(cid,lat,lng,zoom,fs,theme){if(posterMapInst){try{posterMapInst.remove()}catch(e){}posterMapInst=null}var el=document.getElementById(cid);if(!el)return;el.style.position='relative';el.innerHTML='';var md=document.createElement('div');md.style.cssText='width:100%;height:100%;position:absolute;top:0;left:0';el.appendChild(md);posterMapInst=L.map(md,{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:false,boxZoom:false,keyboard:false}).setView([lat,lng],zoom);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(posterMapInst);var pg=L.layerGroup().addTo(posterMapInst);var bounds=[];fs.forEach(function(f){var g=f.geojson&&f.geojson.geometry;if(!g)return;if(g.type==='Point'){var ll=[g.coordinates[1],g.coordinates[0]];bounds.push(ll);var h2='<div style="width:28px;height:28px;border-radius:14px;background:'+(f.isHl?theme:'#fff')+';border:2px solid '+theme+';display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.2)">'+(f.emoji||'📍')+'</div>';L.marker(ll,{icon:L.divIcon({html:h2,className:'',iconSize:[28,28],iconAnchor:[14,14]})}).addTo(pg)}else if(g.type==='LineString'){var ll2=g.coordinates.map(function(p){return[p[1],p[0]]});ll2.forEach(function(p){bounds.push(p)});L.polyline(ll2,{color:theme,weight:3}).addTo(pg)}else if(g.type==='Polygon'){var ll3=g.coordinates[0].map(function(p){return[p[1],p[0]]});ll3.forEach(function(p){bounds.push(p)});L.polygon(ll3,{color:theme,fillColor:theme,fillOpacity:.15,weight:2}).addTo(pg)}});function refresh(){if(!posterMapInst)return;posterMapInst.invalidateSize();if(bounds.length>1)posterMapInst.fitBounds(bounds,{padding:[20,20],maxZoom:16});else posterMapInst.setView([lat,lng],zoom)}setTimeout(refresh,200);setTimeout(refresh,600);setTimeout(refresh,1200)}

// Show poster sheet
function showShareSheet(){
  var am=getActiveMap();if(!am)return;var fs=getMapFeatures();
  var pins=fs.filter(function(f){return f.type==='pin'});
  var hlPins=pins.filter(function(f){return f.isHl});
  var center=lmap.getCenter();var zoom=lmap.getZoom();
  var body=document.getElementById('poster-body');
  var h='';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><div style="font-size:15px;font-weight:900">📤 포스터 꾸미기</div><div style="display:flex;gap:6px"><button class="btn btn-danger" style="padding:5px 10px;font-size:10px" onclick="clearAllStickers()">🗑 초기화</button><button class="btn btn-out" style="padding:5px 10px;font-size:10px" onclick="closeSheet(\'poster\')">✕</button></div></div>';
  // Preview
  h+='<div id="poster-outer" style="width:100%;position:relative;margin-bottom:12px">';
  h+='<div id="poster-preview" style="width:100%;aspect-ratio:4/5;background:linear-gradient(165deg,#fff,'+am.theme+'08,'+am.theme+'15);border:2px solid '+am.theme+'33;border-radius:22px;display:flex;flex-direction:column;overflow:hidden;position:relative;z-index:1">';
  h+='<div style="padding:18px 18px 0;text-align:center;flex-shrink:0"><div id="poster-logo-el" style="font-size:10px;font-weight:900;color:'+am.theme+';letter-spacing:2px">LOCA</div><div id="poster-title-el" style="font-size:18px;font-weight:900;margin-top:3px">'+am.title+'</div>'+(am.desc?'<div style="font-size:10px;color:var(--mut);font-weight:700;margin-top:2px">'+am.desc+'</div>':'')+'</div>';
  h+='<div id="poster-map-wrap" style="flex:1;margin:10px 14px 0;border-radius:14px;overflow:hidden;border:1px solid '+am.theme+'33;min-height:0;position:relative"></div>';
  if(hlPins.length){h+='<div style="display:flex;justify-content:center;gap:4px;flex-wrap:wrap;padding:0 14px 4px">'+hlPins.slice(0,4).map(function(f){return'<span style="background:rgba(255,255,255,.8);border:1px solid '+am.theme+'33;border-radius:10px;padding:2px 7px;font-size:8px;font-weight:900">'+(f.emoji||'📍')+' '+f.title+'</span>'}).join('')+'</div>';}
  h+='<div style="text-align:center;padding:4px 0 12px;font-size:7px;color:var(--mut);font-weight:700">Made with LOCA 🗺</div></div>';
  h+='<div id="sticker-layer" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:50;pointer-events:none;overflow:visible"></div></div>';
  // Frames
  h+='<div style="background:var(--srf);border:1px solid var(--bdr);border-radius:18px;padding:10px 12px;margin-bottom:10px">';
  h+='<div style="font-size:12px;font-weight:900;margin-bottom:6px">🖼️ 프레임 선택</div>';
  h+='<div style="display:flex;gap:4px;margin-bottom:8px" id="frame-cat-tabs"><span class="chip on" data-fcat="all" onclick="filterFrames(\'all\')">전체</span><span class="chip" data-fcat="basic" onclick="filterFrames(\'basic\')">기본</span><span class="chip" data-fcat="theme" onclick="filterFrames(\'theme\')">테마</span></div>';
  h+='<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px" id="frame-list">'+buildFrameListHtml('all')+'</div></div>';
  // Stickers
  h+='<div style="background:var(--srf);border:1px solid var(--bdr);border-radius:18px;padding:10px 12px;margin-bottom:10px">';
  h+='<div style="font-size:12px;font-weight:900;margin-bottom:6px">🎨 스티커 붙이기</div>';
  h+='<div style="display:flex;gap:4px;margin-bottom:8px;overflow-x:auto" id="sticker-cat-tabs">'+STICKER_CATS.map(function(c,i){return'<span class="chip '+(i===0?'on':'')+'" data-stab="'+i+'" onclick="switchStickerCat('+i+')">'+c.label+'</span>'}).join('')+'</div>';
  h+='<div id="sticker-items" style="display:flex;gap:4px;flex-wrap:wrap"></div>';
  h+='<div style="font-size:9px;color:var(--mut);font-weight:700;margin-top:6px">탭→추가 · 클릭→선택 · 드래그→이동 · 더블클릭→삭제</div>';
  h+='<div id="sticker-edit" style="display:none;margin-top:8px;padding-top:8px;border-top:1px solid var(--bdr)">';
  h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span id="sticker-edit-preview" style="font-size:24px;line-height:1"></span><span style="font-size:11px;font-weight:900;color:var(--pri)">선택된 스티커</span></div>';
  h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="font-size:10px;font-weight:800;color:var(--txt2);width:32px">크기</span><input type="range" id="sticker-size" min="16" max="64" value="30" style="flex:1;accent-color:var(--pri)" oninput="onStickerSize(this.value)"><span id="sticker-size-val" style="font-size:10px;font-weight:800;color:var(--mut);width:28px;text-align:right">30</span></div>';
  h+='<div style="display:flex;align-items:center;gap:8px"><span style="font-size:10px;font-weight:800;color:var(--txt2);width:32px">회전</span><input type="range" id="sticker-rot" min="-180" max="180" value="0" style="flex:1;accent-color:var(--sec)" oninput="onStickerRot(this.value)"><span id="sticker-rot-val" style="font-size:10px;font-weight:800;color:var(--mut);width:28px;text-align:right">0°</span></div>';
  h+='</div></div>';
  // Save buttons
  h+='<div class="gap-8"><button class="btn btn-pri" style="flex:1" onclick="savePosterAsImage(true)">💾 QR 포함 저장</button><button class="btn btn-sec" style="flex:1" onclick="savePosterAsImage(false)">💾 QR 없이 저장</button></div>';
  body.innerHTML=h;openSheet('poster');
  stickerTarget='sticker-layer';activeSticker=null;
  setTimeout(function(){switchStickerCat(0);initPosterMap('poster-map-wrap',center.lat,center.lng,zoom,fs,am.theme)},400);
}

// Save poster as image
function roundRect(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();if(fill)ctx.fill();if(stroke)ctx.stroke()}
function savePosterAsImage(includeQR){
  var am=getActiveMap();if(!am)return;var fs=getMapFeatures();
  var pins=fs.filter(function(f){return f.type==='pin'});var hlPins=pins.filter(function(f){return f.isHl});
  if(activeSticker)activeSticker.style.outline='none';
  toast('이미지 생성 중…','w');
  var W=1080,H=1350,cv=document.createElement('canvas');cv.width=W;cv.height=H;var ctx=cv.getContext('2d');
  var tc=am.theme||'#C9686E';var fr=selectedFrame;var deco=FRAME_DECOS[fr];
  var isDark=fr==='film'||fr==='dark'||fr==='neon'||(deco&&deco.dark);
  var titleColor=isDark?'#fff':'#2C2925';var logoColor=isDark?tc:tc;
  // BG
  if(deco){
    var gt=ctx.createLinearGradient(0,0,W,H);gt.addColorStop(0,deco.bg);gt.addColorStop(1,deco.bg2);ctx.fillStyle=gt;roundRect(ctx,0,0,W,H,40,true);
    ctx.strokeStyle=deco.border;ctx.lineWidth=5;roundRect(ctx,3,3,W-6,H-6,38,false,true);
    var emjs=deco.emojis;var positions=[];
    for(var ei=0;ei<8;ei++){positions.push({x:60+ei*(W-120)/7,y:12+Math.random()*30,r:Math.random()*40-20,s:28+Math.random()*18});positions.push({x:60+ei*(W-120)/7,y:H-45+Math.random()*25,r:Math.random()*40-20,s:28+Math.random()*18})}
    for(var ei=0;ei<6;ei++){positions.push({x:5+Math.random()*25,y:120+ei*(H-240)/5,r:Math.random()*40-20,s:24+Math.random()*16});positions.push({x:W-35+Math.random()*20,y:120+ei*(H-240)/5,r:Math.random()*40-20,s:24+Math.random()*16})}
    ctx.globalAlpha=0.6;positions.forEach(function(p){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r*Math.PI/180);ctx.font=Math.round(p.s)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(emjs[Math.floor(Math.random()*emjs.length)],0,0);ctx.restore()});ctx.globalAlpha=1;
    logoColor=deco.accent;
  }else if(fr==='default'){var gd=ctx.createLinearGradient(0,0,W,H);gd.addColorStop(0,'#fff');gd.addColorStop(0.5,tc+'15');gd.addColorStop(1,tc+'25');ctx.fillStyle=gd;roundRect(ctx,0,0,W,H,40,true);ctx.strokeStyle=tc+'55';ctx.lineWidth=4;roundRect(ctx,2,2,W-4,H-4,40,false,true)}
  else if(fr==='polaroid'){ctx.fillStyle='#fff';roundRect(ctx,0,0,W,H,12,true)}
  else if(fr==='film'){ctx.fillStyle='#1a1a1a';roundRect(ctx,0,0,W,H,20,true);ctx.fillStyle='#333';for(var fi=0;fi<18;fi++){roundRect(ctx,20,30+fi*74,36,50,6,true);roundRect(ctx,W-56,30+fi*74,36,50,6,true)}}
  else if(fr==='minimal'){ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#e0e0e0';ctx.lineWidth=2;ctx.strokeRect(1,1,W-2,H-2)}
  else if(fr==='dark'){var gd2=ctx.createLinearGradient(0,0,W,H);gd2.addColorStop(0,'#1a1a2e');gd2.addColorStop(0.5,'#16213e');gd2.addColorStop(1,'#0f3460');ctx.fillStyle=gd2;roundRect(ctx,0,0,W,H,40,true)}
  else if(fr==='vintage'){var gv=ctx.createLinearGradient(0,0,W,H);gv.addColorStop(0,'#f5e6d3');gv.addColorStop(1,'#d4c4a8');ctx.fillStyle=gv;roundRect(ctx,0,0,W,H,40,true);ctx.strokeStyle='#c4a882';ctx.lineWidth=4;roundRect(ctx,2,2,W-4,H-4,40,false,true)}
  else if(fr==='stamp'){ctx.fillStyle='#fff';roundRect(ctx,0,0,W,H,8,true);ctx.setLineDash([12,8]);ctx.strokeStyle=tc;ctx.lineWidth=6;roundRect(ctx,18,18,W-36,H-36,4,false,true);ctx.setLineDash([])}
  else if(fr==='neon'){var gn=ctx.createLinearGradient(0,0,W,H);gn.addColorStop(0,'#0a0a1a');gn.addColorStop(1,'#0a1a2e');ctx.fillStyle=gn;roundRect(ctx,0,0,W,H,40,true);ctx.shadowColor=tc;ctx.shadowBlur=20;ctx.strokeStyle=tc;ctx.lineWidth=3;roundRect(ctx,8,8,W-16,H-16,36,false,true);ctx.shadowBlur=0}
  // QR
  var qrData=null;if(includeQR){qrData=makeQRDataUrl(getShareUrl(am,fs),200)}
  // Title
  ctx.fillStyle=logoColor;ctx.font='900 28px sans-serif';ctx.textAlign='left';ctx.fillText('LOCA',50,70);
  ctx.fillStyle=titleColor;ctx.font='900 52px sans-serif';ctx.fillText(am.title,50,135);
  if(am.desc){ctx.fillStyle=isDark?'#aaa':'#9C9590';ctx.font='700 28px sans-serif';ctx.fillText(am.desc,50,178)}
  // QR top-right
  if(qrData){var qs=110,qx=W-qs-50,qy=30;ctx.fillStyle='#fff';roundRect(ctx,qx-10,qy-10,qs+20,qs+38,14,true);var qi=new Image();qi.src=qrData.url;ctx.drawImage(qi,qx,qy,qs,qs);ctx.fillStyle='#9C9590';ctx.font='700 14px sans-serif';ctx.textAlign='center';ctx.fillText('QR로 지도 열기',qx+qs/2,qy+qs+20);ctx.textAlign='left'}
  // Map area
  var mX=50,mY=210,mW=W-100,mH=H-420;
  ctx.fillStyle=isDark?'#2a2a3a':'#E8E4E0';roundRect(ctx,mX,mY,mW,mH,30,true);ctx.strokeStyle=tc+'44';ctx.lineWidth=2;roundRect(ctx,mX,mY,mW,mH,30,false,true);
  var allC=[];fs.forEach(function(f){var g=f.geojson&&f.geojson.geometry;if(!g)return;if(g.type==='Point')allC.push(g.coordinates);else if(g.type==='LineString')g.coordinates.forEach(function(c){allC.push(c)});else if(g.type==='Polygon')g.coordinates[0].forEach(function(c){allC.push(c)})});
  if(allC.length){var mnLng=Infinity,mxLng=-Infinity,mnLat=Infinity,mxLat=-Infinity;allC.forEach(function(c){if(c[0]<mnLng)mnLng=c[0];if(c[0]>mxLng)mxLng=c[0];if(c[1]<mnLat)mnLat=c[1];if(c[1]>mxLat)mxLat=c[1]});var pf=.15;var dLng=(mxLng-mnLng)*pf||.005;var dLat=(mxLat-mnLat)*pf||.005;mnLng-=dLng;mxLng+=dLng;mnLat-=dLat;mxLat+=dLat;
  function toX(lng){return mX+20+((lng-mnLng)/(mxLng-mnLng))*(mW-40)}function toY(lat){return mY+20+((mxLat-lat)/(mxLat-mnLat))*(mH-40)}
  ctx.strokeStyle=isDark?'#3a3a4a':'#D4D0CC';ctx.lineWidth=1;for(var gi=0;gi<5;gi++){var gy2=mY+mH*gi/4;ctx.beginPath();ctx.moveTo(mX,gy2);ctx.lineTo(mX+mW,gy2);ctx.stroke();var gx2=mX+mW*gi/4;ctx.beginPath();ctx.moveTo(gx2,mY);ctx.lineTo(gx2,mY+mH);ctx.stroke()}
  fs.forEach(function(f){var g=f.geojson&&f.geojson.geometry;if(!g||g.type!=='LineString')return;ctx.strokeStyle=tc;ctx.lineWidth=5;ctx.lineJoin='round';ctx.beginPath();g.coordinates.forEach(function(c,i){var px=toX(c[0]),py=toY(c[1]);if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py)});ctx.stroke()});
  fs.forEach(function(f){var g=f.geojson&&f.geojson.geometry;if(!g||g.type!=='Polygon')return;ctx.fillStyle=tc+'22';ctx.strokeStyle=tc;ctx.lineWidth=3;ctx.beginPath();g.coordinates[0].forEach(function(c,i){var px=toX(c[0]),py=toY(c[1]);if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py)});ctx.closePath();ctx.fill();ctx.stroke()});
  pins.forEach(function(f){var g=f.geojson&&f.geojson.geometry;if(!g)return;var px=toX(g.coordinates[0]),py=toY(g.coordinates[1]);ctx.beginPath();ctx.arc(px,py,22,0,Math.PI*2);ctx.fillStyle=f.isHl?tc:'#fff';ctx.fill();ctx.strokeStyle=tc;ctx.lineWidth=4;ctx.stroke();ctx.fillStyle=f.isHl?'#fff':'#333';ctx.font='28px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(f.emoji||'📍',px,py);ctx.textBaseline='alphabetic';ctx.textAlign='left'})}
  // Highlight labels
  if(hlPins.length){var hlY2=mY+mH+55;ctx.font='900 24px sans-serif';ctx.textAlign='center';var tw2=hlPins.slice(0,4).reduce(function(s,f){return s+ctx.measureText((f.emoji||'📍')+' '+f.title).width+40},0);var hlX2=(W-tw2)/2;hlPins.slice(0,4).forEach(function(f){var txt=(f.emoji||'📍')+' '+f.title;var w=ctx.measureText(txt).width+40;ctx.fillStyle='rgba(255,255,255,0.8)';roundRect(ctx,hlX2,hlY2-22,w,36,18,true);ctx.fillStyle='#2C2925';ctx.textAlign='left';ctx.fillText(txt,hlX2+20,hlY2+3);hlX2+=w+10});ctx.textAlign='left'}
  // Stickers on canvas
  var layer=document.getElementById(stickerTarget);if(layer){var outerEl=document.getElementById('poster-outer');var oW=outerEl?outerEl.offsetWidth:1;var oH=outerEl?outerEl.offsetHeight:1;var sX=W/oW,sY=H/oH;for(var si=0;si<layer.children.length;si++){var s=layer.children[si];var sx=parseFloat(s.style.left)*sX;var sy=parseFloat(s.style.top)*sY;var sz=parseFloat(s.dataset.size||30)*sX;var sr=parseFloat(s.dataset.rot||0);ctx.save();ctx.translate(sx+sz/2,sy+sz/2);ctx.rotate(sr*Math.PI/180);ctx.font=Math.round(sz)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s.textContent,0,0);ctx.restore()}}
  // Footer
  ctx.fillStyle='#9C9590';ctx.font='700 20px sans-serif';ctx.textAlign='center';ctx.fillText('Made with LOCA 🗺',W/2,H-30);
  // Export
  var imgUrl=cv.toDataURL('image/png');
  try{var a=document.createElement('a');a.download='LOCA_'+iso()+'.png';a.href=imgUrl;a.click()}catch(e){}
  var sd=document.getElementById('poster-save-result');if(sd)sd.remove();
  sd=document.createElement('div');sd.id='poster-save-result';sd.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.9);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px';
  sd.innerHTML='<div style="color:#fff;font-size:14px;font-weight:900;margin-bottom:12px">📸 이미지를 길게 눌러 저장하세요</div><img src="'+imgUrl+'" style="max-width:85%;max-height:70vh;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.5)"><button class="btn" style="margin-top:14px;background:#fff;color:#333" onclick="document.getElementById(\'poster-save-result\').remove()">닫기</button>';
  document.body.appendChild(sd);toast('포스터 생성 완료!','s');
}

// ══════ INIT ══════
function init(){loadData();initMap();renderMapFeatures();fitToFeatures();updateStats();applyPermissionUI();renderFilterChips();maps.forEach(function(m){if(m.kind==='our'&&!roles[m.id])roles[m.id]='owner'})}
document.addEventListener('DOMContentLoaded',init);

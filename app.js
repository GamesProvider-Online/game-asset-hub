const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const state = {
  manifest: null,
  providers: [],
  selectedProvider: '',
  selectedCount: 3,
  gamePool: [],
  generated: [],
  nameCache: new Map()
};

function encPath(path){
  return String(path).split('/').map(seg=>{
    if(seg==='' || seg==='.' || seg==='..') return seg;
    return encodeURIComponent(seg);
  }).join('/');
}

function basename(path){
  return String(path || '').split('/').pop() || '';
}

function stripExt(file){
  return String(file || '').replace(/\.[^.]+$/,'');
}

function normalizeCode(v){
  return stripExt(String(v || '')).trim().toLowerCase();
}

function prettyFallbackName(code){
  let s = stripExt(String(code || ''));
  s = s.replace(/^vs\d+/i,'');
  s = s.replace(/^cs\d+/i,'');
  s = s.replace(/[_-]+/g,' ');
  s = s.replace(/([a-z])([A-Z])/g,'$1 $2');
  s = s.replace(/\s+/g,' ').trim();
  return s ? s.replace(/\b\w/g, m => m.toUpperCase()) : 'Unknown Game';
}

function absoluteUrl(rel){
  return new URL(encPath(rel), location.href).href;
}

async function fetchJson(path){
  const res = await fetch(encPath(path) + '?v=' + Date.now());
  if(!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

async function init(){
  bindBaseEvents();
  await loadManifest();
  fillProviderSelect();

  const defaultProvider = state.providers.find(p => p.name === 'PRAGMATIC PLAY')?.name
    || state.providers[0]?.name
    || '';

  if(defaultProvider){
    $('#providerSelect').value = defaultProvider;
    await loadProvider(defaultProvider);
  }
}

function bindBaseEvents(){
  $('#providerSelect').addEventListener('change', async e => {
    await loadProvider(e.target.value);
  });

  $$('#countButtons .count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedCount = Number(btn.dataset.count);
      $$('#countButtons .count-btn').forEach(x => x.classList.toggle('active', x === btn));
    });
  });

  $('#generateBtn').addEventListener('click', generateTips);
  $('#copyTextBtn').addEventListener('click', copyGeneratedText);
  $('#clearBtn').addEventListener('click', clearGenerated);
}

async function loadManifest(){
  const json = await fetchJson('../data/manifest.json');
  state.manifest = json;
  state.providers = (json.providers || []).slice().sort((a,b)=>String(a.name).localeCompare(String(b.name)));
}

function fillProviderSelect(){
  const sel = $('#providerSelect');
  sel.innerHTML = state.providers.map(p =>
    `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`
  ).join('');
}

async function loadProvider(providerName){
  state.selectedProvider = providerName;
  state.generated = [];

  const providerObj = state.providers.find(p => p.name === providerName);
  if(!providerObj){
    renderEmpty('Provider not found.');
    return;
  }

  const nameMap = await loadNameMap(providerName);
  const games = normalizeGames(providerObj, nameMap);

  state.gamePool = games;
  renderProviderHead(providerObj, games.length);
  renderEmpty('Please click <b>Generate</b> to create tips.');
  $('#generatedText').value = '';
  $('#resultInfo').textContent = `${games.length} game(s) loaded for ${providerName}`;
}

async function loadNameMap(providerName){
  if(state.nameCache.has(providerName)) return state.nameCache.get(providerName);

  let data = null;
  const path = `../data/game-names/${providerName}.json`;

  try{
    data = await fetchJson(path);
  }catch(e){
    state.nameCache.set(providerName, {});
    return {};
  }

  const out = {};

  if(Array.isArray(data)){
    data.forEach(item => {
      const code = normalizeCode(item?.code || item?.file || item?.id);
      const name = String(item?.name || item?.title || '').trim();
      if(code && name) out[code] = name;
    });
  }else if(data && Array.isArray(data.games)){
    data.games.forEach(item => {
      const code = normalizeCode(item?.code || item?.file || item?.id);
      const name = String(item?.name || item?.title || '').trim();
      if(code && name) out[code] = name;
    });
  }else if(data && data.names && typeof data.names === 'object' && !Array.isArray(data.names)){
    Object.entries(data.names).forEach(([k,v]) => {
      const code = normalizeCode(k);
      const name = String(v || '').trim();
      if(code && name) out[code] = name;
    });
  }else if(data && typeof data === 'object'){
    Object.entries(data).forEach(([k,v]) => {
      if(typeof v === 'string'){
        const code = normalizeCode(k);
        const name = v.trim();
        if(code && name) out[code] = name;
      }
    });
  }

  state.nameCache.set(providerName, out);
  return out;
}

function normalizeGames(providerObj, nameMap){
  const rawGames = Array.isArray(providerObj.games) ? providerObj.games : [];
  const seen = new Set();

  const list = rawGames.map(item => {
    let path = '';
    let file = '';
    let rawName = '';

    if(typeof item === 'string'){
      path = item;
      file = basename(item);
      rawName = stripExt(file);
    }else{
      path = item.path || item.src || item.url || '';
      file = item.file || basename(path);
      rawName = item.name || item.title || stripExt(file);
      if(!path && providerObj.name && file){
        path = `assets/game-providers/${providerObj.name}/LIST/${file}`;
      }
    }

    const code = normalizeCode(file || rawName);
    const displayName = nameMap[code] || prettyFallbackName(rawName);

    return {
      provider: providerObj.name,
      path,
      file,
      code,
      displayName
    };
  }).filter(g => {
    if(!g.path || seen.has(g.path)) return false;
    seen.add(g.path);
    return true;
  });

  return list;
}

function renderProviderHead(providerObj, count){
  const logoBox = $('#providerLogoBox');
  const logos = Array.isArray(providerObj.logos) ? providerObj.logos : [];
  const firstLogo = logos[0];

  logoBox.innerHTML = firstLogo
    ? `<img src="${encPath(firstLogo)}" alt="${escapeHtml(providerObj.name)}">`
    : '🎮';

  $('#providerTitle').textContent = providerObj.name;
  $('#providerInfo').textContent = `${count.toLocaleString()} game image(s) loaded`;
  $('#loadedProviderBadge').textContent = `Loaded: ${providerObj.name}`;
  $('#loadedCountBadge').textContent = `${count.toLocaleString()} games loaded`;
}

function generateTips(){
  const provider = state.selectedProvider;
  if(!provider || !state.gamePool.length){
    renderEmpty('No game data found for this provider.');
    return;
  }

  let min = parseFloat($('#minPct').value);
  let max = parseFloat($('#maxPct').value);

  if(!Number.isFinite(min)) min = 90;
  if(!Number.isFinite(max)) max = 99.98;
  if(min < 90) min = 90;
  if(max > 99.98) max = 99.98;
  if(min > max) [min, max] = [max, min];

  const count = Math.max(1, Math.min(5, state.selectedCount, state.gamePool.length));
  const picked = shuffle(state.gamePool.slice()).slice(0, count).map((g, idx) => ({
    ...g,
    no: idx + 1,
    percentage: randomPct(min, max)
  }));

  state.generated = picked;

  $('#resultInfo').textContent = `${picked.length} game(s) generated for ${provider}`;
  $('#generatedText').value = buildOutputText(provider, picked);

  renderCards(picked);
}

function renderCards(items){
  const wrap = $('#resultCards');

  if(!items.length){
    renderEmpty('No generated result.');
    return;
  }

  wrap.innerHTML = items.map(g => `
    <article class="card">
      <div class="thumb">
        <img src="${encPath(g.path)}" alt="${escapeHtml(g.displayName)}">
      </div>
      <div class="body">
        <div class="title">${g.no}) ${escapeHtml(g.displayName)}</div>
        <div class="sub">${escapeHtml(g.provider)} · ${escapeHtml(g.file)}</div>
        <div class="rate"><span class="dot"></span> ${g.percentage}%</div>
        <div class="card-actions">
          <button class="action copy-name" data-copy-name="${escapeAttr(g.displayName)}">Copy Name</button>
          <button class="action copy-url" data-copy-url="${escapeAttr(g.path)}">Copy URL</button>
          <a class="action open-link" href="${encPath(g.path)}" target="_blank">Open</a>
        </div>
      </div>
    </article>
  `).join('');

  $$('[data-copy-name]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await copyText(btn.dataset.copyName, btn);
    });
  });

  $$('[data-copy-url]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await copyText(absoluteUrl(btn.dataset.copyUrl), btn);
    });
  });
}

function buildOutputText(provider, items){
  const lines = [];
  lines.push(`TOP GAME LIST : "${provider}"`);
  lines.push(`➖➖➖➖➖`);
  items.forEach((g, idx) => {
    lines.push(`${idx + 1}) ${g.displayName} 🟢${g.percentage}%`);
  });
  return lines.join('\n');
}

async function copyGeneratedText(){
  const text = $('#generatedText').value.trim();
  if(!text){
    alert('No generated text yet.');
    return;
  }
  await copyText(text, $('#copyTextBtn'));
}

function clearGenerated(){
  state.generated = [];
  $('#generatedText').value = '';
  $('#resultInfo').textContent = state.gamePool.length
    ? `${state.gamePool.length} game(s) loaded for ${state.selectedProvider}`
    : 'No result yet.';
  renderEmpty('Please click <b>Generate</b> to create tips.');
}

function renderEmpty(message){
  $('#resultCards').innerHTML = `<div class="empty">${message}</div>`;
}

function randomPct(min, max){
  return (Math.random() * (max - min) + min).toFixed(2);
}

function shuffle(arr){
  for(let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function copyText(value, el){
  try{
    await navigator.clipboard.writeText(value);
    if(el){
      const old = el.textContent;
      el.textContent = 'Copied ✓';
      setTimeout(() => el.textContent = old, 1100);
    }
  }catch(e){
    prompt('Copy this:', value);
  }
}

function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#039;'
  }[m]));
}

function escapeAttr(s){
  return String(s ?? '').replace(/"/g,'&quot;');
}

init().catch(err => {
  console.error(err);
  $('#resultCards').innerHTML = `<div class="empty">Failed to load data. Please check <code>manifest.json</code> and provider JSON files.</div>`;
});

from pathlib import Path

app_js = r'''let MANIFEST=null;
let PROVIDERS=[];
let selectedProvider=null;
let renderLimit=72;
let liveSource=false;


/* =====================================================
   GAME NAME DATABASE
===================================================== */

const NAME_MAPS=new Map();

/*
Later bila provider lain sudah ada JSON,
tinggal tambah di sini.

Example:
['JILI','JDB','MEGA888']
*/
const MAPPED_PROVIDERS=[
  'JILI'
];


const $=s=>document.querySelector(s);

const $$=s=>[
  ...document.querySelectorAll(s)
];


const enc=p=>
  p.split('/')
  .map(
    (x,i)=>
      i
      ?encodeURIComponent(x)
      :x
  )
  .join('/');


const esc=s=>
  String(s??'')
  .replace(
    /[&<>"']/g,
    m=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#039;'
    }[m])
  );


const nice=s=>
  String(s??'')
  .replace(/\.[^.]+$/,'')
  .replace(/[_-]+/g,' ')
  .replace(
    /([a-z])([A-Z])/g,
    '$1 $2'
  )
  .replace(/\s+/g,' ')
  .trim();



function abs(path){

  return new URL(
    enc(path),
    location.href
  ).href;

}



function fileStem(file){

  return String(
    file||''
  )
  .split('/')
  .pop()
  .replace(
    /\.[^.]+$/,
    ''
  );

}



/* =====================================================
   GAME NAME MAPPING
===================================================== */

async function loadNameMap(
  provider
){

  if(
    NAME_MAPS.has(provider)
  ){

    return NAME_MAPS.get(
      provider
    );

  }


  try{

    const path=
      `data/game-names/${encodeURIComponent(provider)}.json`;


    const r=
      await fetch(
        path+
        '?v='+
        Date.now(),
        {
          cache:'no-store'
        }
      );


    if(!r.ok){

      NAME_MAPS.set(
        provider,
        {}
      );

      return {};

    }


    const data=
      await r.json();


    const games=
      data.games||{};


    NAME_MAPS.set(
      provider,
      games
    );


    return games;


  }catch(e){


    NAME_MAPS.set(
      provider,
      {}
    );


    return {};

  }

}



function mappedRecord(
  provider,
  file
){

  const map=
    NAME_MAPS.get(
      provider
    );


  if(!map){
    return null;
  }


  const basename=
    String(
      file||''
    )
    .split('/')
    .pop();


  return(
    map[basename]||
    null
  );

}



function mappedName(
  provider,
  file
){

  const record=
    mappedRecord(
      provider,
      file
    );


  if(
    record &&
    typeof record.name===
      'string' &&
    record.name.trim()
  ){

    return record
      .name
      .trim();

  }


  return null;

}



function displayName(
  game
){

  const provider=

    game.provider ||

    (
      selectedProvider
      ?selectedProvider.name
      :''
    );


  const mapped=
    mappedName(
      provider,
      game.file
    );


  if(mapped){
    return mapped;
  }


  if(game.name){
    return nice(
      game.name
    );
  }


  return(
    fileStem(
      game.file
    ) ||
    'Unnamed Game'
  );

}



/* =====================================================
   GITHUB LIVE SCAN
===================================================== */

function repoInfo(){

  const h=
    location.hostname
    .toLowerCase();


  const ps=
    location.pathname
    .split('/')
    .filter(Boolean);


  if(
    h.endsWith(
      '.github.io'
    ) &&
    ps.length
  ){

    return{

      owner:
        h.replace(
          '.github.io',
          ''
        ),

      repo:
        ps[0]

    };

  }


  return null;

}



async function liveTree(){

  const r=
    repoInfo();


  if(!r){
    return null;
  }


  const meta=
    await fetch(

      `https://api.github.com/repos/${r.owner}/${r.repo}`

    );


  if(!meta.ok){
    throw 0;
  }


  const mi=
    await meta.json();


  const br=
    mi.default_branch||
    'main';


  const tr=
    await fetch(

      `https://api.github.com/repos/${r.owner}/${r.repo}/git/trees/${encodeURIComponent(br)}?recursive=1`

    );


  if(!tr.ok){
    throw 0;
  }


  const tj=
    await tr.json();


  const map=
    new Map();



  for(
    const x of tj.tree||[]
  ){


    if(
      x.type!=='blob' ||
      !x.path.startsWith(
        'assets/game-providers/'
      )
    ){

      continue;

    }


    const rel=
      x.path.slice(

        'assets/game-providers/'
        .length

      );


    const parts=
      rel.split('/');


    if(
      parts.length<2
    ){

      continue;

    }


    const provider=
      parts[0];


    if(
      !map.has(
        provider
      )
    ){

      map.set(

        provider,

        {

          name:
            provider,

          folder:
            provider,

          logos:[],

          games:[],

          count:0

        }

      );

    }


    const o=
      map.get(
        provider
      );


    const low=
      x.path
      .toLowerCase();



    /* PROVIDER LOGO */

    if(

      parts.length===2 &&

      /\.(png|jpg|jpeg|webp|gif|svg|avif)$/
      .test(low)

    ){

      o.logos.push(
        x.path
      );

    }


    /* GAME IMAGE */

    else if(

      parts[1]==='LIST' &&

      parts.length>=3 &&

      /\.(png|jpg|jpeg|webp|gif|svg|avif)$/
      .test(low)

    ){

      const f=
        parts
        .slice(2)
        .join('/');


      o.games.push({

        name:
          f.replace(
            /\.[^.]+$/,
            ''
          ),

        file:
          f
          .split('/')
          .pop(),

        path:
          x.path

      });

    }

  }



  const arr=

    [...map.values()]

    .sort(
      (a,b)=>

        a.name
        .localeCompare(
          b.name
        )

    );



  arr.forEach(
    p=>{


      p.logos.sort();


      p.games.sort(
        (a,b)=>

          a.name.localeCompare(

            b.name,

            undefined,

            {
              numeric:true,
              sensitivity:'base'
            }

          )

      );


      p.count=
        p.games.length;


    }
  );


  return arr;

}



/* =====================================================
   LOAD
===================================================== */

async function load(){


  const m=

    await fetch(
      'data/manifest.json'
    )

    .then(
      r=>r.json()
    );


  MANIFEST=m;


  PROVIDERS=
    m.providers||[];



  /* LIVE GITHUB ASSET SCAN */

  try{


    const lp=
      await liveTree();


    if(
      lp &&
      lp.length
    ){


      PROVIDERS=
        lp;


      liveSource=
        true;


    }


  }catch(e){}



  /* LOAD AVAILABLE NAME DATABASE */

  await Promise.allSettled(

    MAPPED_PROVIDERS.map(

      provider=>
        loadNameMap(
          provider
        )

    )

  );


  renderStats();

  renderHome();

}



/* =====================================================
   DASHBOARD STATS
===================================================== */

function renderStats(){


  $('#statProviders')
    .textContent=

      PROVIDERS
      .length
      .toLocaleString();



  $('#statGames')
    .textContent=

      PROVIDERS
      .reduce(

        (a,p)=>
          a+
          p.games.length,

        0

      )
      .toLocaleString();



  $('#statLogos')
    .textContent=

      PROVIDERS
      .reduce(

        (a,p)=>
          a+
          p.logos.length,

        0

      )
      .toLocaleString();



  $('#sourceLabel')
    .textContent=

      liveSource

      ?'Live GitHub folder scan'

      :'Packaged manifest';

}



/* =====================================================
   VIEW
===================================================== */

function setView(
  v,
  updateHash=true
){


  const valid=[
    'home',
    'games',
    'banks'
  ];


  if(
    !valid.includes(v)
  ){

    v='home';

  }



  $('#homeView')
  .classList
  .toggle(

    'hidden',

    v!=='home'

  );



  $('#gameView')
  .classList
  .toggle(

    'hidden',

    v!=='games'

  );



  $('#bankView')
  .classList
  .toggle(

    'hidden',

    v!=='banks'

  );



  $$('.nav button')
  .forEach(
    b=>{


      b.classList.toggle(

        'active',

        b.dataset.view===v

      );


    }
  );



  if(
    v==='games'
  ){

    renderHome();

  }



  if(
    updateHash
  ){


    history.replaceState(

      null,

      '',

      v==='home'

      ?location.pathname+
       location.search

      :'#'+v

    );


  }



  window.scrollTo({

    top:0,

    behavior:'smooth'

  });

}



/* =====================================================
   PROVIDER HOME
===================================================== */

function renderHome(){


  selectedProvider=null;

  renderLimit=72;


  $('#backBtn')
    .classList
    .add(
      'hidden'
    );


  $('#providerLogos')
    .classList
    .add(
      'hidden'
    );


  $('#providerLogoTitle')
    .classList
    .add(
      'hidden'
    );


  $('#gameSectionTitle')
    .textContent=
      'Providers';


  $('#resultCount')
    .textContent=
      `${PROVIDERS.length} providers`;


  $('#loadMore')
    .classList
    .add(
      'hidden'
    );



  const q=

    $('#searchInput')
    .value
    .trim()
    .toLowerCase();



  if(q){

    renderSearch(q);

    return;

  }



  $('#gameGrid')
    .innerHTML='';



  $('#providerGrid')
    .classList
    .remove(
      'hidden'
    );



  $('#providerGrid')
    .innerHTML=

      PROVIDERS.map(

        p=>`

        <article
          class="provider"
          data-provider="${esc(p.name)}">


          <div class="provider-logo">

            ${
              p.logos[0]

              ?`

                <img
                  loading="lazy"
                  src="${enc(p.logos[0])}"
                  alt="${esc(p.name)}">

               `

              :`

                <b>
                  ${esc(p.name)}
                </b>

               `
            }

          </div>


          <h4>

            ${esc(p.name)}

          </h4>


          <small>

            ${p.games.length.toLocaleString()}
            game images ·

            ${p.logos.length}
            logo${p.logos.length===1?'':'s'}

          </small>


        </article>

        `

      ).join('');



  $$('.provider')
  .forEach(

    x=>

      x.onclick=
        ()=>openProvider(
          x.dataset.provider
        )

  );

}



/* =====================================================
   OPEN PROVIDER
===================================================== */

async function openProvider(
  name
){


  selectedProvider=

    PROVIDERS.find(

      p=>
        p.name===name

    );


  if(
    !selectedProvider
  ){

    return;

  }



  /* LOAD NAME JSON IF IT EXISTS */

  await loadNameMap(
    selectedProvider.name
  );



  renderLimit=72;


  $('#searchInput')
    .value='';


  $('#backBtn')
    .classList
    .remove(
      'hidden'
    );


  $('#providerGrid')
    .classList
    .add(
      'hidden'
    );


  renderProviderLogos();


  renderGames(
    selectedProvider.games
  );

}



/* =====================================================
   PROVIDER LOGOS
===================================================== */

function renderProviderLogos(){


  const p=
    selectedProvider;


  $('#providerLogoTitle')
    .classList
    .remove(
      'hidden'
    );


  $('#providerLogoTitle h3')
    .textContent=

      `${p.name} — Provider Logo${p.logos.length===1?'':'s'}`;



  $('#providerLogos')
    .classList
    .remove(
      'hidden'
    );



  $('#providerLogos')
    .innerHTML=

      p.logos.length

      ?

      p.logos.map(

        path=>`

        <div class="logo-card">


          <div class="logo-img">

            <img
              src="${enc(path)}"
              alt="${esc(p.name)} logo">

          </div>


          <div class="filename">

            ${esc(
              path
              .split('/')
              .pop()
            )}

          </div>


          <div class="mini-actions">


            <button
              class="mini copy"
              data-copy="${esc(path)}">

              Copy URL

            </button>


            <a
              class="mini"
              href="${enc(path)}"
              target="_blank">

              Open

            </a>


          </div>


        </div>

        `

      ).join('')


      :`

        <div class="empty">

          No provider logo
          in this folder.

        </div>

       `;


  bindCopy();

}



/* =====================================================
   SEARCH
===================================================== */

function gameMatchesQuery(
  game,
  q
){


  const provider=

    game.provider ||

    (
      selectedProvider
      ?selectedProvider.name
      :''
    );


  const title=

    displayName({

      ...game,

      provider:
        provider

    });


  const id=
    fileStem(
      game.file
    );


  const haystack=[

    title,

    game.name,

    game.file,

    id,

    provider

  ]

  .join(' ')

  .toLowerCase();



  return haystack.includes(q);

}



function renderSearch(q){


  $('#providerGrid')
  .classList
  .add(
    'hidden'
  );


  $('#providerLogos')
  .classList
  .add(
    'hidden'
  );


  $('#providerLogoTitle')
  .classList
  .add(
    'hidden'
  );



  const matches=[];



  for(
    const p of PROVIDERS
  ){


    const providerHit=

      p.name
      .toLowerCase()
      .includes(q);



    for(
      const g of p.games
    ){


      const row={

        ...g,

        provider:
          p.name,

        folder:
          p.folder

      };



      if(

        providerHit ||

        gameMatchesQuery(
          row,
          q
        )

      ){


        matches.push(
          row
        );


      }

    }

  }



  $('#gameSectionTitle')
    .textContent=
      'Search Results';



  renderGames(
    matches
  );

}



function currentMatches(){


  const q=

    $('#searchInput')
    .value
    .trim()
    .toLowerCase();



  if(
    !selectedProvider
  ){

    return[];

  }



  return(

    selectedProvider.games

    .filter(
      game=>

        !q ||

        gameMatchesQuery(

          {
            ...game,

            provider:
              selectedProvider.name
          },

          q

        )

    )

  );

}



/* =====================================================
   GAME GRID
===================================================== */

function renderGames(
  items
){


  const p=
    selectedProvider;



  const normalized=

    items.map(
      g=>

        g.provider

        ?g

        :{

          ...g,

          provider:
            p.name,

          folder:
            p.folder

        }

    );



  $('#gameSectionTitle')
    .textContent=

      p &&
      !$('#searchInput').value

      ?`${p.name} Games`

      :'Search Results';



  $('#resultCount')
    .textContent=

      `${normalized.length.toLocaleString()} assets`;



  const shown=

    normalized.slice(
      0,
      renderLimit
    );



  $('#gameGrid')
    .innerHTML=

      shown.length

      ?shown.map(
        g=>gameCard(g)
      ).join('')

      :`

        <div class="empty">

          No matching game assets.

        </div>

       `;



  $('#loadMore')
    .classList
    .toggle(

      'hidden',

      shown.length>=
      normalized.length

    );


  bindGameActions();

}



/* =====================================================
   GAME CARD
===================================================== */

function gameCard(g){


  const title=
    displayName(g);


  const id=
    fileStem(
      g.file
    );


  const mapped=
    Boolean(
      mappedName(
        g.provider,
        g.file
      )
    );


  return`

  <article class="game">


    <div
      class="thumb"

      data-preview="${esc(g.path)}"

      data-title="${esc(title)}">


      <img
        loading="lazy"

        src="${enc(g.path)}"

        alt="${esc(title)}">


    </div>



    <div class="gamebody">


      <div
        class="gamename"

        title="${esc(title)}">

        ${esc(title)}

      </div>



      <div class="gameprovider">

        ${esc(g.provider)}
        · ID: ${esc(id)}

        ${
          mapped
          ?' · NAME MAPPED'
          :''
        }

      </div>



      <div class="actions">


        <button
          class="action copy"

          data-copy="${esc(g.path)}">

          Copy URL

        </button>



        <a
          class="action"

          href="${enc(g.path)}"

          download>

          Download

        </a>



        <button
          class="action tips"

          data-tip-provider="${esc(g.provider)}"

          data-tip-file="${esc(g.file)}"

          data-tip-game="${esc(title)}">

          Game Tips

        </button>


      </div>


    </div>


  </article>

  `;

}



/* =====================================================
   COPY IMAGE URL
===================================================== */

function bindCopy(){


  $$('.copy')
  .forEach(
    button=>{


      button.onclick=
      async()=>{


        const url=

          abs(
            button.dataset.copy
          );


        try{


          await navigator
          .clipboard
          .writeText(
            url
          );


          const old=

            button.textContent;


          button.textContent=

            'Copied ✓';


          setTimeout(

            ()=>{

              button.textContent=
                old;

            },

            1000

          );


        }catch(e){


          prompt(

            'Copy URL:',

            url

          );


        }

      };

    }
  );

}



/* =====================================================
   GAME ACTIONS
===================================================== */

function bindGameActions(){


  bindCopy();



  $$('[data-preview]')
  .forEach(
    item=>{


      item.onclick=

        ()=>preview(

          item.dataset.preview,

          item.dataset.title

        );

    }
  );



  $$('[data-tip-file]')
  .forEach(
    item=>{


      item.onclick=

        ()=>showTips(

          item.dataset.tipProvider,

          item.dataset.tipFile,

          item.dataset.tipGame

        );

    }
  );

}



/* =====================================================
   IMAGE PREVIEW
===================================================== */

function preview(
  path,
  title
){


  $('#modalTitle')
    .textContent=
      title;



  $('#modalBody')
    .innerHTML=`

      <img
        class="previewimg"

        src="${enc(path)}"

        alt="${esc(title)}">


      <div
        class="mini-actions"

        style="margin-top:10px">


        <button
          class="mini copy"

          data-copy="${esc(path)}">

          Copy Image URL

        </button>


        <a
          class="mini"

          href="${enc(path)}"

          target="_blank">

          Open Original

        </a>


      </div>

    `;



  $('#modal')
    .classList
    .add(
      'show'
    );


  bindCopy();

}



/* =====================================================
   OLD TXT GAME TIPS
===================================================== */

async function showTips(
  provider,
  file,
  game
){


  const stem=

    file.replace(
      /\.[^.]+$/,
      ''
    );


  const path=

    `assets/game-providers/${provider}/TIPS/${stem}.txt`;



  $('#modalTitle')
    .textContent=

      `${game} — Game Tips`;



  $('#modalBody')
    .innerHTML=

      '<div class="tiptext">Loading tips...</div>';



  $('#modal')
    .classList
    .add(
      'show'
    );



  try{


    const r=

      await fetch(

        enc(path)+
        '?v='+
        Date.now()

      );


    if(!r.ok){
      throw 0;
    }



    const t=

      await r.text();



    $('#modalBody')
      .innerHTML=`

        <div class="tiptext">

          ${esc(t)}

        </div>


        <div class="tiphelp">

          Published from

          <code>
            ${esc(path)}
          </code>

        </div>

      `;


  }catch(e){


    $('#modalBody')
      .innerHTML=`

        <div class="tiptext">

          No tips published yet.

        </div>


        <div class="tiphelp">

          To add tips for this game,
          create this text file in GitHub:

          <br><br>

          <code>
            ${esc(path)}
          </code>

          <br><br>

          The TXT filename must match
          the game image filename.

        </div>

      `;


  }

}



/* =====================================================
   MODAL
===================================================== */

$('#modalClose')
.onclick=
  ()=>{

    $('#modal')
    .classList
    .remove(
      'show'
    );

  };


$('#modal')
.onclick=
  event=>{

    if(
      event.target.id===
      'modal'
    ){

      $('#modal')
      .classList
      .remove(
        'show'
      );

    }

  };



/* =====================================================
   SEARCH EVENTS
===================================================== */

$('#searchInput')
.addEventListener(
  'input',
  ()=>{


    renderLimit=72;


    if(
      selectedProvider
    ){


      renderGames(
        currentMatches()
      );


    }else{


      renderHome();


    }

  }
);



$('#clearSearch')
.onclick=
  ()=>{


    $('#searchInput')
      .value='';


    if(
      selectedProvider
    ){


      renderGames(
        selectedProvider.games
      );


    }else{


      renderHome();


    }

  };



$('#backBtn')
.onclick=
  ()=>{


    $('#searchInput')
      .value='';


    renderHome();

  };



$('#loadMore')
.onclick=
  ()=>{


    renderLimit+=72;


    if(
      selectedProvider
    ){


      renderGames(
        currentMatches()
      );


    }else{


      renderSearch(

        $('#searchInput')
        .value
        .trim()
        .toLowerCase()

      );


    }

  };



/* =====================================================
   NAVIGATION
===================================================== */

$$('[data-view]')
.forEach(
  button=>{


    button.onclick=

      ()=>setView(
        button.dataset.view
      );


  }
);



$$('[data-open-view]')
.forEach(
  button=>{


    button.onclick=

      ()=>setView(
        button.dataset.openView
      );


  }
);



window.addEventListener(
  'hashchange',
  ()=>{


    setView(

      location.hash==='#banks'

      ?'banks'

      :location.hash==='#games'

        ?'games'

        :'home',

      false

    );

  }
);



/* =====================================================
   START
===================================================== */

load()

.then(
  ()=>{


    setView(

      location.hash==='#banks'

      ?'banks'

      :location.hash==='#games'

        ?'games'

        :'home',

      false

    );

  }
);
'''

path = Path("/mnt/data/app.js")
path.write_text(app_js, encoding="utf-8")
print(f"Created {path} ({path.stat().st_size:,} bytes)")

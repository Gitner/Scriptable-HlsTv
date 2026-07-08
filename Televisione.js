// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: broadcast-tower;

let canali = {
  1:{n:'Rai 1', p:'rai', i:'', u:''},
  2:{n:'Rai 2', p:'rai', i:'', u:''},
  3:{n:'Rai 3', p:'rai', i:'', u:''},
  4:{n:'Rete 4', p:'mediaset', i:'', u:''},
  5:{n:'Canale 5', p:'mediaset', i:'', u:''},
  6:{n:'Italia 1', p:'mediaset', i:'', u:''},
  7:{n:'La7', p:'', i:'https://iapb.it/wp-content/uploads/2007/10/la7.jpg', u:'https://d1chghleocc9sm.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-evfku205gqrtf/Live.m3u8'},
  8:{n:'TV8', p:'sky', i:'https://advertisingmanager.sky.it/assets/images/solutions/addressable-tv/logo_tv8_bianco.png', u:''},
  9:{n:'Nove', p:'', i:'https://raw.githubusercontent.com/maginetweb-arch/TVITALIA/refs/heads/main/TVL/nove.png', u:'https://d31mw7o1gs0dap.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-y5pbi2sq9r609/NOVE_IT.m3u8'},
  20:{n:'20', p:'mediaset', i:'', u:''},
  21:{n:'Rai 4', p:'rai', i:'', u:''},
  22:{n:'Iris', p:'mediaset', i:'', u:''},
  23:{n:'Rai 5', p:'rai', i:'', u:''},
  24:{n:'Rai Movie', p:'rai', i:'', u:''},
  25:{n:'Rai Premium', p:'rai', i:'', u:''},
  26:{n:'Cielo', p:'sky', i:'https://advertisingmanager.sky.it/assets/images/solutions/addressable-tv/logo_cielo_bianco.png', u:''},
  27:{n:'27 Twentyseven', p:'mediaset', i:'', u:''},
  30:{n:'La 5', p:'mediaset', i:'', u:''},
  34:{n:'Cine34', p:'mediaset', i:'', u:''},
  35:{n:'Focus', p:'mediaset', i:'', u:''},
  39:{n:'Top Crime', p:'mediaset', i:'', u:''},
  49:{n:'Italia 2', p:'mediaset', i:'', u:''},
  55:{n:'Mediaset Extra', p:'mediaset', i:'', u:''}
};

const apiRai = 'https://www.rai.it/dl/RaiPlay/2016/PublishingBlock-9a2ff311-fcf0-4539-8f8f-c4fee2a71d58.html?json';
const apiMed = 'https://feed.entertainment.tv.theplatform.eu/f/PR1GhC/mediaset-prod-all-stations-v2?entries=true&form=cjson&httpError=true';
const apiSky = 'https://apid.sky.it/vdp/v1/getLivestream?id=#';
const apiEpg = 'https://epgnew.guidatvoggi.it/0';

let epg = {};   // mappa LCN -> [{ t:titolo, s:inizioMs, e:fineMs }, ...] (palinsesto del giorno)

// Scarica la guida TV e costruisce, per ogni LCN, il palinsesto compatto del giorno.
// L'abbinamento ai canali avviene tramite il numero di canale (LCN).
async function fetchEPG() {
  try {
    const req = new Request(apiEpg);
    req.headers = { 'Accept': 'application/json', 'epgguidatv': 'gu1d4tv53gr3t4' };
    const data = await req.loadJSON();

    // I canali sono raggruppati per piattaforma in "canali"; diamo priorità al
    // digitale terrestre ("dvb"), con fallback sulla forma "stasera".
    let groups = Array.isArray(data.canali) ? data.canali
               : Array.isArray(data.stasera) ? data.stasera : [];
    groups = groups.slice().sort((a, b) => (b.piat === 'dvb') - (a.piat === 'dvb'));

    const map = {};
    for (const g of groups) {
      const list = Array.isArray(g.canali) ? g.canali : [];
      for (const ch of list) {
        const num = ch.canale && ch.canale.number;
        if (num == null || map[num] != null) continue;   // il primo gruppo (dvb) vince
        const progs = Array.isArray(ch.prog) ? ch.prog : (ch.prog ? [ch.prog] : []);
        const compact = progs
          .map(p => ({ t: p.title || '', s: Date.parse(p.inizio), e: Date.parse(p.fine) }))
          .filter(p => isFinite(p.s) && isFinite(p.e));
        if (compact.length) map[num] = compact;
      }
    }
    return map;
  } catch (e) {
    return {};
  }
}

async function fetchAllData() {
  const [raiData, medData, tv8Data, cieloData, epgData] = await Promise.all([
    new Request(apiRai).loadJSON().catch(e => null),
    new Request(apiMed).loadJSON().catch(e => null),
    new Request(apiSky.replace('#', '7')).loadJSON().catch(e => null),
    new Request(apiSky.replace('#', '2')).loadJSON().catch(e => null),
    fetchEPG()
  ]);
  epg = epgData || {};

  if (raiData) {
    for (let diretta of raiData.dirette) {
      for (let k in canali) {
        if (canali[k].n === diretta.channel) {
          canali[k].u = diretta.video.contentUrl + '&output=16';
          canali[k].i = diretta['transparent-icon'].replace('[RESOLUTION]', '320x-');
        }
      }
    }
  }

  if (medData) {
    const protoUrl = 'https://live02-col.msf.cdn.mediaset.net/live/ch-#/#-clr.isml/index_hr.m3u8';
    for (let entry of medData.entries) {
      for (let k in canali) {
        if (canali[k].n === entry['title']) {
          if(entry['thumbnails'] && entry['thumbnails']['channel_logo-100x100']) {
            canali[k].i = entry['thumbnails']['channel_logo-100x100']['url'];
          }
          if(entry['tuningInstruction'] && entry['tuningInstruction']['urn:theplatform:tv:location:any']) {
            for (var id of entry['tuningInstruction']['urn:theplatform:tv:location:any']) {
              if (id['format'] === 'application/x-mpegURL' && id['assetTypes'].includes('geoIT')) {
                canali[k].u = protoUrl.replaceAll('#', entry['callSign'].toLowerCase());
              }
            }
          }
        }
      }
    }
  }

  if (tv8Data) canali[8].u = tv8Data.streaming_url;
  if (cieloData) canali[26].u = cieloData.streaming_url;
}

await fetchAllData();

// Teniamo solo i canali con URL valido, conservando LCN e palinsesto del giorno
const validChannels = Object.entries(canali)
  .filter(([lcn, c]) => c.u)
  .map(([lcn, c]) => ({ lcn: lcn, n: c.n, i: c.i, u: c.u, prog: epg[lcn] || [] }));
const channelsJson = JSON.stringify(validChannels);

const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  :root {
    --bg: #0f0f0f;
    --card-bg: #252525;
    --accent: #007aff;
  }
  * { -webkit-user-select: none; -webkit-touch-callout: none; }
  body {
    margin: 0; padding: 15px;
    background-color: var(--bg);
    font-family: -apple-system, system-ui;
    color: white;
  }
  .toolbar {
    display: flex; justify-content: space-between;
    align-items: center; margin-bottom: 20px;
  }
  .title-app { font-weight: 800; font-size: 22px; letter-spacing: -0.5px; }

  #grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr); /* Telecomando 3 colonne */
    gap: 12px;
    max-width: 500px;
    margin: 0 auto;
  }

  .channel-card {
    background: var(--card-bg);
    border-radius: 12px;
    aspect-ratio: 1/1; /* Più grandi e quadrate */
    position: relative;
    overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid #333;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    transition: transform 0.1s;
  }
  .channel-card:active { transform: scale(0.95); }

  .channel-logo {
    width: 70%; max-height: 70%;
    object-fit: contain;
    z-index: 10;
  }

  /* Tile video nel mosaico */
  .mini-video {
    position: absolute; width: 100%; height: 100%;
    object-fit: cover; z-index: 5;
    display: none;
  }
  body.wall .mini-video { display: block; }
  body.wall .channel-logo { display: none; }   /* nel wall niente logo */

  /* Numero di canale (LCN) in alto a destra */
  .lcn-badge {
    position: absolute; top: 6px; right: 7px; z-index: 12;
    font-weight: 800; font-size: 13px; line-height: 1;
    padding: 3px 6px; border-radius: 6px;
    color: #fff; background: rgba(0,0,0,0.55);
    backdrop-filter: blur(2px);
    font-variant-numeric: tabular-nums;
  }

  /* Indicatore di stato connessione sul tile */
  .tile-status {
    position: absolute; inset: 0; z-index: 8;
    display: none; align-items: center; justify-content: center;
    font-size: 12px; color: #aaa; background: rgba(0,0,0,0.35);
    pointer-events: none;
  }
  .channel-card.loading .tile-status,
  .channel-card.failed  .tile-status { display: flex; }
  .channel-card.failed  .tile-status { color: #ff5b5b; }

  /* Programma in onda adesso: striscia in basso + barra di avanzamento */
  .epg {
    position: absolute; left: 0; right: 0; bottom: 0; z-index: 11;
    padding: 6px 7px 8px;
    background: linear-gradient(to top, rgba(0,0,0,0.9) 35%, rgba(0,0,0,0));
    pointer-events: none;
  }
  .epg-title {
    color: #fff; font-size: 11px; font-weight: 600; line-height: 1.2;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .epg-prog {
    position: absolute; left: 0; bottom: 0; width: 100%; height: 3px;
    background: rgba(255,255,255,0.18); z-index: 12; pointer-events: none;
  }
  .epg-fill { height: 100%; width: 0%; background: var(--accent); transition: width 0.5s linear; }

  .btn {
    background: #333; border: none; color: white;
    padding: 8px 16px; border-radius: 20px; font-weight: 600;
  }
  .btn.active { background: var(--accent); }

  /* Fullscreen Modal */
  #modal {
    display: none; position: fixed; inset: 0;
    background: black; z-index: 1000;
  }
  #stage {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
  }
  /* Il video promosso a fullscreen: stesso elemento del tile, solo ridimensionato */
  .stage-video {
    width: 100%; height: 100%;
    object-fit: contain;
    background: black;
  }

  .close-btn {
    position: absolute; top: 40px; right: 20px;
    background: rgba(255,255,255,0.2); width: 44px; height: 44px;
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: 28px; z-index: 1001; backdrop-filter: blur(5px);
  }

  #nowPlaying {
    position: absolute; top: 46px; left: 20px; z-index: 1001;
    font-weight: 700; font-size: 18px; padding: 8px 14px;
    background: rgba(0,0,0,0.45); border-radius: 20px;
    backdrop-filter: blur(6px); opacity: 0; pointer-events: none;
  }
  #nowPlaying.show { animation: npFade 2s forwards; }
  @keyframes npFade {
    0% { opacity: 0; } 12% { opacity: 1; }
    75% { opacity: 1; } 100% { opacity: 0; }
  }
</style>
</head>
<body>

  <div class="toolbar">
    <div class="title-app">Remote TV</div>
    <button class="btn" id="toggleWall" onclick="toggleWall()">Live Wall</button>
  </div>

  <div id="grid"></div>

  <div id="modal">
    <div id="nowPlaying"></div>
    <div class="close-btn" onclick="closeModal()">&times;</div>
    <div id="stage"></div>
  </div>

<script>
  const channels = ${channelsJson};
  let currentIdx = 0;
  let stageVideo = null;   // elemento <video> attualmente a schermo intero
  let touchStartX = 0;

  const grid  = document.getElementById('grid');
  const modal = document.getElementById('modal');
  const stage = document.getElementById('stage');
  const videos = [];       // un <video> persistente per canale, allineato a channels
  const state  = [];       // watchdog per canale: { lastT, lastAdv, retries, nextTry }

  const HEALTH_MS   = 1500;   // ogni quanto controllo la salute degli stream
  const MAX_BACKOFF = 15000;  // attesa massima tra due tentativi

  function cardOf(v) { return grid.children[Number(v.dataset.idx)]; }

  /* Overlay di stato sul tile: 'ok' (nascosto), 'loading', 'failed' */
  function setStatus(v, s) {
    const c = cardOf(v); if (!c) return;
    c.classList.toggle('loading', s === 'loading');
    c.classList.toggle('failed',  s === 'failed');
    const st = c.querySelector('.tile-status');
    if (st) st.textContent = s === 'failed' ? '\\u21BB' : (s === 'loading' ? '\\u2022\\u2022\\u2022' : '');
  }

  /* Segna se un video DEVE suonare: solo questi vengono sorvegliati dal watchdog */
  function markActive(v, on) {
    v.dataset.active = on ? '1' : '0';
    const w = state[Number(v.dataset.idx)];
    w.lastT = 0; w.lastAdv = Date.now();
    if (on) { w.retries = 0; w.nextTry = 0; }
  }

  /* --- Gestione connessione: carica/scarica una sola volta, niente sprechi --- */
  function ensureLoaded(v) {
    if (v.dataset.loaded === '1') return;     // già connesso: riusa, non ricaricare
    v.src = v.dataset.url;
    v.dataset.loaded = '1';
    setStatus(v, 'loading');
  }
  function unload(v) {
    v.pause();
    v.removeAttribute('src');
    v.load();                                  // chiude la connessione HLS
    v.dataset.loaded = '0';
    v.dataset.active = '0';
    setStatus(v, 'ok');
  }

  /* Reset duro della connessione e riavvio (usato dal watchdog) */
  function reload(v) {
    setStatus(v, 'loading');
    try {
      v.pause();
      v.removeAttribute('src');
      v.load();
      v.src = v.dataset.url;
      v.dataset.loaded = '1';
      const p = v.play();
      if (p && p.then) p.then(() => { if (v === stageVideo) goLive(v); }).catch(() => {});
    } catch (e) {}
    const w = state[Number(v.dataset.idx)];
    w.lastAdv = Date.now(); w.lastT = 0;
  }

  /* Sorveglianza periodica: rileva stream in errore, bloccati o mai partiti
     (sia nel wall che in fullscreen) e li riavvia con backoff progressivo. */
  function healthCheck() {
    const now = Date.now();
    videos.forEach((v, i) => {
      if (v.dataset.active !== '1') return;        // i tile in pausa non si toccano
      const w = state[i];

      // pausa volontaria dell'utente sul fullscreen: da rispettare
      if (v === stageVideo && v.paused && v.readyState >= 2 && v.currentTime > 0) {
        w.lastAdv = now; w.lastT = v.currentTime; setStatus(v, 'ok'); return;
      }

      const errored = !!v.error;
      const t = v.currentTime;
      if (!errored && t > w.lastT + 0.05) {        // il tempo avanza: tutto sano
        w.lastT = t; w.lastAdv = now; w.retries = 0; w.nextTry = 0;
        setStatus(v, 'ok');
        return;
      }

      const stuck = now - w.lastAdv;
      const neverStarted = v.readyState < 2;
      const limit = neverStarted ? 3500 : 5000;    // tolleranza prima del retry

      if (errored || stuck > limit) {
        setStatus(v, 'failed');
        if (now >= w.nextTry) {
          w.retries++;
          w.nextTry = now + Math.min(MAX_BACKOFF, 1500 * Math.pow(1.7, w.retries)) + Math.random() * 800;
          reload(v);
        }
      }
    });
  }

  /* Fullscreen video nativo iOS (rotazione landscape, AirPlay). Riusa lo stesso
     elemento; se non disponibile resta il modal CSS come fallback. */
  function enterFullscreen(v) {
    if (typeof v.webkitEnterFullscreen !== 'function') return false;
    const go = () => { try { if (v === stageVideo && document.contains(v)) v.webkitEnterFullscreen(); } catch (e) {} };
    if (v.readyState >= 1) go();
    else {
      const once = () => {
        v.removeEventListener('loadedmetadata', once);
        v.removeEventListener('canplay', once);
        go();
      };
      v.addEventListener('loadedmetadata', once, { once: true });
      v.addEventListener('canplay', once, { once: true });
    }
    return true;
  }

  /* Salta al bordo "live" se siamo rimasti indietro (es. dopo una pausa) */
  function goLive(v) {
    try {
      const s = v.seekable;
      if (s && s.length) {
        const live = s.end(s.length - 1);
        if (isFinite(live) && live - v.currentTime > 1.5) v.currentTime = live;
      }
    } catch (e) {}
  }

  /* Congela i decoder di tutti i tile caricati tranne quello a schermo intero */
  function pauseOthers() {
    videos.forEach(v => {
      if (v !== stageVideo && v.dataset.loaded === '1') { v.pause(); markActive(v, false); }
    });
  }

  /* Risveglia il mosaico, lo rimette sotto sorveglianza e risincronizza al live */
  function resumeWall() {
    if (!document.body.classList.contains('wall')) return;
    videos.forEach(v => {
      if (v.dataset.loaded !== '1') return;
      markActive(v, true);
      v.play().then(() => goLive(v)).catch(() => {});
      setTimeout(() => goLive(v), 400);
    });
  }

  function init() {
    channels.forEach((ch, i) => {
      state[i] = { lastT: 0, lastAdv: 0, retries: 0, nextTry: 0 };

      const card = document.createElement('div');
      card.className = 'channel-card';
      card.onclick = () => openModal(i);

      const v = document.createElement('video');
      v.className = 'mini-video';
      v.muted = true;
      v.playsInline = true;
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');
      v.preload = 'none';
      v.dataset.url = ch.u;
      v.dataset.idx = String(i);
      v.dataset.loaded = '0';
      v.dataset.active = '0';

      // Recupero connessione: segnala errore e forza il retry immediato al prossimo giro
      v.addEventListener('error', () => {
        if (v.dataset.active === '1') { state[i].nextTry = 0; setStatus(v, 'failed'); }
      });
      v.addEventListener('playing', () => setStatus(v, 'ok'));
      // Uscita dal fullscreen nativo: torna al wall
      v.addEventListener('webkitendfullscreen', () => { if (v === stageVideo) closeModal(); });

      const status = document.createElement('div');
      status.className = 'tile-status';

      const img = document.createElement('img');
      img.className = 'channel-logo';
      img.loading = 'lazy';
      img.src = ch.i;

      const lcn = document.createElement('div');
      lcn.className = 'lcn-badge';
      lcn.textContent = ch.lcn;

      // Programma in onda adesso (sovrimpressione, sia in modalità logo che anteprima)
      const epgBar = document.createElement('div');
      epgBar.className = 'epg';
      const epgTitle = document.createElement('div');
      epgTitle.className = 'epg-title';
      epgBar.appendChild(epgTitle);

      const epgProg = document.createElement('div');
      epgProg.className = 'epg-prog';
      const epgFill = document.createElement('div');
      epgFill.className = 'epg-fill';
      epgProg.appendChild(epgFill);

      card.appendChild(v);
      card.appendChild(status);
      card.appendChild(img);
      card.appendChild(epgBar);
      card.appendChild(epgProg);
      card.appendChild(lcn);
      grid.appendChild(card);
      videos[i] = v;
    });

    // Swipe per cambiare canale dentro al modal (fallback non-fullscreen)
    modal.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    modal.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 70) { diff > 0 ? changeChannel(1) : changeChannel(-1); }
    }, { passive: true });

    setInterval(healthCheck, HEALTH_MS);   // watchdog connessioni
    updateEPG();
    setInterval(updateEPG, 60000);         // aggiorna "in onda adesso" ogni minuto
  }

  /* Trova il programma in onda adesso nel palinsesto del canale */
  function currentProgram(prog, now) {
    if (!prog || !prog.length) return null;
    for (const p of prog) if (p.s <= now && now < p.e) return p;
    return null;
  }
  function nowTitle(ch) {
    const p = currentProgram(ch.prog, Date.now());
    return p ? p.t : '';
  }

  /* Aggiorna la sovrimpressione del programma su ogni tile + barra di avanzamento */
  function updateEPG() {
    const now = Date.now();
    channels.forEach((ch, i) => {
      const card = grid.children[i];
      if (!card) return;
      const bar  = card.querySelector('.epg');
      const prog = card.querySelector('.epg-prog');
      const fill = card.querySelector('.epg-fill');
      const p = currentProgram(ch.prog, now);
      if (p) {
        card.querySelector('.epg-title').textContent = p.t;
        bar.style.display = '';
        prog.style.display = '';
        fill.style.width = (Math.max(0, Math.min(1, (now - p.s) / (p.e - p.s))) * 100) + '%';
      } else {
        bar.style.display = 'none';
        prog.style.display = 'none';
      }
    });
  }

  function flashName(name, prog) {
    const el = document.getElementById('nowPlaying');
    el.textContent = prog ? name + '  ·  ' + prog : name;
    el.classList.remove('show');
    void el.offsetWidth;          // forza reflow per ri-triggerare l'animazione
    el.classList.add('show');
  }

  /* Porta il video di un canale sullo "stage" fullscreen.
     È LO STESSO elemento del tile: appendChild lo sposta senza distruggere
     buffer/connessione. Se il Live Wall era attivo, parte istantaneo. */
  function promote(i) {
    const v = videos[i];
    if (stageVideo && stageVideo !== v) demote(stageVideo);

    stageVideo = v;
    ensureLoaded(v);              // no-op se già connesso dal wall
    v.className = 'stage-video';
    v.controls = true;
    v.muted = false;             // unmute su gesto utente: nessun ricaricamento
    stage.appendChild(v);         // sposta il nodo, conserva lo stato del player
    markActive(v, true);          // sotto sorveglianza del watchdog
    v.play().then(() => goLive(v)).catch(() => goLive(v));
    setTimeout(() => goLive(v), 400);   // il canale a fuoco è sempre live
    enterFullscreen(v);           // schermo intero automatico (nativo iOS)
    flashName(channels[i].n, nowTitle(channels[i]));
  }

  /* Riporta un video nel suo tile. Se il wall è attivo resta connesso ma in
     pausa (lo risveglia resumeWall); altrimenti libera la connessione. */
  function demote(v) {
    v.controls = false;
    v.muted = true;
    v.className = 'mini-video';
    cardOf(v).appendChild(v);
    if (document.body.classList.contains('wall')) {
      v.pause(); markActive(v, false);   // congelato finché il modal è aperto
    } else {
      unload(v);                          // nessuno lo guarda: chiudi lo stream
    }
  }

  function openModal(i) {
    currentIdx = i;
    modal.style.display = 'block';
    promote(i);
    pauseOthers();          // ferma i decoder dei tile in sottofondo
  }

  function changeChannel(dir) {
    currentIdx = (currentIdx + dir + channels.length) % channels.length;
    promote(currentIdx);
    if (window.navigator.vibrate) window.navigator.vibrate(10);
  }

  function closeModal() {
    modal.style.display = 'none';
    if (stageVideo) { demote(stageVideo); stageVideo = null; }
    resumeWall();           // risveglia il mosaico e torna al live
  }

  function toggleWall() {
    const on = document.body.classList.toggle('wall');
    document.getElementById('toggleWall').classList.toggle('active', on);
    videos.forEach(v => {
      if (v === stageVideo) return;            // non toccare mai il fullscreen
      if (on) { ensureLoaded(v); markActive(v, true); v.play().catch(() => {}); }
      else    { unload(v); }
    });
  }

  init();
</script>
</body>
</html>
`;

let wv = new WebView();
await wv.loadHTML(html);
await wv.present(true);
Script.complete();

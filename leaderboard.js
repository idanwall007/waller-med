/* ===== Waller Meditation · Leaderboard =====
 * Vanilla JS, no deps. Drops into deploy/index.html via <script src>.
 * - Opens automatically on page load (after a small settle delay)
 * - Re-opens after meditation completes (wm:complete event) with rank-up animation
 * - 49 simulated peers + the user; data syncs with the main app's localStorage
 * - When a real backend lands, replace LB_API with fetch wrappers and keep
 *   the public surface (getWeekly, creditSession, savePhoto, ...).
 * ----------------------------------------------------------------------- */
(function(){
  "use strict";

  // ========== DATA ==========
  const NAMES = [
    "נועה ברק","איתי אביב","שירה כהן","יונתן לוי","תמר רוזן","עומר נחום",
    "מאיה דהן","אביב פרץ","הילה שמש","עידו ברגר","רוני אלמוג","ליאור גל",
    "אופיר זוהר","יעל מזרחי","דניאל סער","קרן ענבר","אסף ירדן","שני אדרי",
    "אלון רביד","טל ארביב","דנה גלעדי","אריאל חן","סהר בן־דוד","נטע מורן",
    "אופק שפירא","איילת קמחי","עידן אלקיים","מורן פלג","יובל זיו","רעות אסולין",
    "אביה לוין","גלעד אורן","הדס שטרן","מתן רותם","שיר בוסקילה","אורי הלוי",
    "אדם דורון","מיכל קליין","תום ברנע","איציק וקנין","רעיה אזולאי","יותם נוב",
    "אביב סנדר","שקד נתנאל","אסיף רביב","חן אלקבץ","ליבי עזרא","אורן צרפתי",
    "נעה־לי אדרי"
  ];
  const TAGS = [
    "נושם בלי לזוז","ישן עם זן","טס על מנטרה","פיגום של איזון","מאזן צ׳אקרות",
    "בלי קפה, בלי פאניקה","שתיקה היא זהב","בודהה בקטנה","מודע בלי להגזים",
    "Zenturion","בורח מפגישות לזום פנימי","סקאן ושכב","מודיטטור בכוננות",
    "שם את הטלפון בקור","סופר בהפסקות הצהריים"
  ];
  const AV_BGS = [
    ["#ffe14a","#ff8a00"],["#ff2e87","#ff9966"],["#1052cf","#7ec1ff"],
    ["#c7f000","#1eaa6e"],["#e6112d","#ff7a8a"],["#3b0f3a","#ff2e87"],
    ["#f4c84a","#e6112d"],["#0e3b2b","#c7f000"],["#1a1656","#ff7a8a"],
    ["#f5b820","#d63a23"],["#3d3a52","#c79d5a"],["#0a1733","#7ec1ff"]
  ];
  const RANKS = [
    { idx: 1, name:"אלוף משנה", color:"#ffe14a", trim:"#7a4f00", stars:5, chevrons:3 },
    { idx: 2, name:"סגן אלוף",  color:"#f3e7c4", trim:"#0e3b2b", stars:4, chevrons:3 },
    { idx: 3, name:"רב סרן",    color:"#ff9966", trim:"#3a1a0a", stars:3, chevrons:3 },
    { idx: 4, name:"סרן",       color:"#7ec1ff", trim:"#0a1733", stars:3, chevrons:2 },
    { idx: 5, name:"סגן",       color:"#c7f000", trim:"#0a0a0a", stars:2, chevrons:2 },
    { idx: 6, name:"סמל ראשון",color:"#ff2e87", trim:"#3b0f3a", stars:2, chevrons:1 },
    { idx: 7, name:"סמל",       color:"#1052cf", trim:"#fff7d6", stars:1, chevrons:2 },
    { idx: 8, name:"רב טוראי", color:"#d63a23", trim:"#fff7d6", stars:1, chevrons:1 },
    { idx: 9, name:"טוראי",     color:"#3d3a52", trim:"#f0e9d0", stars:0, chevrons:2 },
    { idx:10, name:"מתחיל",     color:"#5a3a20", trim:"#f4e9d2", stars:0, chevrons:1 }
  ];

  function seededRand(seed){
    let h = 2166136261 ^ seed;
    return function(){
      h += (h<<13); h ^= (h>>>7); h += (h<<3); h ^= (h>>>17); h += (h<<5);
      return ((h>>>0) % 10000) / 10000;
    };
  }
  function avatarSpec(idx, name){
    const r = seededRand(idx*53 + (name.charCodeAt(0) || 0));
    return {
      bg: AV_BGS[Math.floor(r()*AV_BGS.length)],
      eyeShape: Math.floor(r()*3),
      mouth: Math.floor(r()*3),
      hat: r() < 0.35 ? Math.floor(r()*4) : -1,
      hatHue: Math.floor(r()*360),
      photo: null
    };
  }

  const USERS = NAMES.slice(0,49).map(function(name, i){
    const r = seededRand(i*113 + 7);
    const tier = r();
    const streak = tier < 0.06
      ? 60 + Math.floor(r()*120)
      : tier < 0.25
        ? 25 + Math.floor(r()*45)
        : tier < 0.65
          ? 8 + Math.floor(r()*22)
          : 1 + Math.floor(r()*9);
    const minPerDay = 8 + Math.floor(r()*30);
    const totalMin = Math.max(streak * minPerDay - Math.floor(r()*40), 5);
    const tag = r() < 0.55 ? TAGS[Math.floor(r()*TAGS.length)] : null;
    return {
      id: "u"+i,
      name, tag, streak, totalMin,
      avatar: avatarSpec(i+1, name),
      trend: Math.floor(r()*5) * (r() < 0.5 ? 1 : -1)
    };
  });

  const ME_PHOTO_KEY = "wm_lb_photo";
  const ME_NAME_KEY  = "wm_lb_name";
  const ME_SEEN_KEY  = "wm_lb_seen_day";

  function loadMe(){
    const streak   = parseInt(localStorage.getItem("wm_streak")||"0",10) || 0;
    const totalMin = parseFloat(localStorage.getItem("wm_totalMin")||"0") || 0;
    const boosted    = Math.max(streak, 4);
    const boostedMin = Math.max(totalMin, 22);
    return {
      id: "me",
      name: localStorage.getItem(ME_NAME_KEY) || "אני",
      tag: "זה אני",
      streak: boosted,
      totalMin: boostedMin,
      avatar: Object.assign(avatarSpec(0, "אני"), {
        photo: localStorage.getItem(ME_PHOTO_KEY) || null
      }),
      trend: 0,
      isMe: true
    };
  }
  function scoreOf(u){ return u.streak * 50 + Math.floor(u.totalMin); }

  function weekEnd(){
    const d = new Date();
    const dow = d.getDay();
    const daysUntilSun = (7 - dow) % 7 || 7;
    d.setDate(d.getDate() + daysUntilSun);
    d.setHours(0,0,0,0);
    return d;
  }
  function weekRemainingMs(){ return weekEnd().getTime() - Date.now(); }
  function fmtRemaining(ms){
    if(ms < 0) ms = 0;
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if(d > 0) return d + "ימ " + String(h).padStart(2,"0") + ":" + String(m).padStart(2,"0");
    return String(h).padStart(2,"0") + ":" + String(m).padStart(2,"0");
  }
  function fmtScore(n){
    if(n >= 10000) return (n/1000).toFixed(1) + "k";
    return n.toLocaleString("en-US");
  }
  function todayKey(){
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  }

  // ========== BACKEND ADAPTER ==========
  // When window.WMAuth is present + enabled + user is signed in, we fetch the
  // real leaderboard from Supabase. Otherwise we fall back to the simulated
  // 49 peers. The two paths share the same downstream renderer because we
  // normalize backend rows into the local user shape.

  let _backendCache = null;

  function useBackend(){
    return !!(window.WMAuth && window.WMAuth.isEnabled() && window.WMAuth.getState().isAuthed);
  }

  // Map a backend row from public.weekly_leaderboard() into the local shape
  // expected by buildRow().
  function adaptBackendRow(row){
    const totalMin = Number(row.total_minutes) || 0;
    const score = Number(row.score) || 0;
    return {
      id: row.user_id,
      name: row.display_name || 'מודט',
      tag: row.rel_group === 'friend' ? 'חבר שלך' :
           row.rel_group === 'fof'    ? 'חבר של חבר' :
           row.rel_group === 'me'     ? 'זה אני' : null,
      streak: row.streak || 0,
      totalMin: totalMin,
      avatar: avatarFromBackend(row.user_id, row.display_name, row.avatar_url),
      trend: 0,
      rank: row.rank,
      score: score,
      isMe: !!row.is_me,
      relGroup: row.rel_group,
    };
  }

  function avatarFromBackend(uuid, name, photoUrl){
    const seed = parseInt(String(uuid || '').replace(/-/g,'').slice(0,8), 16) || 0;
    const r = seededRand(seed + (name ? name.charCodeAt(0) : 0));
    return {
      bg: AV_BGS[Math.floor(r()*AV_BGS.length)],
      eyeShape: Math.floor(r()*3),
      mouth: Math.floor(r()*3),
      hat: r() < 0.35 ? Math.floor(r()*4) : -1,
      hatHue: Math.floor(r()*360),
      photo: photoUrl || null
    };
  }

  // Pull fresh data from Supabase. Resolves once cache is updated.
  async function refreshBackend(){
    if(!useBackend()) return false;
    try{
      const rows = await window.WMAuth.weeklyLeaderboard();
      if(Array.isArray(rows)){
        _backendCache = rows.map(adaptBackendRow);
        return true;
      }
    }catch(e){ console.warn('[lb] refreshBackend', e); }
    return false;
  }

  function getWeekly(){
    // Backend wins if we have a cached snapshot
    if(_backendCache && _backendCache.length){
      return _backendCache.slice();
    }
    // Mock fallback
    const me = loadMe();
    const all = USERS.concat([me]);
    all.sort(function(a,b){ return scoreOf(b) - scoreOf(a); });
    all.forEach(function(u, i){ u.rank = i + 1; u.score = scoreOf(u); });
    return all;
  }

  // Public API surface (backend swap target)
  const LB_API = {
    getWeekly: getWeekly,
    savePhoto: function(dataUrl){
      if(dataUrl) localStorage.setItem(ME_PHOTO_KEY, dataUrl);
      else        localStorage.removeItem(ME_PHOTO_KEY);
    },
    saveName: function(n){ if(n) localStorage.setItem(ME_NAME_KEY, n); },
    creditSession: function(minutes){
      const cur = parseFloat(localStorage.getItem("wm_totalMin")||"0")||0;
      localStorage.setItem("wm_totalMin", (cur + minutes).toFixed(2));
    },
    RANKS: RANKS
  };
  window.LB_API = LB_API;

  // ========== HTML BUILDERS ==========

  // Procedural avatar SVG (no React)
  function avatarSVG(spec, size, opts){
    opts = opts || {};
    const eyeY = 36;
    let eyes;
    if(spec.eyeShape === 0){
      eyes = '<g fill="#1a0a0a"><circle cx="36" cy="'+eyeY+'" r="4"/><circle cx="64" cy="'+eyeY+'" r="4"/></g>';
    } else if(spec.eyeShape === 1){
      eyes = '<g stroke="#1a0a0a" stroke-width="3" fill="none" stroke-linecap="round">'+
             '<path d="M30 36 Q36 30 42 36"/><path d="M58 36 Q64 30 70 36"/></g>';
    } else {
      eyes = '<g fill="#1a0a0a"><circle cx="36" cy="'+eyeY+'" r="4"/><circle cx="64" cy="'+eyeY+'" r="4"/>'+
             '<circle cx="38" cy="'+(eyeY-2)+'" r="1.4" fill="#fff"/><circle cx="66" cy="'+(eyeY-2)+'" r="1.4" fill="#fff"/></g>';
    }
    let mouth;
    if(spec.mouth === 0)      mouth = '<path d="M40 58 Q50 66 60 58" stroke="#1a0a0a" stroke-width="3" fill="none" stroke-linecap="round"/>';
    else if(spec.mouth === 1) mouth = '<ellipse cx="50" cy="60" rx="4" ry="5" fill="#1a0a0a"/>';
    else                      mouth = '<path d="M40 60 Q45 56 50 60 Q55 64 60 60" stroke="#1a0a0a" stroke-width="3" fill="none" stroke-linecap="round"/>';
    let hat = "";
    if(spec.hat >= 0){
      const hue = spec.hatHue;
      if(spec.hat === 0) hat = '<g><path d="M22 28 Q50 -4 78 28 L78 34 L22 34 Z" fill="hsl('+hue+' 80% 55%)"/><rect x="22" y="30" width="56" height="6" fill="hsl('+hue+' 80% 40%)"/></g>';
      else if(spec.hat === 1) hat = '<rect x="20" y="26" width="60" height="8" fill="hsl('+hue+' 80% 50%)"/>';
      else if(spec.hat === 2) hat = '<ellipse cx="50" cy="18" rx="22" ry="4" fill="none" stroke="#ffe14a" stroke-width="3"/>';
      else hat = '<circle cx="50" cy="22" r="8" fill="hsl('+hue+' 70% 30%)"/>';
    }
    return '<svg viewBox="0 0 100 100" width="'+size+'" height="'+size+'" style="display:block">'+
      eyes + mouth + hat + '</svg>';
  }

  function avatarEl(spec, size, ring){
    const wrap = document.createElement('div');
    wrap.className = 'lb-av';
    wrap.style.width = size + 'px';
    wrap.style.height = size + 'px';
    wrap.style.flex = '0 0 ' + size + 'px';
    if(ring){
      wrap.style.boxShadow = '0 0 0 3px ' + ring + ', 0 0 0 5px #fff';
    } else {
      wrap.style.boxShadow = '0 0 0 3px #fff';
    }
    if(spec.photo){
      wrap.style.background = 'url(' + spec.photo + ') center/cover';
    } else {
      const c1 = spec.bg[0], c2 = spec.bg[1];
      wrap.style.background = 'linear-gradient(135deg, ' + c1 + ', ' + c2 + ')';
      wrap.innerHTML = avatarSVG(spec, size);
    }
    return wrap;
  }

  // Rank badge (general-style chevron pentagon)
  function rankBadgeSVG(rankIdx, size){
    const def = RANKS.find(function(r){ return r.idx === rankIdx; });
    if(!def) return '';
    const w = size, h = size * 1.15;
    function starPts(cx, cy, ro, ri, n){
      const out = [];
      for(let i = 0; i < n*2; i++){
        const r = (i % 2 === 0) ? ro : ri;
        const a = (i * Math.PI / n) - Math.PI/2;
        out.push((cx + r*Math.cos(a)).toFixed(2) + "," + (cy + r*Math.sin(a)).toFixed(2));
      }
      return out.join(" ");
    }
    let stars = "";
    for(let i = 0; i < def.stars; i++){
      const x = (w/2) + (i - (def.stars-1)/2) * (w*0.18);
      stars += '<polygon points="'+starPts(x, h*0.32, w*0.07, w*0.035, 5)+'" fill="'+def.trim+'"/>';
    }
    let chev = "";
    for(let i = 0; i < def.chevrons; i++){
      const y = h*0.55 + i*(w*0.13);
      chev += '<path d="M '+(w*0.22)+' '+y+' L '+(w*0.5)+' '+(y - w*0.1)+' L '+(w*0.78)+' '+y+
              ' L '+(w*0.78)+' '+(y + w*0.045)+' L '+(w*0.5)+' '+(y - w*0.055)+
              ' L '+(w*0.22)+' '+(y + w*0.045)+' Z" fill="'+def.trim+'"/>';
    }
    const gradId = 'lb-grad-' + rankIdx;
    return '<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" style="display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,.3))">'+
      '<defs><linearGradient id="'+gradId+'" x1="0" y1="0" x2="0" y2="1">'+
      '<stop offset="0" stop-color="'+def.color+'" stop-opacity="1"/>'+
      '<stop offset="1" stop-color="'+def.color+'" stop-opacity="0.65"/>'+
      '</linearGradient></defs>'+
      '<path d="M '+(w*0.08)+' '+(h*0.05)+' L '+(w*0.92)+' '+(h*0.05)+
        ' L '+(w*0.92)+' '+(h*0.78)+' L '+(w*0.5)+' '+(h*0.95)+
        ' L '+(w*0.08)+' '+(h*0.78)+' Z" fill="url(#'+gradId+')" stroke="'+def.trim+'" stroke-width="2"/>'+
      stars + chev + '</svg>';
  }

  // ========== ROW + LIST ==========

  function buildRow(u, isMe){
    const row = document.createElement('div');
    row.className = 'lb-row' + (isMe ? ' me' : '') +
      (u.rank <= 10 ? ' z-promote' : u.rank > 40 ? ' z-demote' : ' z-neutral');
    row.dataset.id = u.id;
    row.dataset.rank = u.rank;

    // rank cell
    const rankCell = document.createElement('div');
    rankCell.className = 'lb-rank';
    if(u.rank <= 10){
      rankCell.innerHTML = rankBadgeSVG(u.rank, 32);
    } else {
      const num = document.createElement('span');
      num.className = 'lb-rank-num';
      num.textContent = u.rank;
      rankCell.appendChild(num);
    }
    row.appendChild(rankCell);

    row.appendChild(avatarEl(u.avatar, 42, isMe ? '#e6112d' : null));

    const info = document.createElement('div');
    info.className = 'lb-info';
    const name = document.createElement('div');
    name.className = 'lb-name';
    name.textContent = u.name;
    if(isMe){
      const tag = document.createElement('span');
      tag.className = 'lb-you-tag';
      tag.textContent = 'אתה';
      name.appendChild(tag);
    }
    info.appendChild(name);
    if(u.tag){
      const t = document.createElement('div');
      t.className = 'lb-tag';
      t.textContent = u.tag;
      info.appendChild(t);
    }
    row.appendChild(info);

    const metrics = document.createElement('div');
    metrics.className = 'lb-metrics';
    metrics.innerHTML =
      '<div class="lb-m"><span class="lb-m-ic">🔥</span><span class="lb-m-v">'+u.streak+'</span></div>'+
      '<div class="lb-m"><span class="lb-m-v">'+Math.floor(u.totalMin)+'</span><span class="lb-m-u">דק׳</span></div>'+
      '<div class="lb-score'+(isMe?' me':'')+'">'+fmtScore(u.score)+'</div>';
    row.appendChild(metrics);

    return row;
  }

  function buildZone(kind, left, right){
    const z = document.createElement('div');
    z.className = 'lb-zone ' + kind;
    z.innerHTML = '<span>'+left+'</span><span>'+right+'</span>';
    return z;
  }

  // ========== MODAL ==========

  let modalEl = null, listEl = null, popMsgEl = null, fileInputEl = null, ctaBtnEl = null;
  let currentData = null;

  function buildModal(){
    if(modalEl) return;

    modalEl = document.createElement('div');
    modalEl.className = 'lb-modal';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-label', 'ליגת השבוע');
    modalEl.innerHTML =
      '<div class="lb-backdrop"></div>'+
      '<div class="lb-sheet">'+
        '<button class="lb-close" type="button" aria-label="סגור">×</button>'+
        '<header class="lb-header">'+
          '<div class="lb-mascot">'+
            '<svg viewBox="0 0 100 100" width="76" height="76">'+
              '<circle cx="50" cy="52" r="40" fill="#ffe14a"/>'+
              '<path d="M22 38 Q50 8 78 38 L78 52 Q62 36 50 36 Q38 36 22 52 Z" fill="#3b0f3a"/>'+
              '<circle cx="38" cy="55" r="5" fill="#1a0a0a"/>'+
              '<circle cx="62" cy="55" r="5" fill="#1a0a0a"/>'+
              '<circle cx="40" cy="53" r="1.6" fill="#fff"/>'+
              '<circle cx="64" cy="53" r="1.6" fill="#fff"/>'+
              '<path d="M38 72 Q50 82 62 72" stroke="#1a0a0a" stroke-width="3.5" fill="none" stroke-linecap="round"/>'+
              '<ellipse cx="50" cy="20" rx="20" ry="3" fill="none" stroke="#fff" stroke-width="2.5"/>'+
            '</svg>'+
          '</div>'+
          '<div class="lb-title-block">'+
            '<div class="lb-title">המסע ל<span class="lb-accent">אוורסט.</span></div>'+
          '</div>'+
        '</header>'+
        '<div class="lb-pop"></div>'+
        '<div class="lb-list" tabindex="0"></div>'+
        '<footer class="lb-foot">'+
          '<button class="lb-photo-btn" type="button">העלה תמונה</button>'+
          '<input type="file" accept="image/*" class="lb-file" hidden>'+
          '<button class="lb-cta" type="button">סיימתי</button>'+
        '</footer>'+
      '</div>';

    document.body.appendChild(modalEl);

    listEl   = modalEl.querySelector('.lb-list');
    popMsgEl = modalEl.querySelector('.lb-pop');
    fileInputEl = modalEl.querySelector('.lb-file');
    ctaBtnEl = modalEl.querySelector('.lb-cta');

    // wire
    modalEl.querySelector('.lb-close').addEventListener('click', closeModal);
    modalEl.querySelector('.lb-backdrop').addEventListener('click', closeModal);
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && modalEl.classList.contains('open')) closeModal();
    });
    modalEl.querySelector('.lb-photo-btn').addEventListener('click', function(){
      fileInputEl.click();
    });
    fileInputEl.addEventListener('change', function(e){
      const f = e.target.files[0]; if(!f) return;
      downscaleImage(f, 320).then(function(dataUrl){
        LB_API.savePhoto(dataUrl);
        renderList({ scrollToMe: true });
        updateHomeRankBadge();
      });
    });
    ctaBtnEl.addEventListener('click', function(){
      simulateSession(10);
    });

    // (timer pill removed per design — weekly reset still happens, just not surfaced here)
  }

  function downscaleImage(file, maxSize){
    return new Promise(function(resolve, reject){
      const r = new FileReader();
      r.onload = function(){
        const img = new Image();
        img.onload = function(){
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = reject;
        img.src = r.result;
      };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function renderList(opts){
    opts = opts || {};
    currentData = getWeekly();
    listEl.innerHTML = '';

    currentData.slice(0, 10).forEach(function(u){
      listEl.appendChild(buildRow(u, !!u.isMe));
    });

    listEl.appendChild(buildZone('neutral', '· באמצע ·', 'שמור על הקצב'));
    currentData.slice(10, 40).forEach(function(u){
      listEl.appendChild(buildRow(u, !!u.isMe));
    });

    listEl.appendChild(buildZone('demote', '↓ אזור ירידה', 'נשימה אחת, בלי פאניקה'));
    currentData.slice(40).forEach(function(u){
      listEl.appendChild(buildRow(u, !!u.isMe));
    });

    if(opts.scrollToMe){
      requestAnimationFrame(function(){
        const meRow = listEl.querySelector('.lb-row.me');
        if(meRow){
          const top = meRow.offsetTop - listEl.clientHeight/2 + meRow.clientHeight/2;
          listEl.scrollTo({ top: top, behavior: opts.smooth === false ? 'auto' : 'smooth' });
        }
      });
    }
  }

  function showPop(msg, kind){
    popMsgEl.className = 'lb-pop ' + (kind || '');
    popMsgEl.textContent = msg;
    popMsgEl.classList.add('show');
    clearTimeout(showPop._t);
    showPop._t = setTimeout(function(){
      popMsgEl.classList.remove('show');
    }, 4500);
  }

  // Simulate completing a session — used by CTA button + by wm:complete event.
  // Backend path: persists to Supabase first, then re-fetches and re-renders.
  // Mock path: bumps localStorage and re-computes locally.
  function simulateSession(minutes){
    if(ctaBtnEl) ctaBtnEl.disabled = true;
    const beforeData = currentData || getWeekly();
    const beforeMe = beforeData.find(function(u){ return u.isMe; });
    const beforeRank = beforeMe ? beforeMe.rank : 0;

    function finalizeRender(){
      renderList({ scrollToMe: true });
      const afterMe = currentData.find(function(u){ return u.isMe; });
      const afterRank = afterMe ? afterMe.rank : 0;
      const delta = beforeRank - afterRank;

      const meRow = listEl.querySelector('.lb-row.me');
      if(meRow){
        meRow.classList.add('shake');
        setTimeout(function(){
          meRow.classList.remove('shake');
          meRow.classList.add('pop');
          setTimeout(function(){ meRow.classList.remove('pop'); }, 900);
        }, 550);
      }
      updateHomeRankBadge();

      if(delta > 0)      showPop('↑ עלית ' + delta + ' מקומות! מקום #' + afterRank, 'up');
      else if(delta < 0) showPop('↓ ירדת ' + (-delta) + ' מקומות. רגוע, גם בודהא נפל לפעמים', 'down');
      else               showPop('המקום נשמר במקום #' + afterRank + '. סטטוס: יציב כמו הר', 'same');

      if(ctaBtnEl) ctaBtnEl.disabled = false;
    }

    if(useBackend()){
      // Persist to Supabase, then re-fetch + re-render
      window.WMAuth.recordSession(minutes, null)
        .catch(function(e){ console.warn('[lb] recordSession', e); })
        .then(function(){ return refreshBackend(); })
        .then(function(){ setTimeout(finalizeRender, 350); });
    } else {
      // Mock path: bump localStorage so the existing app's HUD stays in sync
      LB_API.creditSession(minutes);
      setTimeout(finalizeRender, 500);
    }
  }

  function openModal(opts){
    opts = opts || {};
    buildModal();
    renderList({ scrollToMe: true, smooth: false });
    // force reflow before adding 'open' for transition
    modalEl.offsetHeight;
    modalEl.classList.add('open');
    document.body.style.overflow = 'hidden';

    // mark seen today
    localStorage.setItem(ME_SEEN_KEY, todayKey());

    // If backend is available, fetch fresh data and re-render once it lands
    if(useBackend()){
      refreshBackend().then(function(ok){
        if(ok) renderList({ scrollToMe: true });
      });
    }

    if(opts.afterSession){
      // wait for slide-in to finish, then animate
      setTimeout(function(){ simulateSession(opts.creditedMinutes || 10); }, 700);
    }
  }

  function closeModal(){
    if(!modalEl) return;
    modalEl.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ========== HOME BADGE ==========
  // Adds a small chevron-rank badge next to the existing game HUD when user is in top 10.

  function updateHomeRankBadge(){
    const data = getWeekly();
    const me = data.find(function(u){ return u.isMe; });
    if(!me) return;
    const hud = document.getElementById('gameHud');
    if(!hud) return;
    let badge = document.getElementById('lbHomeBadge');
    if(me.rank > 10){
      if(badge) badge.remove();
      return;
    }
    if(!badge){
      badge = document.createElement('button');
      badge.id = 'lbHomeBadge';
      badge.className = 'lb-home-badge';
      badge.type = 'button';
      badge.title = 'הליגה השבועית';
      badge.addEventListener('click', function(){ openModal({}); });
      hud.appendChild(badge);
    }
    badge.innerHTML = rankBadgeSVG(me.rank, 26) +
      '<span class="lb-home-badge-num">#' + me.rank + '</span>';
  }

  // ========== STYLES ==========
  const css = `
.lb-modal{
  position:fixed; inset:0; z-index:200;
  display:flex; align-items:center; justify-content:center;
  opacity:0; pointer-events:none;
  transition: opacity .35s ease;
}
.lb-modal.open{ opacity:1; pointer-events:auto; }
.lb-backdrop{
  position:absolute; inset:0; background:rgba(12,10,15,.78);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
}
.lb-sheet{
  position:relative; z-index:1; direction:rtl;
  width:min(560px, 94vw); max-height:88vh;
  display:flex; flex-direction:column;
  background:linear-gradient(180deg, #fff7d6 0%, #f4e9d2 100%);
  color:#1a0a0a; font-family:"Heebo",sans-serif;
  border-radius:24px; overflow:hidden;
  border:3px solid #1a0a0a;
  box-shadow:0 30px 80px rgba(0,0,0,.55);
  transform:translateY(20px) scale(.96);
  opacity:0;
  transition: transform .4s cubic-bezier(.34,1.56,.64,1), opacity .3s ease;
}
.lb-modal.open .lb-sheet{ transform:translateY(0) scale(1); opacity:1; }
.lb-close{
  position:absolute; top:12px; left:14px; z-index:5;
  width:32px; height:32px; border-radius:50%;
  border:2px solid #1a0a0a; background:#fff; color:#1a0a0a;
  font-family:"Heebo",sans-serif; font-size:20px; font-weight:700; line-height:1;
  cursor:pointer; padding:0;
  display:flex; align-items:center; justify-content:center;
  transition: background .15s, transform .15s;
}
.lb-close:hover{ background:#1a0a0a; color:#fff; transform: rotate(90deg); }

.lb-header{
  display:grid; grid-template-columns:auto 1fr; gap:14px; align-items:center;
  padding:20px 22px 16px; background:#ffe14a;
  border-bottom:3px solid #1a0a0a;
  position:relative;
}
.lb-mascot{
  background:radial-gradient(circle at 30% 30%, #fff, #ffe14a 70%);
  border-radius:50%; padding:5px; border:3px solid #1a0a0a;
  filter: drop-shadow(0 4px 0 #1a0a0a);
  animation: lb-bob 3.4s ease-in-out infinite;
}
@keyframes lb-bob{
  0%,100%{ transform:translateY(0) rotate(-3deg); }
  50%    { transform:translateY(-5px) rotate(3deg); }
}
.lb-title-block{ display:flex; flex-direction:column; gap:3px; }
.lb-eyebrow{
  font-family:"JetBrains Mono",monospace; font-size:10px; letter-spacing:.18em;
  text-transform:uppercase; color:#5a3a20; font-weight:800;
}
.lb-title{
  font-family:"Frank Ruhl Libre",serif; font-weight:900; font-size:32px;
  line-height:.9; letter-spacing:-.02em;
}
.lb-accent{ color:#e6112d; }
.lb-sub{
  font-size:12px; line-height:1.4; color:#3b1a0a;
  font-weight:500; margin-top:3px; max-width:340px;
}
.lb-timer-wrap{
  grid-column: 1 / -1;
  display:flex; justify-content:flex-start; margin-top:6px;
}
.lb-timer-pill{
  display:inline-flex; align-items:center; gap:6px;
  padding:5px 12px; border-radius:999px;
  background:#1a0a0a; color:#ffe14a; border:2px solid #1a0a0a;
  font-family:"JetBrains Mono",monospace; font-weight:800; font-size:10px;
  letter-spacing:.14em; text-transform:uppercase;
}
.lb-timer-val{ font-variant-numeric:tabular-nums; }
.lb-timer-lbl{ opacity:.65; }

.lb-pop{
  position:absolute; top:118px; left:50%;
  transform:translate(-50%, -10px);
  background:#1eaa6e; color:#fff;
  padding:10px 22px; border-radius:999px;
  font-family:"JetBrains Mono",monospace; font-weight:800;
  font-size:12px; letter-spacing:.12em; text-transform:uppercase;
  box-shadow: 0 6px 0 #0e3b2b, 0 12px 28px rgba(0,0,0,.3);
  opacity:0; pointer-events:none; z-index:10;
  transition: transform .35s cubic-bezier(.34,1.56,.64,1), opacity .25s ease;
  white-space:nowrap;
}
.lb-pop.show{ opacity:1; transform:translate(-50%, 0); }
.lb-pop.down{ background:#e6112d; box-shadow:0 6px 0 #7a0a18, 0 12px 28px rgba(0,0,0,.3); }
.lb-pop.same{ background:#5a3a20; box-shadow:0 6px 0 #2a1a0a, 0 12px 28px rgba(0,0,0,.3); }

.lb-list{
  flex:1; overflow-y:auto; padding:14px 18px 8px;
  scroll-behavior:smooth; outline:none;
}
.lb-list::-webkit-scrollbar{ width:6px; }
.lb-list::-webkit-scrollbar-thumb{ background:rgba(26,10,10,.3); border-radius:3px; }

.lb-zone{
  display:flex; justify-content:space-between; align-items:center;
  padding:8px 12px; margin:10px 0 6px;
  font-family:"JetBrains Mono",monospace; font-size:9px; letter-spacing:.16em;
  text-transform:uppercase; font-weight:800;
  border-radius:8px;
}
.lb-zone.promote{ background:#c7f000; color:#0e3b2b; border:2px dashed #0e3b2b; }
.lb-zone.neutral{
  background:transparent; color:#5a3a20;
  border-top:1px dashed #5a3a20; border-radius:0; padding:5px 4px;
}
.lb-zone.demote{ background:#ffd0b8; color:#e6112d; border:2px dashed #e6112d; }

.lb-row{
  display:grid; grid-template-columns: 48px auto 1fr auto; gap:10px;
  align-items:center;
  padding:8px 12px; margin-bottom:5px; border-radius:12px;
  background:#fff; border:2px solid rgba(26,10,10,.08);
  transition: transform .35s cubic-bezier(.34,1.56,.64,1), box-shadow .2s;
}
.lb-row:hover{
  transform:translateX(3px);
  box-shadow:-3px 3px 0 rgba(26,10,10,.18);
}
.lb-row.z-promote{ background:linear-gradient(135deg, #fff, #f0ffe0); }
.lb-row.z-demote{ background:linear-gradient(135deg, #fff, #fff0e8); opacity:.85; }
.lb-row.me{
  background:linear-gradient(135deg, #fff7d6, #ffe14a);
  border:3px solid #e6112d;
  box-shadow: 0 4px 0 #1a0a0a, 0 8px 20px rgba(230,17,45,.25);
  transform: scale(1.02);
}
.lb-row.shake{ animation: lb-shake .55s ease-in-out; }
.lb-row.pop{ animation: lb-pop .9s cubic-bezier(.34,1.56,.64,1); }
@keyframes lb-shake{
  0%,100%{ transform: scale(1.02) translateX(0); }
  25%    { transform: scale(1.02) translateX(-4px); }
  75%    { transform: scale(1.02) translateX(4px); }
}
@keyframes lb-pop{
  0%   { transform: scale(1.02); }
  30%  { transform: scale(1.12); }
  60%  { transform: scale(.97); }
  100% { transform: scale(1.02); }
}

.lb-rank{ display:flex; align-items:center; justify-content:center; }
.lb-rank-num{
  font-family:"Frank Ruhl Libre",serif; font-size:22px; font-weight:900;
  color:#5a3a20; min-width:32px; text-align:center;
}

.lb-av{ border-radius:50%; overflow:hidden; position:relative; }

.lb-info{ display:flex; flex-direction:column; gap:1px; min-width:0; }
.lb-name{
  font-weight:800; font-size:14px;
  display:flex; align-items:center; gap:8px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.lb-you-tag{
  display:inline-block; background:#e6112d; color:#fff;
  padding:1px 7px; border-radius:999px;
  font-family:"JetBrains Mono",monospace; font-size:9px; font-weight:800;
  letter-spacing:.14em;
}
.lb-tag{ font-size:10px; color:#5a3a20; opacity:.75; }

.lb-metrics{ display:flex; align-items:center; gap:14px; }
.lb-m{
  display:flex; align-items:baseline; gap:3px;
  font-family:"JetBrains Mono",monospace; font-weight:800; font-size:12px;
  color:#3b1a0a;
}
.lb-m-ic{ font-size:12px; }
.lb-m-u{ font-size:9px; opacity:.6; font-weight:700; }
.lb-score{
  background:#1a0a0a; color:#ffe14a;
  padding:4px 10px; border-radius:8px;
  font-family:"Frank Ruhl Libre",serif; font-weight:900; font-size:15px;
  min-width:50px; text-align:center;
}
.lb-score.me{ background:#e6112d; color:#fff; }

.lb-foot{
  display:flex; gap:10px; align-items:center; justify-content:space-between;
  padding:12px 18px 14px;
  background:linear-gradient(180deg, transparent, #f4e9d2 30%);
  border-top:1px solid rgba(26,10,10,.08);
}
.lb-photo-btn{
  padding:7px 14px; border-radius:999px;
  border:2px solid #1a0a0a; background:transparent; color:#1a0a0a;
  cursor:pointer;
  font-family:"JetBrains Mono",monospace; font-weight:800; font-size:10px;
  letter-spacing:.14em; text-transform:uppercase;
  transition: background .15s, color .15s;
}
.lb-photo-btn:hover{ background:#1a0a0a; color:#ffe14a; }
.lb-cta{
  flex:1; padding:12px 16px; border-radius:12px; border:none;
  background:#e6112d; color:#fff;
  font-family:"JetBrains Mono",monospace; font-weight:900; font-size:12px;
  letter-spacing:.15em; text-transform:uppercase; cursor:pointer;
  box-shadow:0 4px 0 #7a0a18, 0 8px 18px rgba(230,17,45,.35);
  transition: transform .1s, box-shadow .1s, opacity .15s;
}
.lb-cta:hover:not(:disabled){ transform:translateY(2px); box-shadow:0 2px 0 #7a0a18, 0 4px 10px rgba(230,17,45,.4); }
.lb-cta:disabled{ opacity:.55; cursor:wait; }

/* Home rank badge — sits next to the existing game HUD pills */
.lb-home-badge{
  appearance:none; border:none; cursor:pointer;
  display:flex; align-items:center; gap:6px;
  padding:5px 12px 5px 8px; border-radius:999px;
  background: rgba(244,233,210,.92);
  color:#0c0a0f;
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  box-shadow: 0 4px 14px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.4);
  font-family:"JetBrains Mono",monospace;
  transition: transform .18s, box-shadow .18s;
}
.lb-home-badge:hover{ transform:translateY(-1px); box-shadow:0 6px 18px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.4); }
.lb-home-badge-num{ font-weight:800; font-size:12px; letter-spacing:.04em; }

@media (max-width: 540px){
  .lb-sheet{ width:96vw; max-height:92vh; border-radius:18px; }
  .lb-header{ padding:18px 16px 12px; gap:12px; }
  .lb-title{ font-size:26px; }
  .lb-mascot svg{ width:60px; height:60px; }
  .lb-row{ grid-template-columns: 40px auto 1fr auto; padding:7px 10px; gap:8px; }
  .lb-metrics{ gap:8px; }
  .lb-score{ font-size:13px; padding:3px 8px; min-width:42px; }
  .lb-name{ font-size:13px; }
  .lb-foot{ padding:10px 14px 12px; }
  .lb-cta{ font-size:11px; padding:10px 12px; }
  .lb-photo-btn{ font-size:9px; padding:6px 10px; }
}
@media (prefers-reduced-motion: reduce){
  .lb-mascot, .lb-row, .lb-pop, .lb-sheet, .lb-modal{ animation:none !important; transition:none !important; }
}
  `.trim();

  const styleEl = document.createElement('style');
  styleEl.id = 'lb-styles';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ========== BOOTSTRAP ==========

  function openOnEntry(){
    // Show modal on page load — every entry per user spec.
    // Wait for the page to settle so the intro doesn't fight with us.
    // When backend is enabled, defer until the user is signed in AND unlocked;
    // the onboarding overlay handles the pre-unlock state.
    if(window.WMAuth && window.WMAuth.isEnabled()){
      const state = window.WMAuth.getState();
      if(!state.isAuthed || !state.isUnlocked) return;
    }
    setTimeout(function(){ openModal({}); }, 1400);
  }

  function bootstrap(){
    openOnEntry();
    updateHomeRankBadge();
    wireBackendListeners();
  }

  // ========== BACKEND INTEGRATION ==========
  // When WMAuth becomes ready or the user signs in / unlocks, refresh data
  // and pop the leaderboard. Also subscribe to realtime notifications so we
  // can show in-app toasts for "friend passed you" and "friend joined".
  let _notifChannel = null;
  let _lastWiredAuth = null;
  function wireBackendListeners(){
    if(!window.WMAuth || !window.WMAuth.isEnabled()) return;
    window.WMAuth.onChange(function(state){
      if(state.isAuthed && state.isUnlocked){
        // Refresh + open if not already open
        refreshBackend().then(function(){
          updateHomeRankBadge();
          // Open the modal on first successful unlock per session
          if(!_lastWiredAuth){
            setTimeout(function(){ openModal({}); }, 1600);
            _lastWiredAuth = state.userId;
          }
        });
        // Subscribe once
        if(!_notifChannel){
          _notifChannel = window.WMAuth.subscribeNotifications(handleIncomingNotification);
        }
      } else if(!state.isAuthed){
        _lastWiredAuth = null;
        _backendCache = null;
        if(_notifChannel && _notifChannel.unsubscribe){ _notifChannel.unsubscribe(); }
        _notifChannel = null;
        const badge = document.getElementById('lbHomeBadge');
        if(badge) badge.remove();
      }
    });
  }

  function handleIncomingNotification(notif){
    if(!notif) return;
    if(notif.kind === 'friend_passed'){
      const name = notif.payload && notif.payload.passer_name;
      showInAppToast((name || 'חבר') + ' עבר אותך בדירוג!', 'down');
      refreshBackend().then(function(){ updateHomeRankBadge(); if(modalEl && modalEl.classList.contains('open')) renderList({ scrollToMe: true }); });
    } else if(notif.kind === 'friend_joined'){
      const fname = (notif.payload && notif.payload.friend_name) || 'חבר חדש';
      showInAppToast(fname + ' הצטרף ללידרבורד שלך', 'up');
      refreshBackend().then(function(){ updateHomeRankBadge(); });
    } else if(notif.kind === 'weekly_summary'){
      // open the leaderboard with a special "week closed" banner
      openModal({});
    }
    // mark as read
    if(window.WMAuth && notif.id){
      window.WMAuth.markNotificationRead(notif.id).catch(function(){});
    }
  }

  function showInAppToast(text, kind){
    let host = document.getElementById('wmInAppToast');
    if(!host){
      host = document.createElement('div');
      host.id = 'wmInAppToast';
      host.style.cssText = 'position:fixed; top:14px; left:50%; transform:translateX(-50%); z-index:250; display:flex; flex-direction:column; gap:8px; pointer-events:none; direction:rtl';
      document.body.appendChild(host);
    }
    const t = document.createElement('div');
    t.style.cssText = 'pointer-events:auto; padding:11px 22px; border-radius:999px; font-family:"JetBrains Mono",monospace; font-weight:800; font-size:12px; letter-spacing:.12em; text-transform:uppercase; box-shadow:0 6px 0 ' + (kind==='down'?'#7a0a18':'#0e3b2b') + ', 0 12px 28px rgba(0,0,0,.3); background:' + (kind==='down'?'#e6112d':'#1eaa6e') + '; color:#fff; transform:translateY(-30px); opacity:0; transition:transform .35s cubic-bezier(.34,1.56,.64,1), opacity .25s ease; cursor:pointer';
    t.textContent = text;
    t.addEventListener('click', function(){ openModal({}); });
    host.appendChild(t);
    requestAnimationFrame(function(){
      t.style.transform = 'translateY(0)';
      t.style.opacity = '1';
    });
    setTimeout(function(){
      t.style.transform = 'translateY(-30px)';
      t.style.opacity = '0';
      setTimeout(function(){ t.remove(); }, 350);
    }, 5500);
  }

  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    bootstrap();
  } else {
    window.addEventListener('load', bootstrap);
  }

  // Re-open after meditation completes, with rank-up animation
  document.addEventListener('wm:complete', function(){
    setTimeout(function(){
      buildModal();
      renderList({ scrollToMe: true, smooth:false });
      modalEl.offsetHeight;
      modalEl.classList.add('open');
      document.body.style.overflow = 'hidden';
      // Use simulateSession's machinery so the backend (if any) records the
      // session and we re-fetch with rank-up animation.
      setTimeout(function(){ simulateSession(10); }, 600);
    }, 2400);
  });

  // Expose for manual open from elsewhere (e.g. game panel)
  window.WMLeaderboard = {
    open: function(opts){ openModal(opts || {}); },
    close: closeModal,
    refresh: function(){ if(modalEl && modalEl.classList.contains('open')) renderList({}); updateHomeRankBadge(); }
  };

})();

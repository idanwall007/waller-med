/* =============================================================================
 * Waller Meditation · Onboarding Overlay
 * =============================================================================
 * Full-screen gate that sits above the app until the user has:
 *   (1) signed in with Google
 *   (2) invited 3 friends who completed signup
 *
 * Demo-mode (no backend config) → overlay does nothing; app is open.
 * =============================================================================
 */
(function(){
  "use strict";

  // Wait for WMAuth to exist before booting.
  function boot(){
    if(!window.WMAuth){ setTimeout(boot, 60); return; }
    if(!window.WMAuth.isEnabled()){
      // Demo mode: don't render anything. App stays open.
      return;
    }
    new Onboarding().mount();
  }
  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    boot();
  } else {
    window.addEventListener('load', boot);
  }

  // ---------------------------------------------------------------------------
  // CSS
  // ---------------------------------------------------------------------------
  const CSS = `
.wm-onb{
  position:fixed; inset:0; z-index:300;
  background:linear-gradient(180deg, #fff7d6 0%, #f4c84a 100%);
  color:#1a0a0a; font-family:"Heebo",system-ui,sans-serif;
  display:flex; flex-direction:column; overflow:hidden;
  direction:rtl;
  opacity:0; pointer-events:none;
  transition: opacity .4s ease;
}
.wm-onb.open{ opacity:1; pointer-events:auto; }
.wm-onb.unlocked{ background:linear-gradient(180deg, #c7f000 0%, #0e3b2b 130%); color:#0e3b2b; }

.wm-onb-stage{
  flex:1; display:flex; align-items:center; justify-content:center;
  padding:clamp(28px, 4vw, 60px);
  position:relative; overflow-y:auto;
}
.wm-onb-card{
  width:min(560px, 100%);
  background:#fff7d6;
  border:3px solid #1a0a0a;
  border-radius:24px;
  padding:clamp(28px, 4vw, 44px);
  box-shadow: 0 30px 80px rgba(0,0,0,.35), 6px 6px 0 #1a0a0a;
  display:flex; flex-direction:column; gap:clamp(18px, 2vw, 26px);
}
.wm-onb.unlocked .wm-onb-card{
  background:#fff7d6; border-color:#0e3b2b; box-shadow: 6px 6px 0 #0e3b2b;
}

.wm-onb-eyebrow{
  font-family:"JetBrains Mono",monospace; font-size:11px; letter-spacing:.22em;
  text-transform:uppercase; color:#5a3a20; font-weight:800;
  display:flex; align-items:center; gap:10px;
}
.wm-onb-eyebrow .step{ background:#1a0a0a; color:#ffe14a; padding:3px 9px; border-radius:999px; font-size:10px; }
.wm-onb-rule{ display:inline-block; width:36px; height:2px; background:#5a3a20; }

.wm-onb-title{
  font-family:"Frank Ruhl Libre",serif; font-weight:900;
  font-size:clamp(36px, 5.5vw, 64px); line-height:.9;
  letter-spacing:-.025em;
}
.wm-onb-title .accent{ color:#e6112d; }
.wm-onb.unlocked .wm-onb-title .accent{ color:#1eaa6e; }

.wm-onb-sub{
  font-size:clamp(14px, 1.15vw, 17px); line-height:1.55; color:#3a1a0a;
  font-weight:500; max-width:480px;
}

.wm-onb-inviter{
  display:flex; align-items:center; gap:14px; padding:14px 18px;
  background:rgba(230,17,45,.08); border:2px dashed #e6112d; border-radius:14px;
}
.wm-onb-inviter .av{
  width:54px; height:54px; border-radius:50%; background:#e6112d center/cover;
  flex:0 0 54px; box-shadow:0 0 0 3px #fff, 0 0 0 5px #e6112d;
}
.wm-onb-inviter .who{ display:flex; flex-direction:column; gap:2px; }
.wm-onb-inviter .who .label{
  font-family:"JetBrains Mono",monospace; font-size:10px; font-weight:800;
  letter-spacing:.16em; text-transform:uppercase; color:#e6112d;
}
.wm-onb-inviter .who .name{ font-family:"Frank Ruhl Libre",serif; font-weight:900; font-size:20px; line-height:1; }

.wm-onb-google{
  appearance:none; border:none; cursor:pointer;
  display:flex; align-items:center; justify-content:center; gap:12px;
  padding:14px 22px; border-radius:14px;
  background:#fff; color:#1a0a0a; border:3px solid #1a0a0a;
  font-family:"Heebo",sans-serif; font-weight:800; font-size:15px;
  box-shadow:0 5px 0 #1a0a0a;
  transition: transform .1s, box-shadow .1s;
}
.wm-onb-google:hover{ transform:translateY(2px); box-shadow:0 3px 0 #1a0a0a; }
.wm-onb-google svg{ width:20px; height:20px; flex:0 0 20px; }

.wm-onb-fine{
  font-family:"JetBrains Mono",monospace; font-size:10px; letter-spacing:.14em;
  font-weight:600; color:#5a3a20; text-align:center; opacity:.7;
}

/* ---- invite step ---- */
.wm-onb-progress-wrap{
  display:flex; flex-direction:column; gap:8px;
}
.wm-onb-progress-meta{
  display:flex; justify-content:space-between; align-items:baseline;
  font-family:"JetBrains Mono",monospace; font-size:11px; letter-spacing:.14em;
  text-transform:uppercase; font-weight:800; color:#5a3a20;
}
.wm-onb-progress-meta .big{
  font-family:"Frank Ruhl Libre",serif; font-weight:900; font-size:28px;
  letter-spacing:-.02em; text-transform:none; color:#1a0a0a;
}
.wm-onb-progress-meta .big em{ font-style:normal; color:#e6112d; }
.wm-onb-progress{
  height:14px; background:rgba(26,10,10,.1); border-radius:999px; overflow:hidden;
  border:2px solid #1a0a0a;
}
.wm-onb-progress > i{
  display:block; height:100%;
  background:linear-gradient(90deg, #e6112d, #ffe14a);
  border-radius:999px;
  transition: width .55s cubic-bezier(.34,1.56,.64,1);
}

.wm-onb-friends{
  display:flex; flex-direction:column; gap:8px;
}
.wm-onb-friend{
  display:flex; align-items:center; gap:12px;
  padding:10px 14px; border-radius:12px;
  background:#fff; border:2px solid rgba(26,10,10,.1);
}
.wm-onb-friend.joined{ background:#c7f000; border-color:#0e3b2b; }
.wm-onb-friend .av{
  width:38px; height:38px; border-radius:50%; flex:0 0 38px;
  background:#5a3a20 center/cover;
  box-shadow:0 0 0 2px #fff;
}
.wm-onb-friend .info{ flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; }
.wm-onb-friend .name{ font-weight:800; font-size:14px; }
.wm-onb-friend .status{
  font-family:"JetBrains Mono",monospace; font-size:10px; letter-spacing:.12em;
  text-transform:uppercase; font-weight:700; opacity:.7;
}
.wm-onb-friend.joined .status{ color:#0e3b2b; opacity:1; }
.wm-onb-friend.pending .av{ background:rgba(26,10,10,.15); display:flex; align-items:center; justify-content:center; color:#5a3a20; font-weight:900; }
.wm-onb-friend.pending .av::before{ content:"?"; font-family:"Frank Ruhl Libre",serif; font-size:20px; }

.wm-onb-share{
  appearance:none; border:none; cursor:pointer;
  display:flex; align-items:center; justify-content:center; gap:10px;
  padding:16px 22px; border-radius:14px;
  background:#25D366; color:#fff;
  font-family:"Heebo",sans-serif; font-weight:900; font-size:15px;
  box-shadow:0 5px 0 #1a9c4a, 0 10px 22px rgba(37,211,102,.35);
  transition: transform .1s, box-shadow .1s;
}
.wm-onb-share:hover{ transform:translateY(2px); box-shadow:0 3px 0 #1a9c4a, 0 6px 14px rgba(37,211,102,.4); }
.wm-onb-share svg{ width:22px; height:22px; flex:0 0 22px; }

.wm-onb-actions{ display:flex; gap:10px; flex-wrap:wrap; }
.wm-onb-link-btn{
  flex:1; padding:14px 18px; border-radius:14px; border:3px solid #1a0a0a;
  background:transparent; color:#1a0a0a; cursor:pointer;
  font-family:"JetBrains Mono",monospace; font-weight:900; font-size:11px;
  letter-spacing:.14em; text-transform:uppercase;
  transition: background .15s, color .15s, transform .1s;
}
.wm-onb-link-btn:hover{ background:#1a0a0a; color:#ffe14a; }
.wm-onb-link-btn.copied{ background:#1eaa6e; border-color:#1eaa6e; color:#fff; }

.wm-onb-footer{
  display:flex; justify-content:space-between; align-items:center;
  padding:14px clamp(20px, 3vw, 32px);
  font-family:"JetBrains Mono",monospace; font-size:10px;
  letter-spacing:.18em; text-transform:uppercase; font-weight:700; color:#5a3a20;
  border-top:1.5px dashed rgba(26,10,10,.18);
  flex-wrap:wrap; gap:10px;
}
.wm-onb-signout{
  appearance:none; border:none; background:none; cursor:pointer;
  color:#5a3a20; font-family:"JetBrains Mono",monospace; font-size:10px;
  letter-spacing:.16em; font-weight:700; text-transform:uppercase;
  text-decoration: underline;
}

/* ---- mascot ---- */
.wm-onb-mascot{
  align-self:center;
  filter: drop-shadow(0 6px 0 #1a0a0a);
  animation: wm-bob 3.4s ease-in-out infinite;
}
.wm-onb.unlocked .wm-onb-mascot{ filter: drop-shadow(0 6px 0 #0e3b2b); }
@keyframes wm-bob{ 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-6px) rotate(3deg)} }

/* ---- unlock celebration ---- */
.wm-onb.unlocked .wm-onb-card{
  animation: wm-pop .7s cubic-bezier(.34,1.56,.64,1);
}
@keyframes wm-pop{ 0%{transform:scale(.85); opacity:0} 100%{transform:scale(1); opacity:1} }
.wm-onb-confetti{
  position:absolute; inset:0; pointer-events:none; overflow:hidden;
}
.wm-onb-confetti span{
  position:absolute; width:10px; height:14px; border-radius:2px;
  animation: wm-fall 2.4s linear infinite;
}
@keyframes wm-fall{
  0%   { transform: translateY(-20px) rotate(0deg); opacity:1; }
  100% { transform: translateY(110vh) rotate(720deg); opacity:0; }
}

@media (max-width: 540px){
  .wm-onb-card{ padding:22px 20px; gap:16px; border-radius:18px; }
  .wm-onb-title{ font-size:30px; }
  .wm-onb-google{ font-size:13px; padding:12px 16px; }
  .wm-onb-share{ font-size:13px; padding:13px 16px; }
}
@media (prefers-reduced-motion: reduce){
  .wm-onb, .wm-onb-card, .wm-onb-mascot, .wm-onb-progress > i{ animation:none !important; transition:none !important; }
}
  `.trim();

  // ---------------------------------------------------------------------------
  // Mascot SVG (yellow ball with halo, matches leaderboard mascot)
  // ---------------------------------------------------------------------------
  const MASCOT_SVG = '<svg viewBox="0 0 100 100" width="96" height="96">' +
    '<circle cx="50" cy="52" r="40" fill="#ffe14a"/>' +
    '<path d="M22 38 Q50 8 78 38 L78 52 Q62 36 50 36 Q38 36 22 52 Z" fill="#3b0f3a"/>' +
    '<circle cx="38" cy="55" r="5" fill="#1a0a0a"/>' +
    '<circle cx="62" cy="55" r="5" fill="#1a0a0a"/>' +
    '<circle cx="40" cy="53" r="1.6" fill="#fff"/>' +
    '<circle cx="64" cy="53" r="1.6" fill="#fff"/>' +
    '<path d="M38 72 Q50 82 62 72" stroke="#1a0a0a" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="50" cy="20" rx="20" ry="3" fill="none" stroke="#fff" stroke-width="2.5"/>' +
    '</svg>';

  const GOOGLE_G = '<svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3a12 12 0 1 1-3.3-13l5.7-5.7A20 20 0 1 0 44 24a20 20 0 0 0-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/><path fill="#4CAF50" d="M24 44a20 20 0 0 0 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.3-.4-3.5z"/></svg>';
  const WA_SVG = '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M19.1 17.3c-.3-.1-1.6-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.4c.1-.2.2-.3.3-.4.1-.2 0-.3 0-.5 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3a3 3 0 0 0-.9 2.2c0 1.3 1 2.6 1.1 2.7.1.2 1.9 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.6-.7 1.9-1.3.2-.7.2-1.2.1-1.3-.1-.1-.3-.2-.6-.3zm-3.1 7.7a9 9 0 0 1-4.6-1.3l-.3-.2-3.4.9 1-3.3-.2-.4a9.1 9.1 0 1 1 7.5 4.3zm0-20.2c-6 0-10.9 4.9-10.9 11 0 1.9.5 3.8 1.4 5.4L4.5 28l5-1.3c1.5.9 3.3 1.3 5 1.3 6 0 10.9-4.9 10.9-11s-4.9-11-10.9-11z"/></svg>';

  // ---------------------------------------------------------------------------
  // Onboarding controller
  // ---------------------------------------------------------------------------
  function Onboarding(){
    this.root = null;
    this.threshold = (window.WMConfig && window.WMConfig.UNLOCK_THRESHOLD) || 3;
    this.invitePreviewData = null;
    this.currentInviteCode = null;
    this.friendCount = 0;
    this.invites = [];
    this.pollHandle = null;
    this.realtimeChannel = null;
    this.lastState = null;
  }

  Onboarding.prototype.mount = function(){
    // inject styles
    if(!document.getElementById('wm-onb-styles')){
      const s = document.createElement('style');
      s.id = 'wm-onb-styles';
      s.textContent = CSS;
      document.head.appendChild(s);
    }

    // build root
    this.root = document.createElement('div');
    this.root.className = 'wm-onb';
    document.body.appendChild(this.root);

    // Check URL for ?invite= and preview if present
    const url = new URL(location.href);
    const code = url.searchParams.get('invite');
    if(code){
      this.currentInviteCode = code;
      WMAuth.invitePreview(code).then(function(data){
        if(data && data.ok) this.invitePreviewData = data;
        this.render();
      }.bind(this)).catch(function(){});
    }

    // Subscribe to auth state changes
    WMAuth.onChange(this.onAuthChange.bind(this));

    // Initial render
    this.render();
  };

  Onboarding.prototype.onAuthChange = function(state){
    this.lastState = state;
    if(state.isAuthed && !state.isUnlocked){
      // Refresh friend count + invites whenever we land here
      this.refreshData();
      this.startPolling();
      this.startRealtime();
    } else {
      this.stopPolling();
      this.stopRealtime();
    }
    this.render();
  };

  Onboarding.prototype.refreshData = function(){
    Promise.all([
      WMAuth.friendCount(),
      WMAuth.listInvites(),
    ]).then(function(res){
      this.friendCount = res[0];
      this.invites = res[1];
      if(this.friendCount >= this.threshold){
        // bump unlocked_at via refreshProfile
        WMAuth.refreshProfile();
      }
      this.render();
    }.bind(this)).catch(function(e){ console.warn('[Onboarding] refresh', e); });
  };

  Onboarding.prototype.startPolling = function(){
    if(this.pollHandle) return;
    // Poll friend count every 5s. Catches sign-ups that didn't fire realtime
    // (e.g. invitee opened the link on a different device).
    this.pollHandle = setInterval(this.refreshData.bind(this), 5000);
    // Also refresh when the tab regains focus
    this.focusHandler = this.refreshData.bind(this);
    window.addEventListener('focus', this.focusHandler);
  };

  Onboarding.prototype.stopPolling = function(){
    if(this.pollHandle){ clearInterval(this.pollHandle); this.pollHandle = null; }
    if(this.focusHandler){ window.removeEventListener('focus', this.focusHandler); this.focusHandler = null; }
  };

  Onboarding.prototype.startRealtime = function(){
    if(this.realtimeChannel) return;
    this.realtimeChannel = WMAuth.subscribeFriendships(function(){
      this.refreshData();
    }.bind(this));
  };

  Onboarding.prototype.stopRealtime = function(){
    if(this.realtimeChannel && this.realtimeChannel.unsubscribe){
      this.realtimeChannel.unsubscribe();
    }
    this.realtimeChannel = null;
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  Onboarding.prototype.render = function(){
    const state = this.lastState || WMAuth.getState();

    // If unlocked, fade out + remove
    if(state.isUnlocked){
      this.renderUnlocked();
      // Hide the overlay shortly after so the app is usable
      setTimeout(function(){
        if(this.root){
          this.root.classList.remove('open');
          setTimeout(function(){ if(this.root) this.root.style.display = 'none'; }.bind(this), 500);
        }
      }.bind(this), 2400);
      return;
    }

    // Ensure visible
    this.root.style.display = '';
    this.root.classList.add('open');
    this.root.classList.remove('unlocked');

    if(!state.isAuthed){
      this.renderWelcome();
    } else {
      this.renderInvite(state);
    }
  };

  Onboarding.prototype.renderWelcome = function(){
    const inviter = this.invitePreviewData;
    const inviterBlock = inviter ? (
      '<div class="wm-onb-inviter">' +
        '<div class="av"' + (inviter.sender_avatar ? ' style="background-image:url(' + inviter.sender_avatar + ')"' : '') + '></div>' +
        '<div class="who">' +
          '<div class="label">הוזמנת על ידי</div>' +
          '<div class="name">' + escapeHTML(inviter.sender_name || 'חבר') + '</div>' +
        '</div>' +
      '</div>'
    ) : '';

    this.root.innerHTML =
      '<div class="wm-onb-stage">' +
        '<div class="wm-onb-card">' +
          '<div class="wm-onb-eyebrow"><span class="step">01 / 03</span><span class="wm-onb-rule"></span>ברוך הבא</div>' +
          '<div class="wm-onb-mascot">' + MASCOT_SVG + '</div>' +
          '<h1 class="wm-onb-title">' +
            (inviter ? 'תצטרף<br/>אל <span class="accent">' + escapeHTML(firstName(inviter.sender_name)) + '.</span>' :
                       'אתגר<br/>ה<span class="accent">מדיטציה.</span>') +
          '</h1>' +
          '<p class="wm-onb-sub">' +
            (inviter
              ? escapeHTML(firstName(inviter.sender_name)) + ' מזמין/ה אותך להצטרף ללידרבורד שלהם. עשרה פרקים, מסע פנימי אחד, ושלושה חברים שלך מצידך — וזה מתחיל.'
              : 'ספרייה של עשרה תרגולים, יומן רצף, ולידרבורד שבועי עם החברים שלך. כדי להתחיל — צריך להירשם ולהזמין 3 חברים.') +
          '</p>' +
          inviterBlock +
          '<button class="wm-onb-google" type="button">' + GOOGLE_G + 'המשך עם Google</button>' +
          '<p class="wm-onb-fine">משתמשים ב-Google רק לזיהוי. אין הרשמה ל-newsletter, אין spam, אין דברים מוזרים.</p>' +
        '</div>' +
      '</div>' +
      '<div class="wm-onb-footer">' +
        '<span>WALLER · MEDITATION CHALLENGE</span>' +
        '<span>01 — SIGN IN</span>' +
      '</div>';

    this.root.querySelector('.wm-onb-google').addEventListener('click', function(){
      WMAuth.signInWithGoogle().catch(function(err){
        alert('נכשלה ההתחברות: ' + (err && err.message || err));
      });
    });
  };

  Onboarding.prototype.renderInvite = function(state){
    const cnt = Math.min(this.friendCount, this.threshold);
    const pct = Math.min(100, (cnt / this.threshold) * 100);
    const remaining = Math.max(0, this.threshold - this.friendCount);
    const profile = state.profile || {};
    const meName = firstName(profile.display_name || 'חבר');

    // Build invite rows: redeemed first, then pending placeholders up to threshold
    const redeemed = this.invites.filter(function(i){ return i.redeemer_id; });
    const slots = [];
    redeemed.forEach(function(inv){
      const p = inv.redeemer || {};
      slots.push(
        '<div class="wm-onb-friend joined">' +
          '<div class="av"' + (p.avatar_url ? ' style="background-image:url(' + p.avatar_url + ')"' : '') + '></div>' +
          '<div class="info">' +
            '<div class="name">' + escapeHTML(p.display_name || 'חבר חדש') + '</div>' +
            '<div class="status">✓ נרשם · מצורף ללידרבורד שלך</div>' +
          '</div>' +
        '</div>'
      );
    });
    for(let i = redeemed.length; i < this.threshold; i++){
      slots.push(
        '<div class="wm-onb-friend pending">' +
          '<div class="av"></div>' +
          '<div class="info">' +
            '<div class="name">ממתין לחבר ' + (i + 1) + '</div>' +
            '<div class="status">שלח את הלינק והשאר כאן</div>' +
          '</div>' +
        '</div>'
      );
    }

    this.root.innerHTML =
      '<div class="wm-onb-stage">' +
        '<div class="wm-onb-card">' +
          '<div class="wm-onb-eyebrow"><span class="step">02 / 03</span><span class="wm-onb-rule"></span>הזמן ' + this.threshold + ' חברים</div>' +
          '<h1 class="wm-onb-title">' + escapeHTML(meName) + ',<br/>תשלם ב<span class="accent">חברים.</span></h1>' +
          '<p class="wm-onb-sub">כל חבר חייב להירשם דרך הלינק שלך. רק אז הספירה זזה. הם יופיעו איתך בלידרבורד, ויקבלו עדכון כשתעבור אותם.</p>' +

          '<div class="wm-onb-progress-wrap">' +
            '<div class="wm-onb-progress-meta">' +
              '<div class="big"><em>' + this.friendCount + '</em> / ' + this.threshold + ' נרשמו</div>' +
              '<span>' + (remaining === 0 ? 'הכל מוכן!' : 'עוד ' + remaining + ' להמשך') + '</span>' +
            '</div>' +
            '<div class="wm-onb-progress"><i style="width:' + pct + '%"></i></div>' +
          '</div>' +

          '<div class="wm-onb-friends">' + slots.join('') + '</div>' +

          '<button class="wm-onb-share" type="button">' + WA_SVG + 'שתף ב-WhatsApp</button>' +
          '<div class="wm-onb-actions">' +
            '<button class="wm-onb-link-btn" type="button" data-act="copy">העתק לינק</button>' +
            '<button class="wm-onb-link-btn" type="button" data-act="more">צור לינק חדש</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="wm-onb-footer">' +
        '<span>' + escapeHTML(profile.display_name || '') + '</span>' +
        '<button class="wm-onb-signout" type="button">התנתק</button>' +
      '</div>';

    this.root.querySelector('.wm-onb-share').addEventListener('click', this.handleShare.bind(this));
    this.root.querySelectorAll('.wm-onb-link-btn').forEach(function(btn){
      btn.addEventListener('click', this.handleLinkBtn.bind(this));
    }.bind(this));
    this.root.querySelector('.wm-onb-signout').addEventListener('click', function(){
      if(confirm('להתנתק מהחשבון?')) WMAuth.signOut();
    });
  };

  Onboarding.prototype.renderUnlocked = function(){
    this.root.classList.add('unlocked');
    this.root.innerHTML =
      '<div class="wm-onb-confetti">' + buildConfetti(40) + '</div>' +
      '<div class="wm-onb-stage">' +
        '<div class="wm-onb-card">' +
          '<div class="wm-onb-eyebrow"><span class="step" style="background:#0e3b2b;color:#c7f000">03 / 03</span><span class="wm-onb-rule"></span>השער נפתח</div>' +
          '<div class="wm-onb-mascot">' + MASCOT_SVG + '</div>' +
          '<h1 class="wm-onb-title">צלילה<br/><span class="accent">ראשונה.</span></h1>' +
          '<p class="wm-onb-sub">3 חברים נרשמו. הלידרבורד שלך פעיל. עכשיו — פרק 01.</p>' +
        '</div>' +
      '</div>';
  };

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  Onboarding.prototype.getActiveInvite = function(){
    // Find a non-redeemed invite, or create one
    const pending = this.invites.find(function(i){ return !i.redeemer_id; });
    if(pending) return Promise.resolve(pending);
    return WMAuth.createInvite().then(function(inv){
      this.invites.unshift({ id: inv.id, code: inv.code, sender_id: null, redeemer_id: null });
      return { code: inv.code, id: inv.id };
    }.bind(this));
  };

  Onboarding.prototype.buildShareUrl = function(code){
    return location.origin + location.pathname + '?invite=' + encodeURIComponent(code);
  };

  Onboarding.prototype.handleShare = function(){
    this.getActiveInvite().then(function(inv){
      const url = this.buildShareUrl(inv.code);
      const meName = firstName((this.lastState && this.lastState.profile && this.lastState.profile.display_name) || 'חבר');
      const text = meName + ' מזמין אותך לאתגר המדיטציה של וולר 🧘\n' +
                   'תרגול יומי + לידרבורד שבועי שלך מולי.\n' + url;
      // Try native share first (mobile)
      if(navigator.share){
        navigator.share({ text: text }).catch(function(){ /* user cancelled */ });
      } else {
        // Fallback: WhatsApp web/desktop
        const wa = 'https://wa.me/?text=' + encodeURIComponent(text);
        window.open(wa, '_blank', 'noopener');
      }
    }.bind(this));
  };

  Onboarding.prototype.handleLinkBtn = function(e){
    const btn = e.currentTarget;
    const act = btn.dataset.act;
    if(act === 'copy'){
      this.getActiveInvite().then(function(inv){
        const url = this.buildShareUrl(inv.code);
        navigator.clipboard.writeText(url).then(function(){
          btn.classList.add('copied');
          const orig = btn.textContent;
          btn.textContent = '✓ הועתק';
          setTimeout(function(){
            btn.classList.remove('copied');
            btn.textContent = orig;
          }, 1800);
        });
      }.bind(this));
    } else if(act === 'more'){
      WMAuth.createInvite().then(function(){ this.refreshData(); }.bind(this));
    }
  };

  // ---------------------------------------------------------------------------
  // Utils
  // ---------------------------------------------------------------------------
  function escapeHTML(s){
    if(s == null) return '';
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function firstName(s){
    if(!s) return '';
    const parts = String(s).trim().split(/\s+/);
    return parts[0] || s;
  }
  function buildConfetti(n){
    const colors = ['#e6112d','#ffe14a','#1052cf','#ff2e87','#c7f000','#ff9966'];
    let out = '';
    for(let i = 0; i < n; i++){
      const c = colors[i % colors.length];
      const left = Math.random() * 100;
      const delay = Math.random() * 1.8;
      const dur = 1.6 + Math.random() * 1.5;
      out += '<span style="background:' + c + ';left:' + left.toFixed(1) + '%;animation-delay:' + delay.toFixed(2) + 's;animation-duration:' + dur.toFixed(2) + 's"></span>';
    }
    return out;
  }
})();

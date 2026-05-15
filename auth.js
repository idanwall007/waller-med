/* =============================================================================
 * Waller Meditation · Auth + Backend client
 * =============================================================================
 * Wraps @supabase/supabase-js with our app's RPC surface.
 *
 *   window.WMAuth.init()                  // call once on page load
 *   window.WMAuth.isEnabled()             // false when SUPABASE_URL is blank
 *   window.WMAuth.signInWithGoogle()
 *   window.WMAuth.signOut()
 *   window.WMAuth.createInvite()          // -> { code, id }
 *   window.WMAuth.invitePreview(code)     // -> { ok, sender_name, sender_avatar }
 *   window.WMAuth.redeemInvite(code)      // -> { ok, ... }
 *   window.WMAuth.recordSession(min, ch)  // -> { ok, streak, passed_friends }
 *   window.WMAuth.weeklyLeaderboard()     // -> [ {rank, user_id, ... rel_group} ]
 *   window.WMAuth.friendCount()           // -> int
 *   window.WMAuth.listInvites()           // -> [ { code, redeemer, ...} ]
 *   window.WMAuth.subscribeNotifications(fn)  // realtime push
 *   window.WMAuth.getState()              // { session, profile, isUnlocked, ... }
 *   window.WMAuth.onChange(fn)            // subscribe to state changes
 * =============================================================================
 */
(function(){
  "use strict";

  const cfg = window.WMConfig || {};
  const enabled = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);

  let client = null;
  let currentSession = null;
  let currentProfile = null;
  const listeners = new Set();

  // ---------------------------------------------------------------------------
  // Lazy-init: only construct the Supabase client when both keys exist AND
  // the supabase-js global is loaded. If not, every method becomes a no-op
  // and the app falls back to demo mode.
  // ---------------------------------------------------------------------------
  function ensureClient(){
    if(client) return client;
    if(!enabled) return null;
    if(!window.supabase || typeof window.supabase.createClient !== 'function'){
      console.warn('[WMAuth] supabase-js not loaded yet');
      return null;
    }
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    return client;
  }

  async function init(){
    ensureClient();
    if(!client) { notify(); return; }

    // Pick up any existing session
    const { data } = await client.auth.getSession();
    currentSession = data.session;
    if(currentSession) await loadProfile();

    // React to OAuth callbacks + sign-outs
    client.auth.onAuthStateChange(async function(event, session){
      currentSession = session;
      if(session){
        await loadProfile();
        // If the URL has ?invite=CODE and we just signed in, redeem it
        const url = new URL(location.href);
        const code = url.searchParams.get('invite');
        if(code && event === 'SIGNED_IN'){
          try{ await redeemInvite(code); }catch(_){}
          await loadProfile(); // refresh unlocked_at
          url.searchParams.delete('invite');
          history.replaceState(null, '', url.toString());
        }
      } else {
        currentProfile = null;
      }
      notify();
    });
    notify();
  }

  async function loadProfile(){
    if(!client || !currentSession) { currentProfile = null; return; }
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', currentSession.user.id)
      .single();
    if(error){
      console.warn('[WMAuth] loadProfile error', error);
      currentProfile = null;
    } else {
      currentProfile = data;
    }
  }

  async function refreshProfile(){
    await loadProfile();
    notify();
    return currentProfile;
  }

  // ---------------------------------------------------------------------------
  // Auth actions
  // ---------------------------------------------------------------------------
  async function signInWithGoogle(){
    if(!client) { ensureClient(); if(!client) throw new Error('Backend not configured'); }
    // Preserve invite code through the OAuth redirect by keeping it in the URL
    const redirectTo = location.origin + location.pathname + location.search;
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if(error) throw error;
  }

  async function signOut(){
    if(!client) return;
    await client.auth.signOut();
    currentSession = null;
    currentProfile = null;
    notify();
  }

  // ---------------------------------------------------------------------------
  // RPC wrappers
  // ---------------------------------------------------------------------------
  async function rpc(fnName, args){
    if(!client){ ensureClient(); if(!client) throw new Error('Backend not configured'); }
    const { data, error } = await client.rpc(fnName, args || {});
    if(error){ console.error('[WMAuth] rpc ' + fnName, error); throw error; }
    return data;
  }

  async function createInvite(){
    return rpc('create_invite');
  }
  async function invitePreview(code){
    if(!client){ ensureClient(); if(!client) return null; }
    const { data, error } = await client.rpc('invite_preview', { p_code: code });
    if(error){ console.error('[WMAuth] invite_preview', error); return null; }
    return data;
  }
  async function redeemInvite(code){
    return rpc('redeem_invite', { p_code: code });
  }
  async function recordSession(minutes, chapter){
    return rpc('record_session', { p_minutes: minutes, p_chapter: chapter || null });
  }
  async function weeklyLeaderboard(){
    return rpc('weekly_leaderboard');
  }
  async function markNotificationRead(id){
    return rpc('mark_notification_read', { p_id: id });
  }

  // ---------------------------------------------------------------------------
  // Direct queries
  // ---------------------------------------------------------------------------
  async function friendCount(){
    if(!client || !currentSession) return 0;
    const { count, error } = await client
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentSession.user.id);
    if(error){ console.warn('[WMAuth] friendCount', error); return 0; }
    return count || 0;
  }

  async function listFriendships(){
    if(!client || !currentSession) return [];
    // Two-step join: read friendship rows, then fetch the friend profiles
    const { data: rows, error } = await client
      .from('friendships')
      .select('friend_id, created_at, via_invite')
      .eq('user_id', currentSession.user.id)
      .order('created_at', { ascending: false });
    if(error){ console.warn('[WMAuth] friendships', error); return []; }
    if(!rows || !rows.length) return [];
    const ids = rows.map(function(r){ return r.friend_id; });
    const { data: profs } = await client
      .from('profiles')
      .select('id, display_name, avatar_url, streak, total_minutes')
      .in('id', ids);
    const profMap = {};
    (profs || []).forEach(function(p){ profMap[p.id] = p; });
    return rows.map(function(r){
      return Object.assign({}, r, { profile: profMap[r.friend_id] });
    });
  }

  async function listInvites(){
    if(!client || !currentSession) return [];
    const { data, error } = await client
      .from('invites')
      .select('*')
      .eq('sender_id', currentSession.user.id)
      .order('created_at', { ascending: false });
    if(error){ console.warn('[WMAuth] invites', error); return []; }
    // Attach redeemer profile if any
    const redeemerIds = (data || [])
      .map(function(i){ return i.redeemer_id; })
      .filter(Boolean);
    let profMap = {};
    if(redeemerIds.length){
      const { data: profs } = await client
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', redeemerIds);
      (profs || []).forEach(function(p){ profMap[p.id] = p; });
    }
    return (data || []).map(function(inv){
      return Object.assign({}, inv, {
        redeemer: inv.redeemer_id ? profMap[inv.redeemer_id] : null,
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Realtime: notifications stream
  // ---------------------------------------------------------------------------
  function subscribeNotifications(handler){
    if(!client || !currentSession) return null;
    const channel = client
      .channel('notif:' + currentSession.user.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: 'user_id=eq.' + currentSession.user.id,
      }, function(payload){ try{ handler(payload.new); }catch(e){ console.error(e); } })
      .subscribe();
    return channel;
  }

  // Subscribe to friendships INSERT — used by onboarding to react instantly
  // when an invited friend completes signup.
  function subscribeFriendships(handler){
    if(!client || !currentSession) return null;
    const channel = client
      .channel('friends:' + currentSession.user.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'friendships',
        filter: 'user_id=eq.' + currentSession.user.id,
      }, function(payload){ try{ handler(payload.new); }catch(e){ console.error(e); } })
      .subscribe();
    return channel;
  }

  // ---------------------------------------------------------------------------
  // State + listeners
  // ---------------------------------------------------------------------------
  function notify(){
    const s = getState();
    listeners.forEach(function(fn){ try{ fn(s); }catch(e){ console.error(e); } });
  }

  function getState(){
    return {
      enabled: enabled,
      session: currentSession,
      profile: currentProfile,
      isAuthed: !!currentSession,
      isUnlocked: !!(currentProfile && currentProfile.unlocked_at),
      userId: currentSession ? currentSession.user.id : null,
    };
  }

  function onChange(fn){
    listeners.add(fn);
    fn(getState());
    return function unsubscribe(){ listeners.delete(fn); };
  }

  // ---------------------------------------------------------------------------
  // Public surface
  // ---------------------------------------------------------------------------
  window.WMAuth = {
    isEnabled: function(){ return enabled; },
    init: init,
    signInWithGoogle: signInWithGoogle,
    signOut: signOut,
    createInvite: createInvite,
    invitePreview: invitePreview,
    redeemInvite: redeemInvite,
    recordSession: recordSession,
    weeklyLeaderboard: weeklyLeaderboard,
    markNotificationRead: markNotificationRead,
    friendCount: friendCount,
    listFriendships: listFriendships,
    listInvites: listInvites,
    subscribeNotifications: subscribeNotifications,
    subscribeFriendships: subscribeFriendships,
    refreshProfile: refreshProfile,
    getState: getState,
    onChange: onChange,
  };

  // Auto-init after window load — gives supabase-js a moment to register.
  if(document.readyState === 'complete'){
    init();
  } else {
    window.addEventListener('load', init);
  }
})();

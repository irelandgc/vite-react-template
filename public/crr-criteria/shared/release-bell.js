// ═══════════════════════════════════════════════════════════════
//  Release Bell — shared "new info" indicator for CRR apps
//  Usage:
//    <button id="releaseBell" class="release-bell" onclick="crrReleaseBell.open()">…</button>
//    <script src="/crr-criteria/shared/release-bell.js"></script>
//    <script>crrReleaseBell.init({ app: 'viewer', selector: '#releaseBell' });</script>
//
//  Polls /api/releases/latest-id?app=<app>, compares with localStorage,
//  toggles a CSS class on the button when there is unread content.
// ═══════════════════════════════════════════════════════════════
(function (global) {
  var API_BASE = '';  // relative — proxied via main worker /api/*
  var RELEASES_URL = '/crr-criteria/releases/';

  function storageKey(app) { return 'crr-lastSeenReleaseId-' + app; }

  function getLastSeen(app) {
    try {
      var v = localStorage.getItem(storageKey(app));
      return v ? parseInt(v, 10) || 0 : 0;
    } catch (e) { return 0; }
  }

  function setLastSeen(app, id) {
    try { localStorage.setItem(storageKey(app), String(id)); } catch (e) {}
  }

  var state = { app: null, btn: null, latestId: 0 };

  function refreshIndicator() {
    if (!state.btn) return;
    var unread = state.latestId > getLastSeen(state.app);
    state.btn.classList.toggle('release-bell-new', unread);
    state.btn.setAttribute('aria-label', unread ? 'New release notes — click to read' : 'Release notes');
    state.btn.setAttribute('title', unread ? 'New release notes available' : 'Release notes & announcements');
  }

  function fetchLatest() {
    fetch(API_BASE + '/api/releases/latest-id?app=' + encodeURIComponent(state.app))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        state.latestId = (j && j.id) ? parseInt(j.id, 10) || 0 : 0;
        refreshIndicator();
      })
      .catch(function () { /* offline: leave indicator unchanged */ });
  }

  function open() {
    if (state.latestId) setLastSeen(state.app, state.latestId);
    refreshIndicator();
    window.open(RELEASES_URL, '_blank', 'noopener');
  }

  function init(opts) {
    state.app = (opts && opts.app) || 'viewer';
    state.btn = document.querySelector((opts && opts.selector) || '#releaseBell');
    if (!state.btn) return;
    state.btn.addEventListener('click', open);
    refreshIndicator();
    fetchLatest();
    // Re-check when user returns to the tab (they may have just read the notes)
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { fetchLatest(); }
    });
  }

  global.crrReleaseBell = { init: init, open: open };
})(window);

/**
 * Mawego Bookshop — Notifications (drop-in)
 *
 * Usage: add after api.js on any page (especially admin + account + header):
 *   <script src="/js/api.js"></script>
 *   <script src="/js/notifications.js"></script>
 *
 * Creates a bell icon in the header nav and a dropdown panel.
 * Requires logged-in user (customer or staff).
 */
(function () {
  const POLL_MS = 45000;
  let panelOpen = false;
  let pollTimer = null;

  const css = `
  .mb-notif-wrap { position: relative; display: inline-flex; align-items: center; }
  .mb-notif-btn {
    position: relative; display: inline-flex; align-items: center; justify-content: center;
    width: 2.35rem; height: 2.35rem; border-radius: 999px; border: 1px solid var(--border, #e2e8f0);
    background: var(--surface, #fff); cursor: pointer; color: var(--ink, #1a1a1a);
  }
  .mb-notif-btn:hover { background: var(--green-soft, #e6f5ef); border-color: var(--green, #0b6b4f); }
  .mb-notif-btn svg, .mb-notif-btn [data-lucide] { width: 1.15rem; height: 1.15rem; }
  .mb-notif-badge {
    position: absolute; top: -4px; right: -4px; min-width: 1.1rem; height: 1.1rem; padding: 0 4px;
    border-radius: 999px; background: #dc2626; color: #fff; font-size: 0.65rem; font-weight: 700;
    display: none; align-items: center; justify-content: center; line-height: 1;
  }
  .mb-notif-badge.is-on { display: inline-flex; }
  .mb-notif-panel {
    position: absolute; right: 0; top: calc(100% + 8px); width: min(360px, 92vw);
    max-height: 420px; overflow: hidden; display: none; flex-direction: column;
    background: var(--surface, #fff); border: 1px solid var(--border, #e2e8f0);
    border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.12); z-index: 200;
  }
  .mb-notif-panel.is-open { display: flex; }
  .mb-notif-head {
    display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
    padding: 0.75rem 1rem; border-bottom: 1px solid var(--border, #e2e8f0);
    font-weight: 700; font-size: 0.95rem;
  }
  .mb-notif-actions { display: flex; gap: 0.35rem; flex-wrap: wrap; }
  .mb-notif-actions button {
    border: none; background: transparent; color: var(--green, #0b6b4f); font-size: 0.75rem;
    font-weight: 600; cursor: pointer; padding: 0.2rem 0.35rem; border-radius: 4px;
  }
  .mb-notif-actions button:hover { background: var(--green-soft, #e6f5ef); }
  .mb-notif-list { overflow-y: auto; max-height: 340px; }
  .mb-notif-item {
    padding: 0.75rem 1rem; border-bottom: 1px solid var(--border, #f1f5f9);
    cursor: pointer; transition: background 0.15s;
  }
  .mb-notif-item:hover { background: #f8fafc; }
  .mb-notif-item.unread { background: #f0fdf6; }
  .mb-notif-item .t { font-weight: 600; font-size: 0.88rem; margin: 0 0 0.2rem; }
  .mb-notif-item .b { font-size: 0.82rem; color: var(--muted, #64748b); margin: 0; line-height: 1.4; }
  .mb-notif-item .time { font-size: 0.72rem; color: #94a3b8; margin-top: 0.25rem; }
  .mb-notif-empty { padding: 1.5rem 1rem; text-align: center; color: var(--muted, #64748b); font-size: 0.9rem; }
  @media (max-width: 640px) {
    .mb-notif-panel { right: -0.5rem; }
  }
  `;

  function ensureStyles() {
    if (document.getElementById('mb-notif-styles')) return;
    const s = document.createElement('style');
    s.id = 'mb-notif-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function apiBase() {
    return (window.API && API.base) || '/api';
  }

  async function api(path, options = {}) {
    if (window.API && typeof API.request === 'function') {
      // Prefer project API if it exposes request
    }
    const token = localStorage.getItem('mb_token');
    if (!token) return null;
    const res = await fetch(apiBase() + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
        ...(options.headers || {})
      }
    });
    if (res.status === 401) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function formatTime(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso.replace(' ', 'T'));
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return iso;
    }
  }

  function mountBell() {
    const user = (() => {
      try {
        return JSON.parse(localStorage.getItem('mb_user') || 'null');
      } catch {
        return null;
      }
    })();
    if (!user || !localStorage.getItem('mb_token')) return null;

    const nav = document.querySelector('header .nav') || document.querySelector('.nav');
    if (!nav) return null;
    if (document.getElementById('mb-notif-wrap')) return document.getElementById('mb-notif-wrap');

    ensureStyles();
    const wrap = document.createElement('div');
    wrap.className = 'mb-notif-wrap';
    wrap.id = 'mb-notif-wrap';
    wrap.innerHTML = `
      <button type="button" class="mb-notif-btn" id="mb-notif-btn" aria-label="Notifications" title="Notifications">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        <span class="mb-notif-badge" id="mb-notif-badge">0</span>
      </button>
      <div class="mb-notif-panel" id="mb-notif-panel" role="dialog" aria-label="Notifications">
        <div class="mb-notif-head">
          <span>Notifications</span>
          <div class="mb-notif-actions">
            <button type="button" id="mb-notif-readall">Mark all read</button>
            <button type="button" id="mb-notif-clear">Clear read</button>
            <button type="button" id="mb-notif-clearall">Clear all</button>
          </div>
        </div>
        <div class="mb-notif-list" id="mb-notif-list">
          <div class="mb-notif-empty">Loading…</div>
        </div>
      </div>`;

    // Insert before cart button if present
    const cart = nav.querySelector('.cart-btn');
    if (cart) nav.insertBefore(wrap, cart);
    else nav.appendChild(wrap);

    document.getElementById('mb-notif-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      togglePanel();
    });
    document.getElementById('mb-notif-readall').addEventListener('click', async (e) => {
      e.stopPropagation();
      await api('/notifications/read-all', { method: 'POST' });
      await refresh();
    });
    document.getElementById('mb-notif-clear').addEventListener('click', async (e) => {
      e.stopPropagation();
      await api('/notifications/clear-read', { method: 'DELETE' });
      await refresh();
    });
    document.getElementById('mb-notif-clearall').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Clear all notifications?')) return;
      await api('/notifications/clear-all', { method: 'DELETE' });
      await refresh();
    });

    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target) && panelOpen) {
        panelOpen = false;
        document.getElementById('mb-notif-panel').classList.remove('is-open');
      }
    });

    return wrap;
  }

  async function togglePanel() {
    panelOpen = !panelOpen;
    const panel = document.getElementById('mb-notif-panel');
    if (!panel) return;
    panel.classList.toggle('is-open', panelOpen);
    if (panelOpen) await loadList();
  }

  async function refreshBadge() {
    try {
      const data = await api('/notifications/unread-count');
      if (!data) return;
      const badge = document.getElementById('mb-notif-badge');
      if (!badge) return;
      const n = data.count || 0;
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.classList.toggle('is-on', n > 0);
    } catch (_) {}
  }

  async function loadList() {
    const list = document.getElementById('mb-notif-list');
    if (!list) return;
    try {
      const data = await api('/notifications?limit=30');
      if (!data) {
        list.innerHTML = '<div class="mb-notif-empty">Sign in to see notifications</div>';
        return;
      }
      const items = data.notifications || [];
      if (!items.length) {
        list.innerHTML = '<div class="mb-notif-empty">No notifications yet</div>';
        return;
      }
      list.innerHTML = items
        .map(
          (n) => `
        <div class="mb-notif-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}" data-link="${n.link || ''}">
          <p class="t">${escapeHtml(n.title)}</p>
          <p class="b">${escapeHtml(n.body)}</p>
          <div class="time">${formatTime(n.created_at)}${n.order_number ? ' · ' + escapeHtml(n.order_number) : ''}</div>
        </div>`
        )
        .join('');

      list.querySelectorAll('.mb-notif-item').forEach((el) => {
        el.addEventListener('click', async () => {
          const id = el.getAttribute('data-id');
          const link = el.getAttribute('data-link');
          try {
            await api('/notifications/' + id + '/read', { method: 'PATCH' });
          } catch (_) {}
          el.classList.remove('unread');
          await refreshBadge();
          if (link) window.location.href = link;
        });
      });
    } catch (err) {
      list.innerHTML = `<div class="mb-notif-empty">${escapeHtml(err.message || 'Could not load')}</div>`;
    }
  }

  async function refresh() {
    await refreshBadge();
    if (panelOpen) await loadList();
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function start() {
    if (!mountBell()) return;
    refreshBadge();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(refreshBadge, POLL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  // Re-run after login on same page
  window.MawegoNotifications = { refresh, start };
})();

// Content Studio: the Heddi Strategies blog CMS.
import { sb, esc, titleHtml, titlePlain, fmtDate, sanitize } from '/Public/blog/lib.js';

const app = document.getElementById('app');
const modal = document.getElementById('modal');
const S = { user: null, editor: null, topics: [], authors: [], settings: null };
const authHash = window.__authHash || '';
const BUCKET = 'blog-media';

// ---------- small helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const icon = (name) => `<span class="material-symbols-outlined" aria-hidden="true">${name}</span>`;
const slugify = (s) => titlePlain(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) || 'untitled';
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const countWords = (html) => { const d = document.createElement('div'); d.innerHTML = html; return (d.textContent.trim().match(/\S+/g) || []).length; };
const STATUS = {
  draft: { label: 'Draft', icon: 'edit_note' },
  scheduled: { label: 'Scheduled', icon: 'schedule' },
  published: { label: 'Published', icon: 'check_circle' }
};
const badge = (status, publishAt) => {
  const live = status === 'scheduled' && publishAt && new Date(publishAt) <= new Date();
  const s = live ? 'published' : status;
  return `<span class="badge ${s}">${icon(STATUS[s].icon)}${STATUS[s].label}</span>`;
};

function toast(msg, isErr = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (isErr ? ' err' : '');
  t.setAttribute('role', 'status');
  t.innerHTML = icon(isErr ? 'error' : 'check_circle') + esc(msg);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function confirmBox({ title, body, ok = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    modal.innerHTML = `<h2>${esc(title)}</h2><p>${body}</p><div class="actions">
      <button class="btn btn-ghost" type="button" data-v="0">Cancel</button>
      <button class="btn ${danger ? 'danger' : ''}" type="button" data-v="1">${esc(ok)}</button></div>`;
    const done = (v) => { modal.close(); resolve(v); };
    modal.onclick = (e) => { const b = e.target.closest('[data-v]'); if (b) done(b.dataset.v === '1'); };
    modal.oncancel = () => resolve(false);
    modal.showModal();
    $('[data-v="1"]', modal).focus();
  });
}

async function uploadImage(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Images must be under 10 MB.');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, { cacheControl: '31536000', contentType: file.type });
  if (error) throw error;
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function pickFile() {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = () => resolve(inp.files[0] || null);
    inp.click();
  });
}

// ---------- shell ----------
const NAV = [
  ['articles', 'article', 'Articles'],
  ['topics', 'sell', 'Topics'],
  ['media', 'image', 'Media'],
  ['subscribers', 'group', 'Subscribers'],
  ['settings', 'settings', 'Settings']
];

function shell(active, inner) {
  const name = S.editor?.email || S.user?.email || '';
  app.innerHTML = `<div class="studio">
    <nav class="side-nav" aria-label="Content Studio">
      <div class="brand"><img src="/Public/Images/Heddi%20Strategies%20Logo%20Mark%20White.png" alt="Heddi Strategies"><span>CONTENT STUDIO</span></div>
      ${NAV.map(([id, ic, label]) => `<a href="#/${id}" ${active === id ? 'aria-current="page"' : ''}>${icon(ic)}${label}</a>`).join('')}
      <div class="spacer"></div>
      <a href="/insights" target="_blank" rel="noopener">${icon('open_in_new')}View blog</a>
      <button class="nav" type="button" id="signout">${icon('logout')}Sign out</button>
      <div class="me"><div class="avatar" aria-hidden="true">${esc(name.charAt(0).toUpperCase() || 'H')}</div><div><p>${esc(name)}</p><small>${S.editor?.role === 'admin' ? 'Admin' : 'Editor'}</small></div></div>
    </nav>
    <div class="content">${inner}</div>
  </div>`;
  $('#signout').onclick = async () => { await sb.auth.signOut(); location.hash = ''; boot(); };
}

// ---------- login / password ----------
function loginView(message = '', isErr = false) {
  app.innerHTML = `<div class="login"><form id="login-form" novalidate>
    <img src="/Public/Images/Heddi%20Strategies%20Logo%20Type%20White.png" alt="Heddi Strategies">
    <h1>Content Studio</h1>
    <div class="f"><label for="l-email">Email</label><input class="in" id="l-email" type="email" autocomplete="username" required></div>
    <div class="f"><label for="l-pass">Password</label><input class="in" id="l-pass" type="password" autocomplete="current-password" required></div>
    <p class="msg ${isErr ? 'err' : ''}" role="status">${esc(message)}</p>
    <button class="btn" type="submit">Sign in</button>
    <button class="linkish" type="button" id="forgot">Forgot your password?</button>
  </form></div>`;
  const f = $('#login-form');
  const msg = $('.msg', f);
  f.onsubmit = async (e) => {
    e.preventDefault();
    msg.className = 'msg'; msg.textContent = 'Signing in…';
    const { error } = await sb.auth.signInWithPassword({ email: $('#l-email').value.trim(), password: $('#l-pass').value });
    if (error) { msg.className = 'msg err'; msg.textContent = 'That email and password did not match.'; return; }
    boot();
  };
  $('#forgot').onclick = async () => {
    const email = $('#l-email').value.trim();
    if (!email) { msg.className = 'msg err'; msg.textContent = 'Enter your email first, then tap this again.'; return; }
    await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/studio' });
    msg.className = 'msg'; msg.textContent = 'If that email has a Studio account, a reset link is on its way.';
  };
}

function setPasswordView() {
  app.innerHTML = `<div class="login"><form id="pw-form">
    <img src="/Public/Images/Heddi%20Strategies%20Logo%20Type%20White.png" alt="Heddi Strategies">
    <h1>Set your password</h1>
    <div class="f"><label for="p1">New password <small>at least 10 characters</small></label><input class="in" id="p1" type="password" autocomplete="new-password" minlength="10" required></div>
    <div class="f"><label for="p2">Confirm password</label><input class="in" id="p2" type="password" autocomplete="new-password" required></div>
    <p class="msg" role="status"></p>
    <button class="btn" type="submit">Save password</button>
  </form></div>`;
  const f = $('#pw-form'); const msg = $('.msg', f);
  f.onsubmit = async (e) => {
    e.preventDefault();
    const p1 = $('#p1').value, p2 = $('#p2').value;
    if (p1.length < 10) { msg.className = 'msg err'; msg.textContent = 'Use at least 10 characters.'; return; }
    if (p1 !== p2) { msg.className = 'msg err'; msg.textContent = 'Those passwords do not match.'; return; }
    const { error } = await sb.auth.updateUser({ password: p1 });
    if (error) { msg.className = 'msg err'; msg.textContent = error.message; return; }
    history.replaceState(null, '', '/studio#/articles');
    toast('Password saved');
    boot();
  };
}

// ---------- Articles ----------
async function articlesView() {
  shell('articles', `<div class="page"><div class="loading"><div class="pulse"></div>Loading</div></div>`);
  const [{ data: posts, error }, { count: subs }] = await Promise.all([
    sb.from('posts').select('id, slug, title, status, publish_at, featured, updated_at, topic:topics(label), author:authors(name)').order('updated_at', { ascending: false }),
    sb.from('subscribers').select('id', { count: 'exact', head: true }).eq('status', 'active')
  ]);
  if (error) return toast(error.message, true);
  const st = { tab: 'all', q: '' };
  const live = (p) => p.status === 'published' || (p.status === 'scheduled' && new Date(p.publish_at) <= new Date());
  const kind = (p) => live(p) ? 'published' : p.status;
  const counts = { all: posts.length, published: 0, scheduled: 0, draft: 0 };
  posts.forEach((p) => counts[kind(p)]++);

  $('.content').innerHTML = `<div class="page">
    <div class="page-head"><div><p class="eyebrow soft">Insights blog</p><h1>Articles</h1></div>
      <div class="actions"><button class="btn" id="new-post" type="button">${icon('add')}New article</button></div></div>
    <div class="stats">
      <div class="stat"><p>Published</p><strong>${counts.published}</strong></div>
      <div class="stat"><p>Scheduled</p><strong>${counts.scheduled}</strong></div>
      <div class="stat"><p>Drafts</p><strong>${counts.draft}</strong></div>
      <div class="stat"><p>Subscribers</p><strong>${subs ?? 0}</strong></div>
    </div>
    <div class="tabs-row">
      <div class="tabs" role="group" aria-label="Filter by status">${['all', 'published', 'scheduled', 'draft'].map((t) =>
        `<button class="tab" type="button" data-tab="${t}" aria-pressed="${t === 'all'}">${t === 'all' ? 'All' : STATUS[t].label}<small>${counts[t]}</small></button>`).join('')}</div>
      <label class="search" style="flex:0 1 300px;min-height:44px">${icon('search')}<span class="sr-only">Search articles</span><input type="search" id="aq" placeholder="Search articles"></label>
    </div>
    <div class="table"><table><thead><tr><th>TITLE</th><th>STATUS</th><th>AUTHOR</th><th>UPDATED</th><th style="text-align:right">ACTIONS</th></tr></thead><tbody id="rows"></tbody></table>
    <div class="empty-state" id="no-rows" hidden>${icon('article')}<h3>No articles here yet</h3><p>Start one with New article, or try another word or status.</p></div></div>
  </div>`;

  const draw = () => {
    const q = st.q.toLowerCase();
    const list = posts.filter((p) => (st.tab === 'all' || kind(p) === st.tab) && (!q || titlePlain(p.title).toLowerCase().includes(q)));
    $('#rows').innerHTML = list.map((p) => `<tr>
      <td><a class="t-title" href="#/edit/${p.id}">${esc(titlePlain(p.title))}</a><div class="t-sub">${esc(p.topic?.label || 'No topic')}${p.featured ? ' · Featured' : ''}</div></td>
      <td>${badge(p.status, p.publish_at)}${p.status === 'scheduled' && !live(p) ? `<div class="t-sub" style="letter-spacing:.05em;text-transform:none">${esc(fmtDate(p.publish_at))}</div>` : ''}</td>
      <td>${esc(p.author?.name || '—')}</td>
      <td>${esc(fmtDate(p.updated_at))}</td>
      <td><div class="row-actions">
        <a class="icon-btn" href="#/edit/${p.id}" aria-label="Edit">${icon('edit')}</a>
        ${live(p) ? `<a class="icon-btn" href="/insights/${esc(p.slug)}" target="_blank" rel="noopener" aria-label="View on blog">${icon('visibility')}</a>` : ''}
        <button class="icon-btn" type="button" data-dup="${p.id}" aria-label="Duplicate">${icon('content_copy')}</button>
        <button class="icon-btn danger" type="button" data-del="${p.id}" aria-label="Delete">${icon('delete')}</button>
      </div></td></tr>`).join('');
    $('#no-rows').hidden = list.length > 0;
  };
  draw();

  $('.tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; st.tab = b.dataset.tab; $$('.tab').forEach((x) => x.setAttribute('aria-pressed', x === b)); draw(); };
  $('#aq').oninput = (e) => { st.q = e.target.value.trim(); draw(); };
  $('#new-post').onclick = newPost;
  $('#rows').onclick = async (e) => {
    const del = e.target.closest('[data-del]'); const dup = e.target.closest('[data-dup]');
    if (del) {
      const p = posts.find((x) => x.id === del.dataset.del);
      if (!await confirmBox({ title: 'Delete this article?', body: `“${esc(titlePlain(p.title))}” will be removed from the blog and the Studio. This cannot be undone.`, ok: 'Delete', danger: true })) return;
      const { error: err } = await sb.from('posts').delete().eq('id', p.id);
      if (err) return toast(err.message, true);
      toast('Article deleted'); articlesView();
    }
    if (dup) {
      const { data: src } = await sb.from('posts').select('*').eq('id', dup.dataset.dup).single();
      const { id, created_at, updated_at, emailed_at, ...rest } = src;
      const { data: copy, error: err } = await sb.from('posts').insert({ ...rest, slug: `${src.slug}-copy-${Date.now().toString(36)}`, title: titlePlain(src.title) + ' (copy)', status: 'draft', publish_at: null, featured: false }).select('id').single();
      if (err) return toast(err.message, true);
      location.hash = `#/edit/${copy.id}`;
    }
  };
}

async function newPost() {
  const { data, error } = await sb.from('posts').insert({
    slug: 'untitled-' + Date.now().toString(36), title: 'Untitled article',
    author_id: S.authors[0]?.id || null, topic_id: S.topics[0]?.id || null,
    notify_subscribers: S.settings?.send_mode !== 'never'
  }).select('id').single();
  if (error) return toast(error.message, true);
  location.hash = `#/edit/${data.id}?new=1`;
}

// ---------- Editor ----------
async function editorView(id, isNew) {
  shell('articles', `<div class="page"><div class="loading"><div class="pulse"></div>Loading article</div></div>`);
  const { data: post, error } = await sb.from('posts').select('*').eq('id', id).maybeSingle();
  if (error || !post) { $('.content').innerHTML = `<div class="page"><div class="empty-state">${icon('search_off')}<h3>Article not found</h3><p><a href="#/articles">Back to articles</a></p></div></div>`; return; }
  const P = { ...post };
  let slugTouched = !isNew && !P.slug.startsWith('untitled-');
  const localDT = (d) => { if (!d) return ''; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };

  $('.content').innerHTML = `
  <div class="topbar">
    <div class="group">
      <a class="btn btn-ghost sm" href="#/articles">${icon('arrow_back')}Articles</a>
      <span id="st-badge"></span>
      <span class="save-state" id="save-state" role="status">${icon('cloud_done')}All changes saved</span>
    </div>
    <div class="group">
      <button class="btn btn-ghost sm" type="button" id="preview">${icon('visibility')}Preview</button>
      <button class="btn sm" type="button" id="publish">${icon('send')}<span id="pub-label">Publish</span></button>
    </div>
  </div>
  <div class="ed">
    <div class="ed-main">
      <button class="cover-drop" type="button" id="cover">${icon('add_photo_alternate')}<span class="lbl1">ADD FEATURED IMAGE</span><span class="lbl2">Drop a file here or browse. 1600 × 900 works best.</span></button>
      <div class="cover-tools" id="cover-tools" hidden>
        <input class="in" id="cover-alt" placeholder="Describe the image for screen readers (alt text)" value="${esc(P.cover_alt || '')}">
        <button class="btn btn-ghost sm" type="button" id="cover-remove">${icon('delete')}Remove</button>
      </div>
      <label class="ed-label" for="ed-title">TITLE</label>
      <textarea class="ed-title" id="ed-title" rows="1">${esc(P.title)}</textarea>
      <p class="hint" style="margin-top:6px">Tip: wrap one phrase in *asterisks* and it shows in sage italics on the blog.</p>
      <label class="ed-label" for="ed-dek">SUMMARY</label>
      <textarea class="ed-dek" id="ed-dek" rows="2" placeholder="One or two sentences that make someone want to read this.">${esc(P.summary || '')}</textarea>
      <div class="toolbar" role="toolbar" aria-label="Formatting">
        <button type="button" data-cmd="h2" aria-label="Section heading" title="Section heading">${icon('title')}</button>
        <button type="button" data-cmd="h3" aria-label="Subheading" title="Subheading">${icon('text_fields')}</button>
        <button type="button" data-cmd="p" aria-label="Paragraph" title="Paragraph">${icon('notes')}</button>
        <button type="button" data-cmd="lead" aria-label="Intro paragraph" title="Intro paragraph (large serif)">${icon('format_size')}</button>
        <span class="sep" aria-hidden="true"></span>
        <button type="button" data-cmd="bold" aria-label="Bold" title="Bold">${icon('format_bold')}</button>
        <button type="button" data-cmd="italic" aria-label="Italic" title="Italic">${icon('format_italic')}</button>
        <button type="button" data-cmd="link" aria-label="Link" title="Link">${icon('link')}</button>
        <span class="sep" aria-hidden="true"></span>
        <button type="button" data-cmd="ul" aria-label="Bulleted list" title="Bulleted list">${icon('format_list_bulleted')}</button>
        <button type="button" data-cmd="ol" aria-label="Numbered list" title="Numbered list">${icon('format_list_numbered')}</button>
        <button type="button" data-cmd="quote" aria-label="Pull quote" title="Pull quote">${icon('format_quote')}</button>
        <button type="button" data-cmd="image" aria-label="Insert image" title="Insert image">${icon('image')}</button>
        <button type="button" data-cmd="takeaways" aria-label="Key takeaways box" title="Key takeaways box">${icon('checklist')}</button>
        <button type="button" data-cmd="cta" aria-label="Call to action block" title="Call to action block">${icon('smart_button')}</button>
        <span class="sep" aria-hidden="true"></span>
        <button type="button" data-cmd="undo" aria-label="Undo" title="Undo">${icon('undo')}</button>
        <button type="button" data-cmd="redo" aria-label="Redo" title="Redo">${icon('redo')}</button>
      </div>
      <div class="ed-body prose" id="ed-body" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Article body">${sanitize(P.body_html)}</div>
      <p class="wc" id="wc"></p>
    </div>
    <aside class="ed-side" aria-label="Article settings">
      <section class="panel">
        <h2>Publishing</h2>
        <div class="f"><label for="ed-status">Status</label>
          <select class="in" id="ed-status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${P.status === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>
        <div class="f" id="date-wrap"><label for="ed-date">Publish date <small id="date-hint"></small></label><input class="in" id="ed-date" type="datetime-local" value="${localDT(P.publish_at)}"></div>
        <div class="f"><label for="ed-author">Author</label>
          <select class="in" id="ed-author"><option value="">No byline</option>${S.authors.map((a) => `<option value="${a.id}" ${P.author_id === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div>
        <div class="switch-row"><span><b>Feature on blog home</b><small>Replaces the current featured article</small></span>
          <button class="switch" type="button" role="switch" id="ed-feat" aria-checked="${P.featured}" aria-label="Feature on blog home"><span></span></button></div>
        <label class="check"><input type="checkbox" id="ed-notify" ${P.notify_subscribers ? 'checked' : ''} ${S.settings?.send_mode === 'never' ? 'disabled' : ''}>
          <span><b>Email subscribers when published</b><small id="notify-hint">${P.emailed_at ? 'Already emailed ' + esc(fmtDate(P.emailed_at)) : (S.settings?.send_mode === 'never' ? 'Emails are turned off in Subscribers settings' : 'Sends this article to The Heddi Brief list')}</small></span></label>
      </section>
      <section class="panel">
        <h2>Topic</h2>
        <div class="radio-list" role="radiogroup" aria-label="Topic" id="ed-topics">${S.topics.map((t) =>
          `<button type="button" role="radio" data-topic="${t.id}" aria-checked="${P.topic_id === t.id}">${icon(t.icon)}${esc(t.label)}</button>`).join('')}</div>
      </section>
      <section class="panel">
        <h2>Search &amp; sharing</h2>
        <div class="f"><label for="ed-slug">URL</label><div class="prefix"><span>/insights/</span><input class="in" id="ed-slug" value="${esc(P.slug)}" spellcheck="false"></div></div>
        <div class="f"><label for="ed-mt">Meta title <small id="mt-len"></small></label><input class="in" id="ed-mt" value="${esc(P.meta_title || '')}" placeholder="Defaults to the article title"></div>
        <div class="f"><label for="ed-md">Meta description <small id="md-len"></small></label><textarea class="in" id="ed-md" rows="3" placeholder="Defaults to the summary">${esc(P.meta_description || '')}</textarea></div>
        <div class="serp"><p class="u">heddistrategies.com › insights › <span id="serp-slug"></span></p><p class="t" id="serp-t"></p><p class="d" id="serp-d"></p></div>
      </section>
    </aside>
  </div>`;

  const body = $('#ed-body');
  const title = $('#ed-title');

  const autosize = () => { title.style.height = 'auto'; title.style.height = title.scrollHeight + 'px'; };
  autosize();

  function setCover(url) {
    P.cover_url = url || null;
    const c = $('#cover');
    $$('img', c).forEach((i) => i.remove());
    if (url) { const img = document.createElement('img'); img.src = url; img.alt = ''; c.appendChild(img); }
    $('#cover-tools').hidden = !url;
  }
  setCover(P.cover_url);

  function refreshMeta() {
    const now = new Date();
    const pubAt = P.publish_at ? new Date(P.publish_at) : null;
    const isPast = pubAt && pubAt <= now;
    $('#st-badge').innerHTML = badge(P.status, P.publish_at);
    $('#pub-label').textContent = P.status === 'scheduled' ? (isPast ? 'Update' : 'Schedule') : (post.status === 'published' && P.status === 'published' ? 'Update' : (P.status === 'draft' ? 'Save draft' : 'Publish'));
    $('#date-wrap').hidden = P.status === 'draft';
    $('#date-hint').textContent = P.status === 'scheduled' ? 'goes live at this time' : 'shown on the article';
    const wc = countWords(body.innerHTML);
    P.read_minutes = Math.max(1, Math.round(wc / 230));
    $('#wc').textContent = `${wc} words · about ${P.read_minutes} min read`;
    const mt = $('#ed-mt').value || `${titlePlain(title.value)} | Heddi Strategies`;
    const md = $('#ed-md').value || $('#ed-dek').value;
    $('#mt-len').textContent = `${mt.length} / 60`;
    $('#md-len').textContent = `${md.length} / 160`;
    $('#mt-len').style.color = mt.length > 60 ? '#ffb4ab' : '';
    $('#md-len').style.color = md.length > 160 ? '#ffb4ab' : '';
    $('#serp-t').textContent = mt;
    $('#serp-d').textContent = md.length > 160 ? md.slice(0, 157) + '…' : md;
    $('#serp-slug').textContent = $('#ed-slug').value;
  }

  // ----- saving -----
  let dirty = false, saving = false;
  const saveState = (kind) => {
    const el = $('#save-state');
    if (!el) return;
    el.className = 'save-state' + (kind === 'err' ? ' err' : '');
    el.innerHTML = kind === 'saving' ? icon('sync') + 'Saving…' : kind === 'dirty' ? icon('edit') + 'Unsaved changes' : kind === 'err' ? icon('error') + 'Not saved. Check your connection.' : icon('cloud_done') + 'All changes saved';
  };
  function collect() {
    const dt = $('#ed-date').value;
    return {
      title: title.value.trim() || 'Untitled article',
      summary: $('#ed-dek').value.trim() || null,
      body_html: sanitize(body.innerHTML),
      cover_url: P.cover_url,
      cover_alt: $('#cover-alt').value.trim() || null,
      topic_id: P.topic_id,
      author_id: $('#ed-author').value || null,
      status: P.status,
      publish_at: P.status === 'draft' ? (P.publish_at || null) : (dt ? new Date(dt).toISOString() : P.publish_at),
      featured: P.featured,
      notify_subscribers: $('#ed-notify').checked,
      slug: slugify($('#ed-slug').value),
      meta_title: $('#ed-mt').value.trim() || null,
      meta_description: $('#ed-md').value.trim() || null,
      read_minutes: P.read_minutes
    };
  }
  async function save() {
    if (saving) { dirty = true; return false; }
    saving = true; dirty = false; saveState('saving');
    const row = collect();
    const { data, error: err } = await sb.from('posts').update(row).eq('id', id).select('status, publish_at, emailed_at, slug').single();
    saving = false;
    if (err) {
      saveState('err');
      if (err.code === '23505') toast('That URL is already used by another article. Change it under Search & sharing.', true);
      return false;
    }
    Object.assign(P, row, data);
    $('#ed-slug').value = data.slug;
    if (P.publish_at && $('#ed-date').value === '') $('#ed-date').value = localDT(P.publish_at);
    refreshMeta();
    if (dirty) return save();
    saveState('saved');
    return true;
  }
  const queueSave = debounce(save, 1200);
  const changed = () => { dirty = true; saveState('dirty'); refreshMeta(); queueSave(); };

  title.addEventListener('input', () => {
    autosize();
    if (!slugTouched) $('#ed-slug').value = slugify(title.value);
    changed();
  });
  $('#ed-slug').addEventListener('input', () => { slugTouched = true; changed(); });
  ['#ed-dek', '#ed-mt', '#ed-md', '#cover-alt'].forEach((s) => $(s).addEventListener('input', changed));
  ['#ed-author', '#ed-date', '#ed-notify'].forEach((s) => $(s).addEventListener('change', changed));
  $('#ed-status').addEventListener('change', (e) => {
    P.status = e.target.value;
    if (P.status === 'scheduled' && !$('#ed-date').value) {
      const t = new Date(Date.now() + 864e5); t.setHours(9, 0, 0, 0); $('#ed-date').value = localDT(t);
    }
    changed();
  });
  $('#ed-feat').onclick = (e) => { P.featured = !P.featured; e.currentTarget.setAttribute('aria-checked', P.featured); changed(); };
  $('#ed-topics').onclick = (e) => {
    const b = e.target.closest('[data-topic]'); if (!b) return;
    P.topic_id = b.dataset.topic;
    $$('#ed-topics [data-topic]').forEach((x) => x.setAttribute('aria-checked', x === b));
    changed();
  };

  // ----- cover image -----
  async function handleCover(file) {
    if (!file) return;
    saveState('saving');
    try { setCover(await uploadImage(file)); changed(); } catch (err) { toast(err.message || 'Upload failed', true); saveState('err'); }
  }
  const cover = $('#cover');
  cover.onclick = async () => handleCover(await pickFile());
  cover.ondragover = (e) => { e.preventDefault(); cover.classList.add('drag'); };
  cover.ondragleave = () => cover.classList.remove('drag');
  cover.ondrop = (e) => { e.preventDefault(); cover.classList.remove('drag'); handleCover(e.dataTransfer.files[0]); };
  $('#cover-remove').onclick = () => { setCover(null); $('#cover-alt').value = ''; changed(); };

  // ----- body editing -----
  document.execCommand('defaultParagraphSeparator', false, 'p');
  body.addEventListener('input', changed);
  body.addEventListener('paste', (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (html) {
      const clean = sanitize(html).replace(/\sclass="[^"]*"/g, '');
      document.execCommand('insertHTML', false, clean);
    } else {
      document.execCommand('insertHTML', false, text.split(/\n{2,}/).map((para) => `<p>${esc(para).replace(/\n/g, '<br>')}</p>`).join(''));
    }
  });
  body.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
  body.addEventListener('drop', async (e) => {
    const f = e.dataTransfer.files[0];
    if (!f) return;
    e.preventDefault();
    await insertImage(f);
  });

  let savedRange = null;
  const keepRange = () => { const s = getSelection(); if (s.rangeCount && body.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange(); };
  const restoreRange = () => { body.focus(); if (savedRange) { const s = getSelection(); s.removeAllRanges(); s.addRange(savedRange); } };
  body.addEventListener('keyup', keepRange);
  body.addEventListener('mouseup', keepRange);
  body.addEventListener('blur', keepRange);

  const blockAt = () => { let n = getSelection().anchorNode; while (n && n !== body && n.parentNode !== body) n = n.parentNode; return n && n !== body ? n : null; };
  function insertBlock(html) {
    restoreRange();
    const blk = blockAt();
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const nodes = [...tmp.childNodes];
    if (blk) blk.after(...nodes); else body.append(...nodes);
    if (!nodes[nodes.length - 1].nextSibling) { const p = document.createElement('p'); p.innerHTML = '<br>'; body.appendChild(p); }
    changed();
  }
  async function insertImage(file) {
    saveState('saving');
    try {
      const url = await uploadImage(file);
      insertBlock(`<figure><img src="${esc(url)}" alt=""><figcaption>Add a caption, or delete this line</figcaption></figure>`);
      toast('Image added. Click the caption to edit it.');
    } catch (err) { toast(err.message || 'Upload failed', true); saveState('err'); }
  }

  function linkPopover() {
    restoreRange();
    const sel = getSelection();
    if (!sel.rangeCount || sel.isCollapsed) { toast('Select the words you want to link first.', true); return; }
    const range = sel.getRangeAt(0).cloneRange();
    const rect = range.getBoundingClientRect();
    const existing = sel.anchorNode.parentElement?.closest('a');
    const pop = document.createElement('div');
    pop.className = 'pop';
    pop.style.top = Math.min(innerHeight - 80, rect.bottom + 8) + 'px';
    pop.style.left = Math.max(16, Math.min(innerWidth - 436, rect.left)) + 'px';
    pop.innerHTML = `<input class="in" type="url" placeholder="https://… or /contact.html" value="${esc(existing?.getAttribute('href') || '')}" aria-label="Link address">
      <button class="btn sm" type="button" data-a="ok">Link</button>${existing ? `<button class="icon-btn" type="button" data-a="rm" aria-label="Remove link">${icon('link_off')}</button>` : ''}`;
    document.body.appendChild(pop);
    const input = $('input', pop); input.focus();
    const close = () => { pop.remove(); document.removeEventListener('mousedown', outside); };
    const outside = (e) => { if (!pop.contains(e.target)) close(); };
    setTimeout(() => document.addEventListener('mousedown', outside));
    const apply = (remove) => {
      const s = getSelection(); s.removeAllRanges(); s.addRange(range);
      if (remove) document.execCommand('unlink');
      else {
        let href = input.value.trim();
        if (!href) return close();
        if (!/^(https?:|mailto:|\/|#)/i.test(href)) href = 'https://' + href;
        document.execCommand('createLink', false, href);
      }
      close(); changed();
    };
    pop.onclick = (e) => { const b = e.target.closest('[data-a]'); if (b) apply(b.dataset.a === 'rm'); };
    input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(false); } if (e.key === 'Escape') close(); };
  }

  $('.toolbar').addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
  $('.toolbar').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-cmd]'); if (!b) return;
    const cmd = b.dataset.cmd;
    if (cmd !== 'link' && cmd !== 'image') restoreRange();
    switch (cmd) {
      case 'h2': case 'h3': case 'p': {
        document.execCommand('formatBlock', false, cmd);
        const blk = blockAt(); if (blk) blk.removeAttribute('class');
        break;
      }
      case 'lead': {
        document.execCommand('formatBlock', false, 'p');
        const blk = blockAt(); if (blk && blk.tagName === 'P') blk.classList.toggle('lead');
        break;
      }
      case 'bold': document.execCommand('bold'); break;
      case 'italic': document.execCommand('italic'); break;
      case 'ul': document.execCommand('insertUnorderedList'); break;
      case 'ol': document.execCommand('insertOrderedList'); break;
      case 'undo': document.execCommand('undo'); break;
      case 'redo': document.execCommand('redo'); break;
      case 'link': return linkPopover();
      case 'image': { const f = await pickFile(); if (f) await insertImage(f); return; }
      case 'quote': insertBlock('<blockquote><p>A line from this article worth remembering.</p><cite>Name, Title</cite></blockquote>'); return;
      case 'takeaways': insertBlock('<div class="takeaways"><h3>Key takeaways</h3><ul><li>First takeaway</li><li>Second takeaway</li><li>Third takeaway</li></ul></div>'); return;
      case 'cta': insertBlock('<div class="cta-block"><p>Ready to talk through your strategy?</p><a href="/contact.html">Book a discovery call</a></div>'); return;
    }
    changed();
  });
  body.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); keepRange(); linkPopover(); }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  });

  // ----- preview / publish -----
  $('#preview').onclick = () => {
    const row = collect();
    const w = window.open('', '_blank');
    if (!w) return toast('Allow pop-ups to preview.', true);
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Preview: ${esc(titlePlain(row.title))}</title>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;1,400&family=Manrope:wght@400;600;800&display=swap">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=block">
      <link rel="stylesheet" href="${location.origin}/Public/blog/blog.css"></head><body>
      <div style="background:#2d2835;color:#b0decf;text-align:center;padding:10px;font:800 12px Manrope;letter-spacing:.2em">PREVIEW · NOT PUBLIC</div>
      <header class="wrap a-head"><p class="eyebrow">${esc(S.topics.find((t) => t.id === row.topic_id)?.label || 'Insights')}</p>
      <div class="row"><h1>${titleHtml(row.title)}</h1><div class="side"><p class="dek">${esc(row.summary || '')}</p></div></div></header>
      ${row.cover_url ? `<div class="a-cover"><img src="${esc(row.cover_url)}" alt=""></div>` : ''}
      <div class="wrap a-layout"><div class="prose">${row.body_html}</div></div></body></html>`);
    w.document.close();
  };

  $('#publish').onclick = async () => {
    if (P.status === 'draft' && post.status === 'draft') { await save(); toast('Draft saved'); return; }
    if (P.status === 'draft') {
      if (!await confirmBox({ title: 'Move back to draft?', body: 'This article will come off the blog until you publish it again.', ok: 'Unpublish' })) return;
    }
    if (P.status === 'published' && !$('#ed-date').value) $('#ed-date').value = localDT(new Date());
    if (!await save()) return;
    post.status = P.status;
    const goingLive = P.status === 'published' || (P.status === 'scheduled');
    if (goingLive && P.notify_subscribers && !P.emailed_at && S.settings?.send_mode !== 'never') {
      if (P.status === 'scheduled' && new Date(P.publish_at) > new Date()) {
        toast(`Scheduled for ${fmtDate(P.publish_at)}. Use Send email after it goes live.`);
      } else {
        const { count } = await sb.from('subscribers').select('id', { count: 'exact', head: true }).eq('status', 'active');
        if (count && await confirmBox({ title: 'Email your subscribers?', body: `Send “${esc(titlePlain(P.title))}” to <b>${count}</b> ${count === 1 ? 'person' : 'people'} on The Heddi Brief. You can only send each article once.`, ok: 'Send email' })) {
          await sendEmail();
        }
      }
    }
    refreshMeta();
    if (goingLive) toast(P.status === 'scheduled' && new Date(P.publish_at) > new Date() ? 'Article scheduled' : 'Article is live on the blog');
  };

  async function sendEmail() {
    toast('Sending…');
    const { data, error: err } = await sb.functions.invoke('send-post', { body: { post_id: id } });
    if (err || data?.error) { toast((data?.error) || 'Email could not be sent. Check the Resend setup.', true); return; }
    P.emailed_at = new Date().toISOString();
    $('#notify-hint').textContent = 'Already emailed ' + fmtDate(P.emailed_at);
    toast(`Emailed ${data.sent} subscriber${data.sent === 1 ? '' : 's'}`);
  }

  window.onbeforeunload = () => (dirty || saving ? true : undefined);
  refreshMeta();
  if (isNew) { title.focus(); title.select(); }
}

// ---------- Topics ----------
async function topicsView() {
  shell('topics', '');
  await loadLookups();
  const { data: posts } = await sb.from('posts').select('topic_id');
  const used = {}; (posts || []).forEach((p) => { used[p.topic_id] = (used[p.topic_id] || 0) + 1; });
  $('.content').innerHTML = `<div class="page">
    <div class="page-head"><div><p class="eyebrow soft">Insights blog</p><h1>Topics</h1></div></div>
    <form class="inline-form" id="t-form">
      <div class="f"><label for="t-label">New topic</label><input class="in" id="t-label" placeholder="e.g. Grant strategy" required></div>
      <div class="f" style="flex:0 1 200px"><label for="t-icon">Icon <small><a href="https://fonts.google.com/icons" target="_blank" rel="noopener">browse</a></small></label><input class="in" id="t-icon" placeholder="article" value="article"></div>
      <button class="btn" type="submit">${icon('add')}Add topic</button>
    </form>
    <div class="table"><table><thead><tr><th>TOPIC</th><th>ICON</th><th>ARTICLES</th><th style="text-align:right">ACTIONS</th></tr></thead><tbody>
    ${S.topics.map((t, i) => `<tr>
      <td><input class="in" data-label="${t.id}" value="${esc(t.label)}" aria-label="Topic name"></td>
      <td><div style="display:flex;gap:10px;align-items:center">${icon(esc(t.icon))}<input class="in" data-icon="${t.id}" value="${esc(t.icon)}" aria-label="Icon name" style="max-width:180px"></div></td>
      <td>${used[t.id] || 0}</td>
      <td><div class="row-actions">
        <button class="icon-btn" type="button" data-up="${i}" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${icon('arrow_upward')}</button>
        <button class="icon-btn danger" type="button" data-del="${t.id}" aria-label="Delete topic">${icon('delete')}</button></div></td></tr>`).join('')}
    </tbody></table></div>
    <p class="hint" style="margin-top:12px">Changes save when you leave a field. Order here is the order of the filter chips on the blog.</p></div>`;
  $('#t-form').onsubmit = async (e) => {
    e.preventDefault();
    const label = $('#t-label').value.trim(); if (!label) return;
    const { error } = await sb.from('topics').insert({ label, slug: slugify(label), icon: $('#t-icon').value.trim() || 'article', sort: S.topics.length });
    if (error) return toast(error.code === '23505' ? 'That topic already exists.' : error.message, true);
    toast('Topic added'); topicsView();
  };
  $('.table').addEventListener('change', async (e) => {
    const l = e.target.dataset.label, ic = e.target.dataset.icon;
    if (!l && !ic) return;
    const { error } = await sb.from('topics').update(l ? { label: e.target.value.trim() } : { icon: e.target.value.trim() || 'article' }).eq('id', l || ic);
    if (error) return toast(error.message, true);
    toast('Saved'); if (ic) topicsView();
  });
  $('.table').addEventListener('click', async (e) => {
    const up = e.target.closest('[data-up]'); const del = e.target.closest('[data-del]');
    if (up) {
      const i = +up.dataset.up; const a = S.topics[i], b = S.topics[i - 1];
      await Promise.all([sb.from('topics').update({ sort: i - 1 }).eq('id', a.id), sb.from('topics').update({ sort: i }).eq('id', b.id)]);
      topicsView();
    }
    if (del) {
      const n = used[del.dataset.del] || 0;
      if (!await confirmBox({ title: 'Delete this topic?', body: n ? `${n} article${n === 1 ? '' : 's'} will be left with no topic.` : 'No articles use it.', ok: 'Delete', danger: true })) return;
      const { error } = await sb.from('topics').delete().eq('id', del.dataset.del);
      if (error) return toast(error.message, true);
      topicsView();
    }
  });
}

// ---------- Media ----------
async function mediaView() {
  shell('media', `<div class="page"><div class="loading"><div class="pulse"></div>Loading media</div></div>`);
  const folders = await sb.storage.from(BUCKET).list('', { limit: 100, sortBy: { column: 'name', order: 'desc' } });
  const files = [];
  for (const f of folders.data || []) {
    if (f.id) { files.push({ path: f.name, ...f }); continue; }
    const { data } = await sb.storage.from(BUCKET).list(f.name, { limit: 500, sortBy: { column: 'created_at', order: 'desc' } });
    (data || []).filter((x) => x.id).forEach((x) => files.push({ path: `${f.name}/${x.name}`, ...x }));
  }
  files.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const url = (p) => sb.storage.from(BUCKET).getPublicUrl(p).data.publicUrl;
  $('.content').innerHTML = `<div class="page">
    <div class="page-head"><div><p class="eyebrow soft">Insights blog</p><h1>Media</h1></div>
      <div class="actions"><button class="btn" type="button" id="m-up">${icon('upload')}Upload image</button></div></div>
    ${files.length ? `<div class="media-grid">${files.map((f) => `<div class="media-item">
      <img src="${esc(url(f.path))}" alt="" loading="lazy">
      <div class="bar"><span title="${esc(f.path)}">${esc(fmtDate(f.created_at))} · ${Math.round((f.metadata?.size || 0) / 1024)} KB</span>
        <span style="display:flex"><button class="icon-btn" type="button" data-copy="${esc(url(f.path))}" aria-label="Copy image URL">${icon('content_copy')}</button>
        <button class="icon-btn danger" type="button" data-del="${esc(f.path)}" aria-label="Delete image">${icon('delete')}</button></span></div></div>`).join('')}</div>`
      : `<div class="table"><div class="empty-state">${icon('image')}<h3>No images yet</h3><p>Images you add to articles show up here.</p></div></div>`}
  </div>`;
  $('#m-up').onclick = async () => {
    const f = await pickFile(); if (!f) return;
    try { await uploadImage(f); toast('Uploaded'); mediaView(); } catch (err) { toast(err.message, true); }
  };
  $('.content').addEventListener('click', async (e) => {
    const c = e.target.closest('[data-copy]'); const d = e.target.closest('[data-del]');
    if (c) { await navigator.clipboard.writeText(c.dataset.copy); toast('Image URL copied'); }
    if (d) {
      if (!await confirmBox({ title: 'Delete this image?', body: 'Any article using it will show a broken image. This cannot be undone.', ok: 'Delete', danger: true })) return;
      const { error } = await sb.storage.from(BUCKET).remove([d.dataset.del]);
      if (error) return toast(error.message, true);
      mediaView();
    }
  });
}

// ---------- Subscribers ----------
function csvEscape(v) { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

async function subscribersView() {
  shell('subscribers', `<div class="page"><div class="loading"><div class="pulse"></div>Loading subscribers</div></div>`);
  const { data: subs, error } = await sb.from('subscribers').select('id, email, name, source, status, created_at').order('created_at', { ascending: false });
  if (error) return toast(error.message, true);
  const st = { q: '', tab: 'active' };
  const active = subs.filter((s) => s.status === 'active').length;
  const set = S.settings || {};
  $('.content').innerHTML = `<div class="page">
    <div class="page-head"><div><p class="eyebrow soft">The Heddi Brief</p><h1>Subscribers</h1></div>
      <div class="actions">
        <button class="btn btn-ghost" type="button" id="s-export">${icon('download')}Export CSV</button>
        <button class="btn btn-ghost" type="button" id="s-import">${icon('upload')}Import CSV</button>
        <button class="btn" type="button" id="s-add">${icon('person_add')}Add subscriber</button></div></div>
    <div class="two-col"><div>
      <form class="inline-form" id="s-form" hidden>
        <div class="f"><label for="s-name">Name</label><input class="in" id="s-name" autocomplete="off"></div>
        <div class="f"><label for="s-email">Email</label><input class="in" id="s-email" type="email" required autocomplete="off"></div>
        <button class="btn" type="submit">Save</button><button class="btn btn-ghost" type="button" id="s-cancel">Cancel</button>
      </form>
      <div class="tabs-row">
        <div class="tabs" role="group" aria-label="Filter">
          <button class="tab" type="button" data-tab="active" aria-pressed="true">Active<small>${active}</small></button>
          <button class="tab" type="button" data-tab="unsubscribed" aria-pressed="false">Unsubscribed<small>${subs.length - active}</small></button>
          <button class="tab" type="button" data-tab="all" aria-pressed="false">All<small>${subs.length}</small></button></div>
        <label class="search" style="flex:0 1 280px;min-height:44px">${icon('search')}<span class="sr-only">Search subscribers</span><input type="search" id="sq" placeholder="Search name or email"></label>
      </div>
      <div class="table"><table><thead><tr><th>NAME</th><th>EMAIL</th><th>SOURCE</th><th>JOINED</th><th style="text-align:right">ACTIONS</th></tr></thead><tbody id="s-rows"></tbody></table>
      <div class="empty-state" id="s-empty" hidden>${icon('mark_email_unread')}<h3>No subscribers yet</h3><p>When readers sign up through the form on the blog, they show up here. You can also add people by hand or import a list.</p></div></div>
    </div>
    <aside><form class="panel" id="nl-settings">
      <h2>Newsletter settings</h2>
      <div class="f"><label for="ns-name">Sender name</label><input class="in" id="ns-name" value="${esc(set.sender_name || 'Heddi Strategies')}"></div>
      <div class="f"><label for="ns-reply">Reply-to email</label><input class="in" id="ns-reply" type="email" value="${esc(set.reply_to || '')}" placeholder="hello@heddistrategies.com"></div>
      <div class="f"><label for="ns-mode">Send new articles</label><select class="in" id="ns-mode">
        <option value="manual" ${set.send_mode !== 'never' ? 'selected' : ''}>Each time I choose to</option>
        <option value="never" ${set.send_mode === 'never' ? 'selected' : ''}>Never (collect only)</option></select></div>
      <button class="btn" type="submit">Save settings</button>
      <div class="notice">${icon('info')}<span>The signup form lives on the blog pages. Every email includes a one-click unsubscribe link.</span></div>
    </form></aside></div>
  </div>`;

  const draw = () => {
    const q = st.q.toLowerCase();
    const list = subs.filter((s) => (st.tab === 'all' || s.status === st.tab) && (!q || (s.email + ' ' + (s.name || '')).toLowerCase().includes(q)));
    $('#s-rows').innerHTML = list.map((s) => `<tr>
      <td style="color:var(--on-surface)">${esc(s.name || '—')}</td><td>${esc(s.email)}</td>
      <td>${s.status === 'unsubscribed' ? '<span class="badge unsubscribed">Unsubscribed</span>' : esc(s.source)}</td><td>${esc(fmtDate(s.created_at))}</td>
      <td><div class="row-actions">
        ${s.status === 'active' ? `<button class="icon-btn" type="button" data-unsub="${s.id}" aria-label="Unsubscribe">${icon('unsubscribe')}</button>` : `<button class="icon-btn" type="button" data-resub="${s.id}" aria-label="Resubscribe">${icon('mark_email_read')}</button>`}
        <button class="icon-btn danger" type="button" data-del="${s.id}" aria-label="Delete">${icon('delete')}</button></div></td></tr>`).join('');
    $('#s-empty').hidden = list.length > 0;
    if (!subs.length) $('#s-empty').hidden = false;
  };
  draw();
  $('.tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; st.tab = b.dataset.tab; $$('.tab').forEach((x) => x.setAttribute('aria-pressed', x === b)); draw(); };
  $('#sq').oninput = (e) => { st.q = e.target.value.trim(); draw(); };
  $('#s-add').onclick = () => { $('#s-form').hidden = false; $('#s-name').focus(); };
  $('#s-cancel').onclick = () => { $('#s-form').hidden = true; };
  $('#s-form').onsubmit = async (e) => {
    e.preventDefault();
    const { error: err } = await sb.from('subscribers').insert({ email: $('#s-email').value.trim().toLowerCase(), name: $('#s-name').value.trim() || null, source: 'manual' });
    if (err) return toast(err.code === '23505' ? 'That email is already on the list.' : 'Check the email address and try again.', true);
    toast('Subscriber added'); subscribersView();
  };
  $('#s-rows').onclick = async (e) => {
    const u = e.target.closest('[data-unsub]'), r = e.target.closest('[data-resub]'), d = e.target.closest('[data-del]');
    if (u || r) {
      const { error: err } = await sb.from('subscribers').update(u ? { status: 'unsubscribed', unsubscribed_at: new Date().toISOString() } : { status: 'active', unsubscribed_at: null }).eq('id', (u || r).dataset[u ? 'unsub' : 'resub']);
      if (err) return toast(err.message, true);
      subscribersView();
    }
    if (d) {
      if (!await confirmBox({ title: 'Delete this subscriber?', body: 'They are removed from the list entirely. To stop emails but keep the record, use Unsubscribe instead.', ok: 'Delete', danger: true })) return;
      const { error: err } = await sb.from('subscribers').delete().eq('id', d.dataset.del);
      if (err) return toast(err.message, true);
      subscribersView();
    }
  };
  $('#s-export').onclick = () => {
    const lines = [['email', 'name', 'source', 'status', 'joined'], ...subs.map((s) => [s.email, s.name, s.source, s.status, s.created_at])].map((r) => r.map(csvEscape).join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    a.download = `heddi-brief-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };
  $('#s-import').onclick = () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,text/csv';
    inp.onchange = async () => {
      const rows = parseCsv(await inp.files[0].text());
      if (!rows.length) return toast('That file looks empty.', true);
      const head = rows[0].map((h) => h.trim().toLowerCase());
      let ei = head.findIndex((h) => h.includes('email')), ni = head.findIndex((h) => h === 'name' || h.includes('full name') || h === 'first name');
      const data = ei >= 0 ? rows.slice(1) : rows;
      if (ei < 0) ei = rows[0].findIndex((c) => c.includes('@'));
      const seen = new Set(subs.map((s) => s.email.toLowerCase()));
      const add = [];
      data.forEach((r) => {
        const email = (r[ei] || '').trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || seen.has(email)) return;
        seen.add(email); add.push({ email, name: ni >= 0 ? (r[ni] || '').trim() || null : null, source: 'import' });
      });
      if (!add.length) return toast('No new email addresses found in that file.', true);
      if (!await confirmBox({ title: `Import ${add.length} subscriber${add.length === 1 ? '' : 's'}?`, body: 'Only import people who agreed to hear from Heddi Strategies. Duplicates and invalid emails were skipped.', ok: 'Import' })) return;
      for (let i = 0; i < add.length; i += 500) {
        const { error: err } = await sb.from('subscribers').upsert(add.slice(i, i + 500), { onConflict: 'email', ignoreDuplicates: true });
        if (err) return toast(err.message, true);
      }
      toast(`Imported ${add.length}`); subscribersView();
    };
    inp.click();
  };
  $('#nl-settings').onsubmit = async (e) => {
    e.preventDefault();
    const row = { sender_name: $('#ns-name').value.trim() || 'Heddi Strategies', reply_to: $('#ns-reply').value.trim() || null, send_mode: $('#ns-mode').value, updated_at: new Date().toISOString() };
    const { error: err } = await sb.from('newsletter_settings').update(row).eq('id', 1);
    if (err) return toast(err.message, true);
    S.settings = { ...S.settings, ...row };
    toast('Settings saved');
  };
}

// ---------- Settings (authors + team) ----------
async function settingsView() {
  shell('settings', '');
  await loadLookups();
  const { data: team } = await sb.from('editors').select('email, role, created_at').order('created_at');
  $('.content').innerHTML = `<div class="page">
    <div class="page-head"><div><p class="eyebrow soft">Content Studio</p><h1>Settings</h1></div></div>
    <div class="two-col"><div>
      <h2 class="eyebrow soft" style="margin-bottom:16px">Authors</h2>
      <div style="display:flex;flex-direction:column;gap:16px" id="authors">
      ${S.authors.map((a) => `<form class="panel" data-author="${a.id}">
        <div style="display:flex;gap:16px;align-items:center">
          <button class="avatar" type="button" data-avatar style="width:64px;height:64px;border:0;cursor:pointer" aria-label="Change photo">${a.avatar_url ? `<img src="${esc(a.avatar_url)}" alt="">` : esc(a.name.charAt(0))}</button>
          <div style="flex:1;display:flex;flex-wrap:wrap;gap:12px">
            <div class="f" style="flex:1 1 200px"><label>Name</label><input class="in" name="name" value="${esc(a.name)}" required></div>
            <div class="f" style="flex:1 1 200px"><label>Role</label><input class="in" name="role" value="${esc(a.role || '')}"></div></div></div>
        <div class="f"><label>Short bio <small>shown at the end of each article</small></label><textarea class="in" name="bio" rows="3">${esc(a.bio || '')}</textarea></div>
        <div style="display:flex;gap:10px;justify-content:space-between"><button class="btn btn-ghost sm" type="button" data-del>${icon('delete')}Remove</button><button class="btn sm" type="submit">Save author</button></div>
      </form>`).join('')}
      </div>
      <button class="btn btn-ghost" type="button" id="add-author" style="margin-top:16px">${icon('person_add')}Add author</button>
    </div>
    <aside><div class="panel">
      <h2>Studio team</h2>
      ${(team || []).map((t) => `<div class="switch-row"><span><b>${esc(t.email)}</b><small>${t.role === 'admin' ? 'Admin' : 'Editor'}</small></span></div>`).join('')}
      <div class="notice">${icon('info')}<span>To add someone, invite them under Authentication › Users in the Supabase dashboard, then ask your web partner to grant them Studio access.</span></div>
    </div></aside></div></div>`;

  $('#add-author').onclick = async () => {
    const { error } = await sb.from('authors').insert({ name: 'New author' });
    if (error) return toast(error.message, true);
    settingsView();
  };
  $('#authors').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const { error } = await sb.from('authors').update({ name: f.name.value.trim(), role: f.role.value.trim() || null, bio: f.bio.value.trim() || null }).eq('id', f.dataset.author);
    if (error) return toast(error.message, true);
    toast('Author saved'); loadLookups();
  });
  $('#authors').addEventListener('click', async (e) => {
    const f = e.target.closest('[data-author]'); if (!f) return;
    if (e.target.closest('[data-del]')) {
      if (!await confirmBox({ title: 'Remove this author?', body: 'Their articles stay published but lose the byline.', ok: 'Remove', danger: true })) return;
      const { error } = await sb.from('authors').delete().eq('id', f.dataset.author);
      if (error) return toast(error.message, true);
      settingsView();
    }
    if (e.target.closest('[data-avatar]')) {
      const file = await pickFile(); if (!file) return;
      try {
        const url = await uploadImage(file);
        const { error } = await sb.from('authors').update({ avatar_url: url }).eq('id', f.dataset.author);
        if (error) throw error;
        settingsView();
      } catch (err) { toast(err.message, true); }
    }
  });
}

// ---------- routing ----------
async function loadLookups() {
  const [t, a, s] = await Promise.all([
    sb.from('topics').select('*').order('sort'),
    sb.from('authors').select('*').order('created_at'),
    sb.from('newsletter_settings').select('*').eq('id', 1).maybeSingle()
  ]);
  S.topics = t.data || []; S.authors = a.data || []; S.settings = s.data || null;
}

function route() {
  window.onbeforeunload = null;
  const h = location.hash.replace(/^#\/?/, '');
  const [path, query] = h.split('?');
  const [view, id] = path.split('/');
  if (view === 'edit' && id) return editorView(id, query === 'new=1');
  if (view === 'topics') return topicsView();
  if (view === 'media') return mediaView();
  if (view === 'subscribers') return subscribersView();
  if (view === 'settings') return settingsView();
  return articlesView();
}

let routed = false;
async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return loginView();
  S.user = session.user;
  if (/type=(recovery|invite)/.test(authHash) && !sessionStorage.getItem('pw-set')) {
    sessionStorage.setItem('pw-set', '1');
    return setPasswordView();
  }
  const { data: ed } = await sb.from('editors').select('email, role').eq('user_id', S.user.id).maybeSingle();
  if (!ed) {
    await sb.auth.signOut();
    return loginView('This account does not have Studio access yet. Ask an admin to add you.', true);
  }
  S.editor = ed;
  await loadLookups();
  if (/access_token|type=/.test(location.hash)) history.replaceState(null, '', '/studio#/articles');
  if (!routed) { window.addEventListener('hashchange', route); routed = true; }
  route();
}

sb.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') setTimeout(setPasswordView, 0);
});
boot();

import { sb, esc, titleHtml, fmtDate, postCard, POST_FIELDS, initMobileMenu, initNewsletter, setYear } from './lib.js';

const PAGE = 9;
const state = { topic: 'all', q: '', shown: PAGE, posts: [], topics: [] };
const $ = (id) => document.getElementById(id);

function renderFeatured(p) {
  const wrap = $('featured-wrap');
  if (!p) { wrap.hidden = true; return; }
  wrap.hidden = false;
  const img = p.cover_url ? `<img src="${esc(p.cover_url)}" alt="${esc(p.cover_alt || '')}">`
    : '<img src="/Public/Images/Heddi_Strategies_earth-1280.webp" alt="" style="opacity:.55">';
  wrap.innerHTML = `<a class="card featured" href="/insights/${esc(p.slug)}">
    <div class="f-img">${img}</div>
    <div class="f-body">
      <p class="eyebrow">Featured${p.topic ? ' · ' + esc(p.topic.label) : ''}</p>
      <h2>${titleHtml(p.title)}</h2>
      ${p.summary ? `<p class="excerpt">${esc(p.summary)}</p>` : ''}
      <p class="meta">${p.author ? esc(p.author.name) + ' · ' : ''}${esc(fmtDate(p.publish_at))} · ${p.read_minutes} min read</p>
      <span class="read-more">Read the article <span class="material-symbols-outlined" aria-hidden="true" style="font-size:20px">arrow_forward</span></span>
    </div></a>`;
}

function renderChips() {
  const defs = [{ slug: 'all', label: 'All topics' }, ...state.topics];
  $('chips').innerHTML = defs.map((t) =>
    `<button type="button" class="chip" data-topic="${esc(t.slug)}" aria-pressed="${state.topic === t.slug}">${esc(t.label)}</button>`).join('');
}

function renderList() {
  const q = state.q.toLowerCase();
  const list = state.posts.filter((p) =>
    (state.topic === 'all' || p.topic?.slug === state.topic) &&
    (!q || (p.title + ' ' + (p.summary || '')).toLowerCase().includes(q)));
  $('posts').innerHTML = list.slice(0, state.shown).map(postCard).join('');
  $('empty').hidden = list.length > 0;
  $('more-wrap').hidden = list.length <= state.shown;
}

async function load() {
  const [{ data: posts, error }, { data: topics }] = await Promise.all([
    sb.from('posts').select(POST_FIELDS).order('publish_at', { ascending: false }),
    sb.from('topics').select('slug,label,icon').order('sort')
  ]);
  if (error) {
    $('posts').innerHTML = '';
    $('empty').hidden = false;
    $('empty').innerHTML = '<p>We could not load articles right now.</p><p>Please refresh in a moment.</p>';
    return;
  }
  state.topics = topics || [];
  $('topic-line').textContent = state.topics.filter((t) => t.slug !== 'our-approach').map((t) => t.label).join(' · ');
  const featured = posts.find((p) => p.featured) || null;
  renderFeatured(featured);
  state.posts = posts.filter((p) => p !== featured);
  if (!posts.length) {
    $('posts').innerHTML = '';
    $('empty').hidden = false;
    $('empty').innerHTML = '<p>First articles are on the way.</p><p>Join The Heddi Brief below and we will send them to you.</p>';
    $('chips').hidden = true;
    return;
  }
  renderChips();
  renderList();
}

$('chips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-topic]');
  if (!b) return;
  state.topic = b.dataset.topic; state.shown = PAGE;
  renderChips(); renderList();
});
$('q').addEventListener('input', (e) => { state.q = e.target.value.trim(); state.shown = PAGE; renderList(); });
$('more').addEventListener('click', () => { state.shown += PAGE; renderList(); });

initMobileMenu();
initNewsletter('blog');
setYear();
load();

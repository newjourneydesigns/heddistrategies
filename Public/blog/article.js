import { sb, esc, titleHtml, titlePlain, fmtDate, sanitize, postCard, POST_FIELDS, initMobileMenu, initNewsletter, setYear } from './lib.js';

const $ = (id) => document.getElementById(id);
const slug = decodeURIComponent(location.pathname.replace(/^\/insights\/?/, '').replace(/\/$/, '')) || new URLSearchParams(location.search).get('slug');

function setMeta(name, content, attr = 'name') {
  let m = document.querySelector(`meta[${attr}="${name}"]`);
  if (!m) { m = document.createElement('meta'); m.setAttribute(attr, name); document.head.appendChild(m); }
  m.setAttribute('content', content);
}

function notFound() {
  document.title = 'Article not found | Heddi Strategies';
  $('article').innerHTML = `<section class="wrap a-head"><a class="back" href="/insights"><span class="material-symbols-outlined" aria-hidden="true" style="font-size:18px">arrow_back</span>All insights</a>
    <h1 class="serif" style="margin:40px 0 16px;font-size:clamp(36px,5vw,64px)">We could not find that article.</h1>
    <p style="color:var(--muted);font-size:18px">It may have moved or not be published yet.</p></section>`;
}

function buildBody(html) {
  const tpl = document.createElement('div');
  tpl.innerHTML = sanitize(html);
  const toc = [];
  tpl.querySelectorAll('h2').forEach((h, i) => {
    const n = String(i + 1).padStart(2, '0');
    const text = h.textContent.trim();
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'section-' + n;
    h.id = id;
    h.innerHTML = `<span class="num">${n}</span>${esc(text)}`;
    toc.push({ id, n, text });
  });
  const take = tpl.querySelector('.takeaways');
  if (take) { take.id = 'takeaways'; toc.push({ id: 'takeaways', n: String(toc.length + 1).padStart(2, '0'), text: 'Key takeaways' }); }
  tpl.querySelectorAll('a[href^="http"]').forEach((a) => { if (!a.href.includes(location.host)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } });
  tpl.querySelectorAll('img').forEach((img) => { img.loading = 'lazy'; });
  return { body: tpl.innerHTML, toc };
}

async function load() {
  if (!slug) return notFound();
  const { data: p } = await sb.from('posts').select(POST_FIELDS + ', body_html, meta_title, meta_description, topic_id').eq('slug', slug).maybeSingle();
  if (!p) return notFound();

  const plain = titlePlain(p.title);
  document.title = p.meta_title || `${plain} | Heddi Strategies`;
  const desc = p.meta_description || p.summary || '';
  setMeta('description', desc);
  setMeta('og:title', p.meta_title || plain, 'property');
  setMeta('og:description', desc, 'property');
  setMeta('og:url', location.href, 'property');
  if (p.cover_url) setMeta('og:image', p.cover_url, 'property');

  const { body, toc } = buildBody(p.body_html);
  const a = p.author;
  const initial = esc((a?.name || 'H').charAt(0));
  const url = encodeURIComponent(location.href);
  const tocHtml = toc.length ? `<p class="eyebrow soft" style="font-size:11px">In this article</p><ol>${toc.map((t) =>
    `<li><a href="#${t.id}"><span>${t.n}</span>${esc(t.text)}</a></li>`).join('')}</ol>` : '';

  $('article').innerHTML = `<article>
    <header class="wrap a-head">
      <a class="back" href="/insights"><span class="material-symbols-outlined" aria-hidden="true" style="font-size:18px">arrow_back</span>All insights</a>
      <p class="eyebrow">${esc(p.topic?.label || 'Insights')}</p>
      <div class="row">
        <h1>${titleHtml(p.title)}</h1>
        <div class="side">
          ${p.summary ? `<p class="dek">${esc(p.summary)}</p>` : ''}
          <div class="byline">
            <div class="avatar" aria-hidden="true">${a?.avatar_url ? `<img src="${esc(a.avatar_url)}" alt="">` : initial}</div>
            <div><p class="name">${esc(a?.name || 'Heddi Strategies')}</p>
            <p class="meta">${esc(fmtDate(p.publish_at))} · ${p.read_minutes} min read</p></div>
          </div>
        </div>
      </div>
    </header>
    ${p.cover_url ? `<div class="a-cover"><img src="${esc(p.cover_url)}" alt="${esc(p.cover_alt || '')}"></div>` : ''}
    <div class="wrap a-layout">
      <aside class="toc" aria-label="In this article">
        ${tocHtml}
        <div class="share">
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=${url}" target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn"><span class="material-symbols-outlined" aria-hidden="true">share</span></a>
          <button type="button" id="copy-link" aria-label="Copy link"><span class="material-symbols-outlined" aria-hidden="true">link</span></button>
          <a href="mailto:?subject=${encodeURIComponent(plain)}&body=${url}" aria-label="Email this article"><span class="material-symbols-outlined" aria-hidden="true">mail</span></a>
        </div>
      </aside>
      <div class="prose">
        ${body}
        ${a ? `<div class="author-box">
          <img src="/Public/Images/Heddi%20Strategies%20Logo%20Mark%20White.png" alt="" style="height:40px;width:auto;opacity:.8">
          <div><p class="eyebrow soft">About the author</p><p>${esc(a.bio || `${a.name}${a.role ? ', ' + a.role : ''} at Heddi Strategies.`)}</p></div>
        </div>` : ''}
      </div>
    </div>
  </article>`;

  $('copy-link').addEventListener('click', async (e) => {
    try { await navigator.clipboard.writeText(location.href); e.currentTarget.querySelector('span').textContent = 'check'; } catch (_) {}
  });

  // Highlight the current section in the table of contents.
  const links = [...document.querySelectorAll('.toc ol a')];
  if (links.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) links.forEach((l) => l.classList.toggle('active', l.hash === '#' + en.target.id));
    }), { rootMargin: '-20% 0px -70% 0px' });
    toc.forEach((t) => { const el = document.getElementById(t.id); if (el) io.observe(el); });
  }

  // Related: same topic first, then newest.
  const { data: others } = await sb.from('posts').select(POST_FIELDS + ', topic_id').neq('id', p.id).order('publish_at', { ascending: false }).limit(12);
  if (others?.length) {
    const rel = [...others.filter((o) => o.topic_id === p.topic_id), ...others.filter((o) => o.topic_id !== p.topic_id)].slice(0, 3);
    $('related').innerHTML = rel.map(postCard).join('');
    $('related-wrap').hidden = false;
  }
}

initMobileMenu();
initNewsletter('article');
setYear();
load();

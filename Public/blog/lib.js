// Shared helpers for the public blog and the Content Studio.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.es.mjs';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Titles use *phrase* to mark the sage italic highlight.
export const titleHtml = (t) => esc(t).replace(/\*([^*]+)\*/g, '<em>$1</em>');
export const titlePlain = (t) => String(t ?? '').replace(/\*/g, '');

export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

export const sanitize = (html) => DOMPurify.sanitize(html || '', {
  ALLOWED_TAGS: ['p','h2','h3','strong','b','em','i','a','ul','ol','li','blockquote','cite','figure','figcaption','img','br','div','hr'],
  ALLOWED_ATTR: ['href','src','alt','class','title','target','rel'],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|\/|#)/i
});

export const POST_FIELDS = 'id, slug, title, summary, cover_url, cover_alt, publish_at, featured, read_minutes, topic:topics(slug,label,icon), author:authors(name,role,bio,avatar_url)';

export function postCard(p) {
  const img = p.cover_url
    ? `<img src="${esc(p.cover_url)}" alt="${esc(p.cover_alt || '')}" loading="lazy">`
    : `<span class="material-symbols-outlined" aria-hidden="true">${esc(p.topic?.icon || 'article')}</span>`;
  return `<a class="card" href="/insights/${esc(p.slug)}">
    <div class="card-img">${img}</div>
    <div class="card-body">
      <p class="cat">${esc(p.topic?.label || 'Insights')}</p>
      <h3>${titleHtml(p.title)}</h3>
      ${p.summary ? `<p class="excerpt">${esc(p.summary)}</p>` : ''}
      <p class="meta">${esc(fmtDate(p.publish_at))} · ${p.read_minutes || 1} min read</p>
    </div></a>`;
}

export function initMobileMenu() {
  const btn = document.getElementById('menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  const spans = btn.querySelectorAll('span');
  btn.addEventListener('click', () => {
    const open = !menu.classList.contains('open');
    menu.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    spans[0].style.transform = open ? 'translateY(6px) rotate(45deg)' : '';
    spans[1].style.opacity = open ? '0' : '1';
    spans[2].style.transform = open ? 'translateY(-6px) rotate(-45deg)' : '';
  });
}

export function initNewsletter(source) {
  const form = document.getElementById('nl-form');
  if (!form) return;
  const msg = document.getElementById('nl-msg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (form.website.value) return; // honeypot
    const btn = form.querySelector('button');
    btn.disabled = true;
    const { error } = await sb.rpc('subscribe', { p_email: email, p_source: source });
    btn.disabled = false;
    msg.hidden = false;
    if (error) { msg.className = 'msg err'; msg.textContent = 'That email did not go through. Check it and try again.'; return; }
    msg.className = 'msg';
    msg.textContent = 'You are on the list. Thanks for reading.';
    form.reset();
  });
}

export function setYear() {
  document.querySelectorAll('[data-current-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
}

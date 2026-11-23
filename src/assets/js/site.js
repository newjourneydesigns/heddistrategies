// Small behaviors for heddistrategies.com. No framework needed.
(function () {
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // Footer year
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Mobile menu
  var menuBtn = $('[data-menu-btn]');
  var menu = $('#site-menu');
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      $('span', menuBtn).textContent = open ? 'close' : 'menu';
    });
  }

  // FAQ accordion
  $$('[data-faq-btn]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.hidden = !open;
      $('[data-faq-icon]', btn).textContent = open ? 'remove' : 'add';
    });
  });

  // Contact form (delivered by Web3Forms to the Heddi inbox)
  var form = $('#contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('[type="submit"]', form);
      var label = $('[data-btn-label]', form);
      var err = $('#contact-error');
      var data = new FormData(form);
      data.set('replyto', data.get('email') || '');
      btn.disabled = true; label.textContent = 'SENDING…'; err.hidden = true;
      fetch(form.action, { method: 'POST', body: data })
        .then(function (res) { return res.json(); })
        .then(function (json) {
          if (!json.success) throw new Error(json.message || 'Submission failed');
          form.hidden = true;
          var ok = $('#contact-success'); ok.hidden = false; ok.focus();
        })
        .catch(function () {
          err.hidden = false;
          btn.disabled = false; label.textContent = 'SEND MESSAGE';
        });
    });
  }

  // Insights: topic chips + search
  var grid = $('[data-post-grid]');
  if (grid) {
    var cards = $$('[data-post]', grid);
    var chips = $$('[data-chip]');
    var search = $('[data-post-search]');
    var empty = $('[data-post-empty]');
    var more = $('[data-load-more]');
    var PAGE = 6, shown = PAGE, topic = 'all';
    var paint = function () {
      var q = (search && search.value || '').trim().toLowerCase();
      var hits = cards.filter(function (c) {
        return (topic === 'all' || c.getAttribute('data-topic') === topic) &&
          (!q || c.getAttribute('data-text').indexOf(q) !== -1);
      });
      cards.forEach(function (c) { c.hidden = true; });
      hits.slice(0, shown).forEach(function (c) { c.hidden = false; });
      if (empty) empty.hidden = hits.length !== 0;
      if (more) more.hidden = hits.length <= shown;
    };
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        topic = chip.getAttribute('data-chip'); shown = PAGE;
        chips.forEach(function (c) {
          var on = c === chip;
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
          c.classList.toggle('hs-chip', !on);
          c.style.background = on ? '#2b3a49' : '#ffffff';
          c.style.color = on ? '#ffffff' : '#1f2a36';
          c.style.fontWeight = on ? '800' : '600';
        });
        paint();
      });
    });
    if (search) search.addEventListener('input', function () { shown = PAGE; paint(); });
    if (more) more.addEventListener('click', function () { shown += PAGE; paint(); });
    paint();
  }

  // Article: copy link
  $$('[data-copy-link]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var icon = $('span', btn);
      var done = function () { icon.textContent = 'check'; setTimeout(function () { icon.textContent = 'link'; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done);
    });
  });

  // Newsletter signup
  $$('[data-newsletter]').forEach(function (nl) {
    nl.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = $('[data-newsletter-note]', nl);
      var btn = $('[type="submit"]', nl);
      var email = $('input[type="email"]', nl).value.trim();
      btn.disabled = true;
      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, source: 'blog', website: ($('[name="website"]', nl) || {}).value || '' })
      })
        .then(function (res) { if (!res.ok) throw new Error('failed'); return res.json(); })
        .then(function () { nl.reset(); note.textContent = 'You are on the list. Thank you.'; })
        .catch(function () { note.textContent = 'Signup is not available yet. Please try again soon.'; })
        .then(function () { btn.disabled = false; });
    });
  });
})();

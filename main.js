// hierjetzt landing page: drawn streets, scroll zoom, waiting list. No libraries, no tracking.
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // ---------- Streets: a small, made-up neighbourhood (same seed = same map) ----------
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const el = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  // Draws into g within the box x0..x1, y0..y1. Returns nothing; style comes from CSS classes.
  function drawStreets(g, { x0, y0, x1, y1, seed = 7, step = 70, width = 7, main = 14, river = true }) {
    const r = rng(seed);
    const w = x1 - x0, h = y1 - y0;
    const frag = document.createDocumentFragment();
    let i = 0;
    // River along the bottom, park patch
    if (river) {
      frag.append(el('path', { class: 'water', d: `M${x0} ${y0 + h * 0.86} C${x0 + w * 0.3} ${y0 + h * 0.78} ${x0 + w * 0.6} ${y0 + h * 0.95} ${x1} ${y0 + h * 0.84} L${x1} ${y1} L${x0} ${y1}Z` }));
    }
    frag.append(el('rect', { class: 'park', x: x0 + w * 0.08, y: y0 + h * 0.36, width: w * 0.2, height: h * 0.16, rx: 14, transform: `rotate(-8 ${x0 + w * 0.18} ${y0 + h * 0.44})` }));
    // A few house blocks
    for (let k = 0; k < Math.round((w * h) / (step * step * 3)); k++) {
      const bx = x0 + r() * w, by = y0 + r() * h * 0.8;
      frag.append(el('rect', { class: 'block', x: bx, y: by, width: step * (0.4 + r() * 0.4), height: step * (0.3 + r() * 0.4), rx: 4 }));
    }
    // Slightly crooked grid, like an old quarter
    const lines = [];
    for (let y = y0 + step * 0.6; y < y1; y += step * (0.8 + r() * 0.5)) {
      const tilt = (r() - 0.5) * step * 0.9;
      lines.push(`M${x0 - 20} ${y} Q${x0 + w * 0.5} ${y + tilt} ${x1 + 20} ${y + tilt * 0.4}`);
    }
    for (let x = x0 + step * 0.5; x < x1; x += step * (0.8 + r() * 0.6)) {
      const lean = (r() - 0.5) * step * 1.2;
      // Some streets end early, like real side streets
      const end = r() < 0.3 ? y0 + h * (0.4 + r() * 0.4) : y1 + 20;
      lines.push(`M${x} ${y0 - 20} Q${x + lean} ${(y0 + end) / 2} ${x + lean * 1.6} ${end}`);
    }
    for (const d of lines) frag.append(el('path', { class: 'road', d, 'stroke-width': width, pathLength: 1, style: `--i:${i++}` }));
    // Two main roads (yellow, like on the app's map)
    frag.append(el('path', { class: 'main', d: `M${x0 + w * 0.62} ${y0 - 20} C${x0 + w * 0.58} ${y0 + h * 0.3} ${x0 + w * 0.72} ${y0 + h * 0.6} ${x0 + w * 0.66} ${y1 + 20}`, 'stroke-width': main, pathLength: 1, style: `--i:${i++}` }));
    frag.append(el('path', { class: 'main', d: `M${x0 - 20} ${y0 + h * 0.62} C${x0 + w * 0.3} ${y0 + h * 0.56} ${x0 + w * 0.6} ${y0 + h * 0.66} ${x1 + 20} ${y0 + h * 0.58}`, 'stroke-width': main, pathLength: 1, style: `--i:${i++}` }));
    g.append(frag);
  }

  const hero = $('.city .streets');
  if (hero) drawStreets(hero, { x0: 0, y0: 0, x1: 600, y1: 600, seed: 11, step: 74, width: 8, main: 15 });
  const mini = $('.mini-map .streets');
  if (mini) drawStreets(mini, { x0: 0, y0: 0, x1: 300, y1: 120, seed: 3, step: 40, width: 4, main: 7, river: false });

  // Replay the hero scene: restart all CSS animations inside it.
  const city = $('.city');
  $('.replay')?.addEventListener('click', () => {
    for (const a of city.getAnimations({ subtree: true })) { a.cancel(); a.play(); }
  });

  // ---------- Things that start when they scroll into view ----------
  // Below-the-fold animations wait until visible, so nothing runs for nobody.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { threshold: 0.25 });
  $$('.device, .t, .end').forEach((n) => io.observe(n));

  // ---------- Zoom: from the whole world to the café across the street ----------
  const zoom = $('.zoom');
  const world = $('.zoom-world');
  const cityG = $('.zoom-city');
  if (zoom && !reduced) {
    // "World": scattered lights; "city": streets around the café at 0,0.
    const r = rng(42);
    for (let k = 0; k < 260; k++) {
      const a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * 480;
      world.append(el('circle', { cx: Math.cos(a) * d, cy: Math.sin(a) * d * 0.6, r: 0.6 + r() * 1.6, opacity: 0.25 + r() * 0.6 }));
    }
    drawStreets($('.zoom-town'), { x0: -900, y0: -900, x1: 900, y1: 900, seed: 5, step: 90, width: 1.5, main: 3 });

    const n = $('.zoom-n'), unit = $('.zoom-unit'), steps = $$('.zoom-steps li');
    // Distance shown: 20,000 km down to 120 m, on a log scale so every scroll step feels alike.
    const KM_FROM = Math.log(20000), KM_TO = Math.log(0.12);
    const fmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
    let last = -1, ticking = false;
    const frame = () => {
      ticking = false;
      const rect = zoom.getBoundingClientRect();
      const total = rect.height - innerHeight;
      const p = Math.min(1, Math.max(0, -rect.top / total));
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      const km = Math.exp(KM_FROM + (KM_TO - KM_FROM) * p);
      if (km >= 1) { n.textContent = fmt.format(km >= 100 ? Math.round(km / 100) * 100 : km); unit.textContent = 'km'; }
      else { n.textContent = fmt.format(Math.round(km * 100) * 10); unit.textContent = 'm'; }
      // World shrinks away behind us, the city grows from a speck to street level.
      const ws = Math.exp(p * 5);
      world.setAttribute('transform', `scale(${ws})`);
      world.style.opacity = String(Math.max(0, 1 - p * 2.2));
      const cs = 0.04 * Math.exp(p * 4.2);
      cityG.setAttribute('transform', `scale(${cs})`);
      cityG.style.opacity = String(Math.min(1, Math.max(0, (p - 0.12) * 4)));
      const step = p < 0.25 ? 0 : p < 0.5 ? 1 : p < 0.78 ? 2 : 3;
      steps.forEach((li, k) => li.classList.toggle('on', k === step));
      zoom.classList.toggle('near', step === 3);
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    // Only listen while the section is on screen.
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { addEventListener('scroll', onScroll, { passive: true }); onScroll(); }
      else removeEventListener('scroll', onScroll);
    }).observe(zoom);
    frame();
  }

  // ---------- Page weight in the footer: honest, measured in the browser ----------
  addEventListener('load', () => {
    const w = $('.weight');
    if (!w || !performance.getEntriesByType) return;
    const nav = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource');
    const bytes = [nav, ...res].reduce((s, e) => s + (e?.transferSize || e?.encodedBodySize || 0), 0);
    if (bytes > 1000) w.textContent = String(Math.round(bytes / 1024));
  });

  // ---------- Waiting list ----------
  const dlg = $('.wl');
  const form = $('.wl-form');
  const done = $('.wl-done');
  let opener = null;

  function open(btn) {
    opener = btn;
    form.hidden = false;
    done.hidden = true;
    dlg.showModal();
    $('#wl-name').focus();
    if (reduced) return;
    // The dialog grows out of the button as a circle.
    const b = btn.getBoundingClientRect(), d = dlg.getBoundingClientRect();
    const x = b.left + b.width / 2 - d.left, y = b.top + b.height / 2 - d.top;
    const r = Math.hypot(Math.max(x, d.width - x), Math.max(y, d.height - y));
    dlg.animate([{ clipPath: `circle(24px at ${x}px ${y}px)` }, { clipPath: `circle(${r}px at ${x}px ${y}px)` }], { duration: 560, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  }
  function close() {
    if (!dlg.open) return;
    if (reduced) return dlg.close();
    dlg.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(16px) scale(0.98)' }], { duration: 180, easing: 'ease-in' }).onfinish = () => dlg.close();
  }
  dlg.addEventListener('close', () => opener?.focus());
  $$('[data-open-waitlist]').forEach((b) => b.addEventListener('click', () => open(b)));
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) close(); });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });

  const fieldErr = (name, msg) => {
    const input = form.elements[name];
    const err = $(`#${input.getAttribute('aria-describedby')}`);
    err.textContent = msg || '';
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };
  form.elements.firstName.addEventListener('input', () => fieldErr('firstName'));
  form.elements.email.addEventListener('input', () => fieldErr('email'));
  form.elements.consent.addEventListener('change', () => fieldErr('consent'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = form.elements;
    const formErr = $('.form-err');
    formErr.textContent = '';
    const okName = fieldErr('firstName', f.firstName.value.trim() ? '' : 'Wie heißt du?');
    const okMail = fieldErr('email', f.email.validity.valid && f.email.value.includes('.') ? '' : 'Die E-Mail-Adresse sieht nicht ganz richtig aus.');
    const okConsent = fieldErr('consent', f.consent.checked ? '' : 'Bitte setz noch den Haken, damit wir dir schreiben dürfen.');
    if (!okName || !okMail || !okConsent) {
      form.querySelector('[aria-invalid=true]')?.focus();
      return;
    }
    const body = {
      firstName: f.firstName.value.trim(),
      email: f.email.value.trim(),
      networks: $$('input[name=networks]:checked', form).map((c) => c.value),
      other: f.other.value.trim(),
      consent: true,
      website: f.website.value,
    };
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.firstChild.textContent = 'Einen Moment …';
    try {
      const api = ['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:8084/api/waitlist' : form.dataset.api;
      const res = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.field && f[data.field]) { fieldErr(data.field, data.error); f[data.field].focus(); }
        else formErr.textContent = data.error || 'Das hat nicht geklappt. Probier es gleich nochmal.';
        return;
      }
      success(body.firstName);
    } catch {
      formErr.textContent = 'Keine Verbindung. Probier es gleich nochmal.';
    } finally {
      btn.disabled = false;
      btn.firstChild.textContent = 'Eintragen';
    }
  });

  function success(name) {
    $('.done-name').textContent = name;
    form.hidden = true;
    done.hidden = false;
    $('strong', done).focus();
    form.reset();
    if (reduced) return;
    // A little burst of the tile colours around the pin.
    const colors = ['--color-yellow', '--color-lilac', '--color-mint', '--color-peach', '--color-blue', '--color-primary'];
    for (let k = 0; k < 22; k++) {
      const dot = document.createElement('span');
      dot.className = 'confetti';
      dot.style.background = `var(${colors[k % colors.length]})`;
      done.append(dot);
      const a = (k / 22) * Math.PI * 2, d = 70 + Math.random() * 110;
      dot.animate(
        [{ transform: 'translate(-50%, 0) scale(0.4)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), ${Math.sin(a) * d + 40}px) scale(1)`, opacity: 0 }],
        { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', delay: 250 }
      ).onfinish = () => dot.remove();
    }
  }
})();

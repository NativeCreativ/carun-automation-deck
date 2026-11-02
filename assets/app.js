(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer:fine)').matches;
const lite = reduced || innerWidth < 700 || (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
const wait = ms => new Promise(r => setTimeout(r, reduced ? Math.min(ms, 30) : ms));
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

/* ---------------- deck engine ---------------- */
const slides = $$('.slide');
const N = slides.length;
let cur = -1;
const inits = {}, enters = {}, leaves = {}, inited = new Set();
slides.forEach(s => $$('.rv', s).forEach((e, i) => e.style.setProperty('--i', i)));
$('#tot').textContent = String(N).padStart(2, '0');
$('#progress').setAttribute('aria-valuemax', N);

function go(n) {
  n = Math.max(0, Math.min(N - 1, n));
  if (n === cur) return;
  const prev = cur;
  if (prev >= 0 && leaves[prev]) leaves[prev]();
  slides.forEach((s, i) => {
    s.classList.toggle('active', i === n);
    s.classList.toggle('prev', i < n);
    s.setAttribute('aria-hidden', i === n ? 'false' : 'true');
    s.inert = i !== n;
  });
  cur = n;
  slides[n].scrollTop = 0;
  $('#cur').textContent = String(n + 1).padStart(2, '0');
  $('#progFill').style.width = ((n + 1) / N * 100) + '%';
  $('#progress').setAttribute('aria-valuenow', n + 1);
  $('#prev').disabled = n === 0;
  $('#next').disabled = n === N - 1;
  history.replaceState(null, '', '#/' + (n + 1));
  if (!inited.has(n) && inits[n]) { inited.add(n); inits[n](slides[n]); }
  if (enters[n]) setTimeout(() => cur === n && enters[n](), reduced ? 0 : 650);
  bg.nudge(n);
  setTimeout(moreCue, 900);
  $$('.ov-grid button').forEach((b, i) => b.classList.toggle('cur', i === n));
}
function moreCue() { const s = slides[cur]; if (!s) return; document.body.classList.toggle('can-scroll', s.scrollHeight - s.clientHeight - s.scrollTop > 40); }
slides.forEach(s => s.addEventListener('scroll', moreCue, { passive: true }));
addEventListener('resize', moreCue);
const next = () => go(cur + 1), prev = () => go(cur - 1);
$('#next').addEventListener('click', next);
$('#prev').addEventListener('click', prev);

addEventListener('keydown', e => {
  const t = e.target;
  if (t.matches && t.matches('input,select,textarea')) return;
  if ($('#overview').classList.contains('open')) { if (e.key === 'Escape' || e.key === 'o') toggleOv(false); return; }
  if (['ArrowRight', 'PageDown'].includes(e.key) || (e.key === ' ' && !t.closest('button'))) { e.preventDefault(); next(); }
  else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); prev(); }
  else if (e.key === 'Home') go(0);
  else if (e.key === 'End') go(N - 1);
  else if (e.key === 'o' || e.key === 'Escape') toggleOv();
});

// swipe (touch)
const NOSWIPE = '.app-tabs,.eng,input,select,textarea,.ba,.stage-card,.map';
let sx = 0, sy = 0, st = 0, blocked = false;
const deck = $('#deck');
deck.addEventListener('touchstart', e => {
  const p = e.touches[0]; sx = p.clientX; sy = p.clientY; st = Date.now();
  blocked = !!e.target.closest(NOSWIPE) || e.touches.length > 1;
}, { passive: true });
deck.addEventListener('touchend', e => {
  if (blocked) return;
  const p = e.changedTouches[0]; const dx = p.clientX - sx, dy = p.clientY - sy;
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4 && Date.now() - st < 900) dx < 0 ? next() : prev();
}, { passive: true });

// overview
const ovGrid = $('#ovGrid');
slides.forEach((s, i) => {
  const b = el('button', '', `<b>${String(i + 1).padStart(2, '0')}</b><span>${s.dataset.title}</span>`);
  b.style.transitionDelay = (i * 25) + 'ms';
  b.addEventListener('click', () => { toggleOv(false); go(i); });
  ovGrid.append(b);
});
function toggleOv(force) {
  const o = $('#overview'); const open = force ?? !o.classList.contains('open');
  o.classList.toggle('open', open); o.setAttribute('aria-hidden', !open);
}
$('#ovBtn').addEventListener('click', () => toggleOv(true));
$('#ovClose').addEventListener('click', () => toggleOv(false));

/* ---------------- background canvas ---------------- */
const bg = (() => {
  const c = $('#bg'), x = c.getContext('2d');
  let w, h, dpr, pts = [], ox = 0, tox = 0, t = 0, last = 0, raf;
  const count = lite ? 30 : 70, link = lite ? 110 : 140;
  function size() {
    dpr = Math.min(devicePixelRatio || 1, lite ? 1.5 : 2);
    w = innerWidth; h = innerHeight; c.width = w * dpr; c.height = h * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function seed() { pts = Array.from({ length: count }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: Math.random() * 1.4 + .4 })); }
  function draw(ts) {
    raf = requestAnimationFrame(draw);
    if (lite && ts - last < 33) return; last = ts;
    t += .004; ox += (tox - ox) * .03;
    x.clearRect(0, 0, w, h);
    for (let k = 0; k < 3; k++) {
      x.beginPath();
      for (let i = 0; i <= 24; i++) {
        const px = i / 24 * w, py = h * (.62 + k * .08) + Math.sin(i * .45 + t * (1.2 + k * .3) + k + ox * .002) * (28 + k * 12);
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.strokeStyle = `rgba(107,122,42,${.10 - k * .025})`; x.lineWidth = 1; x.stroke();
    }
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20; if (p.y < -20) p.y = h + 20; if (p.y > h + 20) p.y = -20;
    }
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], ax = (a.x - ox * .15 + w * 30) % w;
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j], bx = (b.x - ox * .15 + w * 30) % w, d = Math.hypot(ax - bx, a.y - b.y);
        if (d < link) { x.strokeStyle = `rgba(107,122,42,${(1 - d / link) * .14})`; x.beginPath(); x.moveTo(ax, a.y); x.lineTo(bx, b.y); x.stroke(); }
      }
      x.fillStyle = 'rgba(107,122,42,.32)'; x.beginPath(); x.arc(ax, a.y, a.r, 0, 6.283); x.fill();
    }
  }
  size(); seed();
  addEventListener('resize', size);
  if (reduced) { draw(0); cancelAnimationFrame(raf); }
  else raf = requestAnimationFrame(draw);
  document.addEventListener('visibilitychange', () => { if (reduced) return; cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(draw); });
  return { nudge(n) { tox = n * 260; } };
})();

/* ---------------- cursor + magnetic ---------------- */
if (fine && innerWidth >= 980 && !reduced) {
  const cu = $('#cursor'); let mx = -100, my = -100, cx = -100, cy = -100;
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; cu.classList.toggle('hover', !!e.target.closest('button,a,input,select,[role=switch],.p')); });
  (function loop() { cx += (mx - cx) * .22; cy += (my - cy) * .22; cu.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(loop); })();
  document.addEventListener('pointermove', e => {
    $$('.slide.active .mag,.nav-btn,.slide.active .cta').forEach(m => {
      const r = m.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      m.style.transform = Math.hypot(dx, dy) < 90 ? `translate(${dx * .18}px,${dy * .22}px)` : '';
    });
  });
}

/* ================= SLIDE 1: hand over tasks ================= */
inits[0] = s => {
  if (fine) $('.swipe-hint', s).textContent = 'press → to begin';
  const eng = $('#hoEngine'), cnt = $('#hoCount'); let n = 0;
  $$('.chip.task', s).forEach(ch => ch.addEventListener('click', () => {
    if (ch.classList.contains('gone')) return;
    const r = ch.getBoundingClientRect(), er = eng.getBoundingClientRect();
    ch.classList.add('gone');
    if (!reduced) {
      const f = ch.cloneNode(true); f.classList.remove('gone'); f.classList.add('flying', 'on');
      Object.assign(f.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px' });
      document.body.append(f);
      requestAnimationFrame(() => requestAnimationFrame(() => Object.assign(f.style, { left: (er.left + er.width / 2 - r.width / 2) + 'px', top: (er.top + er.height / 2 - r.height / 2) + 'px', transform: 'scale(.25)', opacity: '0' })));
      setTimeout(() => f.remove(), 800);
    }
    setTimeout(() => {
      cnt.textContent = ++n; eng.classList.remove('pulse'); void eng.offsetWidth; eng.classList.add('pulse');
      if (n === 6) $('#hoDone').classList.add('show');
    }, reduced ? 0 : 650);
  }));
};

/* ================= SLIDE 2: flip cards ================= */
inits[1] = s => {
  const flips = $$('.flip', s);
  flips.forEach(f => f.addEventListener('click', () => {
    f.setAttribute('aria-pressed', f.getAttribute('aria-pressed') !== 'true');
    if (flips.filter(x => x.getAttribute('aria-pressed') === 'true').length >= 2) $('#flipSum').classList.add('show');
  }));
};

/* ================= SLIDE 3: why now console ================= */
let nowTok = 0;
const nowRuns = {
  async read(con, tok) {
    con.innerHTML = '<div class="msg">Hi! My daughter Ananya wants to join Grade 6 next year. Can we visit the campus on Saturday morning? Thanks, Priya</div><div class="arrow">AI reading the message</div>';
    const f = [['Parent', 'Priya'], ['Student', 'Ananya'], ['Class', 'Grade 6, next year'], ['Intent', 'Campus visit'], ['Preferred slot', 'Saturday morning'], ['Next step', 'Visit booked, counsellor notified']];
    const dl = el('dl', 'kv'); f.forEach(([k]) => dl.append(el('dt', '', k), el('dd'))); con.append(dl);
    await wait(700);
    const dds = $$('dd', dl);
    for (let i = 0; i < f.length; i++) { if (tok !== nowTok) return; await wait(380); dds[i].textContent = f[i][1]; dds[i].classList.add('fill'); }
  },
  async write(con, tok) {
    con.innerHTML = '<div class="msg">Task: thank the parent after today\'s campus visit and share the next steps.</div><div class="arrow">AI drafting</div>';
    const p = el('div', 'typed'); const caret = el('span', 'caret'); con.append(p, caret);
    const txt = "Dear Priya,\n\nThank you for visiting us with Ananya today. As promised, I have attached the Grade 6 admission details and the next steps.\n\nShall I reserve a time for the admissions conversation this week?\n\nWarm regards,\nAdmissions team";
    await wait(500);
    for (let i = 0; i <= txt.length; i += 2) { if (tok !== nowTok) return; p.textContent = txt.slice(0, i); await wait(14); }
    p.textContent = txt; caret.remove();
    con.append(el('p', 'micro', '<br>Drafted in your tone. Waiting for your approval before it is sent.'));
  },
  async connect(con, tok) {
    con.innerHTML = '<div class="arrow">One enquiry, every system updated</div>';
    const steps = [['Website form', 'enquiry received'], ['CRM', 'record created'], ['Assignment rules', 'counsellor assigned'], ['WhatsApp', 'parent acknowledged'], ['Owner dashboard', 'updated live']];
    const box = el('div', 'nodes'); steps.forEach(([a, b]) => box.append(el('div', 'node', `<i></i>${a}<small>${b}</small>`))); con.append(box);
    for (const n of $$('.node', box)) { await wait(520); if (tok !== nowTok) return; n.classList.add('lit'); }
  }
};
let nowKey = 'read';
function runNow() { const tok = ++nowTok; nowRuns[nowKey]($('#nowConsole'), tok); }
inits[2] = () => {
  $$('#nowTabs button').forEach(b => b.addEventListener('click', () => {
    $$('#nowTabs button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
    nowKey = b.dataset.k; runNow();
  }));
};
enters[2] = runNow;
leaves[2] = () => nowTok++;

/* ================= SLIDE 4: before / after ================= */
const BEFORE = [['✉', 'Enquiry lands in an inbox or on a phone', 'waits'], ['⌨', 'Someone types it into Excel', 'retyped'], ['☏', 'Forwarded to a manager on WhatsApp', 'unseen'], ['⏱', 'Manager assigns it, when free', 'waits'], ['☎', 'Salesperson calls back', 'late'], ['✎', 'Follow-up depends on memory', 'missed'], ['▦', 'Status chased for the weekly meeting', 'stale']];
const AFTER = [['⇣', 'Captured automatically from every channel', 'instant'], ['⇄', 'Assigned by your rules', 'instant'], ['✓', 'Client acknowledged, follow-ups scheduled', 'auto'], ['◉', 'Dashboard updates itself', 'live']];
let baAuto = null, baTouched = false;
function renderBA(auto) {
  const fl = $('#baFlow'); fl.className = 'flow' + (auto ? ' auto' : ''); fl.innerHTML = '';
  (auto ? AFTER : BEFORE).forEach(([ic, t, w], i) => { const li = el('li', 'in', `<span class="ic">${ic}</span><span>${t}</span><span class="wait">${w}</span>`); li.style.animationDelay = (i * 70) + 'ms'; fl.append(li); });
  if (auto && !reduced) fl.append(el('span', 'dot'));
  let note = fl.parentElement.querySelector('.flow-note'); if (!note) { note = el('p', 'flow-note'); fl.after(note); }
  note.innerHTML = auto ? 'Four steps. <em>None of them wait for a person.</em>' : 'Seven hand-offs. <em>Every one can stall.</em>';
  $('#baToggle').setAttribute('aria-checked', auto);
}
inits[3] = () => {
  const t = $('#baToggle'); renderBA(false);
  const flipIt = () => { baTouched = true; renderBA(t.getAttribute('aria-checked') !== 'true'); };
  t.addEventListener('click', flipIt);
  t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); flipIt(); } });
};
enters[3] = () => { if (!baTouched) baAuto = setTimeout(() => { if (!baTouched && cur === 3) renderBA(true); }, 2600); };
leaves[3] = () => clearTimeout(baAuto);

/* ================= SLIDE 5: how we work ================= */
const STAGES = [
  ['Discover', 'We sit with your team and map how work actually moves, including the workarounds nobody writes down.', 'A process map and a ranked list of what to automate first.'],
  ['Design', 'Screens, flows and rules shaped around your people and the way they already work.', 'A clickable prototype your team can try before we build.'],
  ['Build', 'We build in short cycles and show working software as we go, on your real processes.', 'Working software early, not a big reveal at the end.'],
  ['Launch', 'Data migration, training and a calm go-live, with us beside your team.', 'Your team using it from day one, not just owning it.'],
  ['Improve', 'We watch how it is used and keep automating the next thing that slows you down.', 'A system that gets better as your business grows.']];
let stage = 0;
function setStage(i) {
  stage = Math.max(0, Math.min(4, i));
  $$('#track button').forEach((b, k) => { b.classList.toggle('on', k === stage); b.classList.toggle('done', k < stage); });
  $('#trackFill').style.width = (stage / 4 * 100) + '%';
  const [h, p, g] = STAGES[stage];
  $('#stageCard').innerHTML = `<div class="anim"><div class="sc-n">0${stage + 1}</div><h3>${h}</h3><p>${p}</p><div class="get"><b>You get</b>${g}</div></div>`;
}
inits[4] = () => {
  $$('#track button').forEach(b => b.addEventListener('click', () => setStage(+b.dataset.i)));
  const c = $('#stageCard'); let x0 = 0, swiped = false;
  c.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; swiped = false; }, { passive: true });
  c.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) { swiped = true; setStage(stage + (dx < 0 ? 1 : -1)); } }, { passive: true });
  c.addEventListener('click', () => { if (!swiped) setStage(stage === 4 ? 0 : stage + 1); swiped = false; });
  setStage(0);
};

/* ================= SLIDE 6: Carun Workspace ================= */
const ws = { role: 0, tab: 'tasks', badge: 0 };
const ROLES = [['Owner', ['tasks', 'approvals', 'hiring', 'review', 'interviews', 'invoice']], ['Manager', ['tasks', 'approvals', 'review', 'interviews']], ['Designer', ['tasks', 'approvals']], ['HR', ['tasks', 'hiring', 'review', 'interviews']]];
const TABNAME = { tasks: 'Tasks', approvals: 'Approvals', hiring: 'Hiring', review: 'Client review', interviews: 'Interviews', invoice: 'Invoices' };
let toastT;
function wsToast(m) { const t = $('#wsToast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
function notify(m) { ws.badge++; const b = $('#wsBadge'); b.textContent = ws.badge; b.classList.add('show'); wsToast('🔔 ' + m); }
const TASKS = [['Diwali campaign creatives', 'Design · due Fri', 'DS', 1], ['Landing page copy', 'Writing · due Mon', 'WR', 0], ['Client strategy deck', 'Manager · due Wed', 'MG', 2], ['Onboard new designer', 'HR · due Thu', 'HR', 0]];
const TST = ['To do', 'In progress', 'In review', 'Done'];
const POSTS = [['Tue', 'Instagram', 'Diwali greetings creative', 'linear-gradient(135deg,#6B7A2A,#2a2e1c 60%,#D35400)'], ['Thu', 'LinkedIn', 'Founder note: why we automate', 'linear-gradient(135deg,#1A1A1A,#6B6B6B)'], ['Sat', 'Instagram', 'Behind-the-scenes reel', 'linear-gradient(135deg,#D93A4B,#1A1A1A 70%)']];
let postI = 0, postSt = ['Pending', 'Pending', 'Pending'];
const CANDS = [['Candidate A', 'Graphic Designer · 3 yrs'], ['Candidate B', 'Motion Designer · 5 yrs'], ['Candidate C', 'Visual Designer · 2 yrs']];
let candSt = [null, null, null];
const SVC = [['Management consulting', '998311'], ['IT design & development', '998314'], ['Recruitment (permanent placement)', '998512']];
const inv = { lines: [[0, 1, 150000], [1, 1, 80000]], inter: false, cn: false };
let hired = false;
const SLOT_T = ['10:00', '12:00', '15:00', '17:00'], DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
let slots = null, meetAt = null;

const wsScreens = {
  tasks(b) {
    b.innerHTML = '<div class="sec-h">This week <span>Tap a task to move it on</span></div>';
    const l = el('div', 'lst anim');
    TASKS.forEach(t => {
      const it = el('button', 'item', `<span class="avatar">${t[2]}</span><span class="grow"><b>${t[0]}</b><small>${t[1]}</small></span><span class="pill s${t[3]}">${TST[t[3]]}</span>`);
      it.addEventListener('click', () => {
        t[3] = (t[3] + 1) % 4; const p = $('.pill', it); p.className = 'pill s' + t[3]; p.textContent = TST[t[3]];
        if (t[3] === 2) notify('Owner asked to review "' + t[0] + '"'); else if (t[3] === 3) wsToast('✓ Done. Logged to the client timeline');
      });
      l.append(it);
    });
    b.append(l);
    b.append(el('p', 'muted', '<br><small>Every move is logged, and the right person is notified for review.</small>'));
  },
  approvals(b) {
    b.innerHTML = '<div class="sec-h">Social calendar · November <span>Client approval</span></div>';
    const wrap = el('div', 'anim');
    if (postI < POSTS.length) {
      const [d, ch, t, art] = POSTS[postI];
      wrap.append(el('div', 'post', `<div class="art" style="background:${art}"><span class="stamp" id="stamp">APPROVED</span></div><div class="grow"><small class="muted">${d} · ${ch}</small><b style="display:block;font-family:var(--serif);font-size:18px;line-height:1.15;margin:4px 0 10px">${t}</b><div class="row"><button class="btn ok" id="apOk">Approve</button><button class="btn no" id="apNo">Request changes</button></div></div>`));
    } else wrap.append(el('div', 'post', '<div class="grow"><b>Calendar signed off.</b><br><small class="muted">The team has been notified and posts are scheduled.</small><br><br><button class="btn" id="apReset">Reset demo</button></div>'));
    const l = el('div', 'lst'); l.style.marginTop = '10px';
    POSTS.forEach((p, i) => l.append(el('div', 'item', `<span class="grow"><b>${p[2]}</b><small>${p[0]} · ${p[1]}</small></span><span class="pill ${postSt[i] === 'Approved' ? 's3' : postSt[i] === 'Changes' ? 's1' : 's0'}">${postSt[i]}</span>`)));
    wrap.append(l); b.append(wrap);
    const act = ok => { const s = $('#stamp', b); s.textContent = ok ? 'APPROVED' : 'CHANGES'; s.classList.toggle('chg', !ok); s.classList.add('show'); postSt[postI] = ok ? 'Approved' : 'Changes'; notify(ok ? 'Client approved "' + POSTS[postI][2] + '"' : 'Designer notified: changes requested'); $$('.btn', b).forEach(x => x.disabled = true); setTimeout(() => { postI++; if (ws.tab === 'approvals') wsScreens.approvals(b); }, 900); };
    $('#apOk', b)?.addEventListener('click', () => act(true));
    $('#apNo', b)?.addEventListener('click', () => act(false));
    $('#apReset', b)?.addEventListener('click', () => { postI = 0; postSt = ['Pending', 'Pending', 'Pending']; wsScreens.approvals(b); });
  },
  hiring(b) {
    b.innerHTML = '<div class="sec-h">New application <span>AI résumé reading</span></div>';
    const w = el('div', 'anim');
    w.innerHTML = `<div class="resume"><div class="ln h"></div><div class="ln" style="width:40%"></div><div class="ln"></div><div class="ln" style="width:85%"></div><div class="ln" style="width:70%"></div><div class="ln"></div><div class="ln" style="width:60%"></div><div class="scan" id="scan"></div></div>
      <div class="form">${[['Name', 'Candidate A (demo)'], ['Role', 'Graphic Designer'], ['Experience', '3 years'], ['Location', 'Bengaluru'], ['Skills', 'Figma · Illustrator · After Effects', 1], ['Email', 'candidate@example.com', 1]].map(([k, v, f]) => `<div class="field${f ? ' full' : ''}" data-v="${v}"><label>${k}</label><span></span></div>`).join('')}</div>
      <div class="row" style="margin-top:10px;justify-content:space-between"><button class="btn pri" id="readCv">Read résumé with AI</button><span class="pill s0" id="cvStage">Applied</span></div>`;
    b.append(w);
    const fields = $$('.field', w), stg = $('#cvStage', w);
    const done = () => { stg.textContent = 'Screening'; stg.className = 'pill s2'; };
    if (hired) { fields.forEach(f => { f.classList.add('fill'); $('span', f).textContent = f.dataset.v; }); done(); $('#readCv', w).disabled = true; }
    $('#readCv', w).addEventListener('click', async e => {
      e.currentTarget.disabled = true; $('#scan', w).classList.add('go'); await wait(900);
      for (const f of fields) { await wait(220); f.classList.add('fill'); $('span', f).textContent = f.dataset.v; }
      done(); hired = true; notify('Profile auto-filled. HR notified');
    });
  },
  review(b) {
    b.innerHTML = '<div class="sec-h">Client view <span>🔒 Secure link · watermarked</span></div>';
    const l = el('div', 'lst anim');
    CANDS.forEach((c, i) => {
      const it = el('div', 'item wm', `<span class="avatar" style="background:#6B6B6B">${'ABC'[i]}</span><span class="grow"><b>${c[0]}</b><small>${c[1]}</small></span><span class="row" style="flex-wrap:nowrap;gap:5px"></span>`);
      it.dataset.wm = 'CONFIDENTIAL · DEMO CLIENT   CONFIDENTIAL · DEMO CLIENT\nCONFIDENTIAL · DEMO CLIENT   CONFIDENTIAL · DEMO CLIENT';
      const r = $('.row', it);
      const paint = () => { r.innerHTML = candSt[i] ? `<span class="pill ${candSt[i] === 'Shortlisted' ? 's3' : 's1'}">${candSt[i]}</span>` : '<button class="btn ok">Shortlist</button><button class="btn no" aria-label="Reject">✕</button>'; $$('button', r).forEach((bt, k) => bt.addEventListener('click', () => { candSt[i] = k ? 'Rejected' : 'Shortlisted'; paint(); notify('Client ' + (k ? 'rejected ' : 'shortlisted ') + c[0]); })); };
      paint(); l.append(it);
    });
    b.append(l);
    b.append(el('p', 'muted', '<br><small>Profiles carry the client\'s watermark. Decisions flow straight back into the hiring pipeline.</small>'));
    const rs = el('button', 'btn', 'Reset'); rs.style.marginTop = '8px'; rs.addEventListener('click', () => { candSt = [null, null, null]; wsScreens.review(b); }); b.append(rs);
  },
  interviews(b) {
    if (!slots) { slots = DAYS.map((d, i) => SLOT_T.map((t, k) => ((i * 4 + k) % 5 === 1 || (i + k) % 7 === 3) ? 'busy' : '')); meetAt = null; }
    b.innerHTML = '<div class="sec-h">Client availability <span>Tap times that suit you</span></div>';
    const w = el('div', 'anim'); const g = el('div', 'cal');
    g.append(el('span', 'h', '')); DAYS.forEach(d => g.append(el('span', 'h', d)));
    const upd = () => go.disabled = !slots.flat().includes('av');
    SLOT_T.forEach((t, k) => { g.append(el('span', 't', t)); DAYS.forEach((d, i) => { const s = el('button', 'slot ' + slots[i][k], slots[i][k] === 'booked' ? 'Meet' : ''); s.setAttribute('aria-label', d + ' ' + t); s.addEventListener('click', () => { if (slots[i][k] === 'busy' || slots[i][k] === 'booked') return; slots[i][k] = slots[i][k] === 'av' ? '' : 'av'; s.className = 'slot ' + slots[i][k]; upd(); }); g.append(s); }); });
    w.append(g);
    const row = el('div', 'row'); row.style.marginTop = '10px'; row.style.justifyContent = 'space-between';
    const go = el('button', 'btn pri', 'Schedule interview'); const rs = el('button', 'btn', 'Reset');
    row.append(go, rs); w.append(row);
    const meet = el('div', 'meet'); w.append(meet); b.append(w);
    if (meetAt) { meet.innerHTML = `<span class="avatar" style="background:#1a73e8">▶</span><span class="grow"><b>Interview · ${DAYS[meetAt[0]]} ${SLOT_T[meetAt[1]]}</b><small>Google Meet link created · meet.google.com/demo-link</small></span>`; meet.classList.add('show'); }
    upd();
    go.addEventListener('click', () => {
      let best = null;
      for (let i = 0; i < 5 && !best; i++) for (let k = 0; k < 4 && !best; k++) if (slots[i][k] === 'av') best = [i, k];
      if (!best) return;
      slots = slots.map(r => r.map(v => v === 'av' || v === 'booked' ? '' : v)); slots[best[0]][best[1]] = 'booked'; meetAt = best;
      wsScreens.interviews(b);
      notify('Invites sent to client and candidate');
    });
    rs.addEventListener('click', () => { slots = null; wsScreens.interviews(b); });
  },
  invoice(b) {
    b.innerHTML = '';
    const w = el('div', 'inv anim');
    const top = el('div', 'row'); top.style.justifyContent = 'space-between'; top.style.marginBottom = '8px';
    top.innerHTML = '<div><b style="font-family:var(--serif);font-size:18px">Tax invoice</b><br><small class="muted">INV-DEMO-014 · Demo client</small></div>';
    const pos = el('div', 'pos', '<button data-p="0">Karnataka</button><button data-p="1">Other state</button>'); top.append(pos); w.append(top);
    const lines = el('div', 'lst'); w.append(lines);
    const btns = el('div', 'row'); btns.style.marginTop = '8px';
    const add = el('button', 'btn', '+ Add line');
    const cnBtn = el('button', 'btn no', 'Issue credit note');
    btns.append(add, cnBtn);
    const tot = el('div', 'tot'); w.append(tot); w.append(btns);
    const cn = el('div', 'cn'); w.append(cn); b.append(w);
    function totals(flash) {
      const sub = inv.lines.reduce((a, l) => a + l[1] * l[2], 0);
      const g = sub * .18;
      tot.innerHTML = `<span>Taxable value</span><span>${inr(sub)}</span>` + (inv.inter ? `<span>IGST 18%</span><span>${inr(g)}</span>` : `<span>CGST 9%</span><span>${inr(g / 2)}</span><span>SGST 9%</span><span>${inr(g / 2)}</span>`) + `<span class="big">Total</span><span class="big">${inr(sub + g)}</span>`;
      if (flash) { tot.classList.remove('flash'); void tot.offsetWidth; tot.classList.add('flash'); }
      if (inv.cn) cn.innerHTML = `<b>Credit note CN-DEMO-003</b> against INV-DEMO-014 for ${inr(sub + g)}, with GST reversed line by line.`;
      cn.classList.toggle('show', inv.cn);
      $$('button', pos).forEach(x => x.classList.toggle('on', +x.dataset.p === +inv.inter));
    }
    const num = v => Math.max(0, Math.min(99999999, parseInt(String(v).replace(/\D/g, ''), 10) || 0));
    function draw() {
      lines.innerHTML = '';
      inv.lines.forEach(l => {
        const r = el('div', 'item'); r.style.flexDirection = 'column'; r.style.alignItems = 'stretch'; r.style.gap = '6px';
        r.innerHTML = `<div class="row" style="flex-wrap:nowrap"><select aria-label="Service">${SVC.map((s, k) => `<option value="${k}"${k === l[0] ? ' selected' : ''}>${s[0]}</option>`).join('')}</select><span class="sac">SAC ${SVC[l[0]][1]}</span></div>
          <div class="row" style="flex-wrap:nowrap"><label class="muted" style="font-size:11px">Qty</label><input class="qty" inputmode="numeric" value="${l[1]}" aria-label="Quantity"><label class="muted" style="font-size:11px">Rate&nbsp;₹</label><input class="rate" inputmode="numeric" value="${l[2]}" aria-label="Rate"><b style="margin-left:auto;font-size:12.5px;white-space:nowrap" class="amt">${inr(l[1] * l[2])}</b></div>`;
        $('select', r).addEventListener('change', e => { l[0] = +e.target.value; const s = $('.sac', r); s.textContent = 'SAC ' + SVC[l[0]][1]; s.animate([{ background: '#d6e0b0' }, { background: '#f0f3e4' }], 600); wsToast('SAC code set automatically'); });
        $('.qty', r).addEventListener('input', e => { l[1] = num(e.target.value); $('.amt', r).textContent = inr(l[1] * l[2]); totals(true); });
        $('.rate', r).addEventListener('input', e => { l[2] = num(e.target.value); $('.amt', r).textContent = inr(l[1] * l[2]); totals(true); });
        lines.append(r);
      });
      add.style.display = inv.lines.length >= 3 ? 'none' : '';
      totals();
    }
    $$('button', pos).forEach(x => x.addEventListener('click', () => { inv.inter = x.dataset.p === '1'; totals(true); wsToast(inv.inter ? 'Inter-state supply: IGST applied' : 'Intra-state supply: CGST + SGST applied'); }));
    add.addEventListener('click', () => { inv.lines.push([2, 1, 60000]); draw(); });
    cnBtn.textContent = inv.cn ? 'Cancel credit note' : 'Issue credit note';
    cnBtn.addEventListener('click', () => { inv.cn = !inv.cn; cnBtn.textContent = inv.cn ? 'Cancel credit note' : 'Issue credit note'; totals(); if (inv.cn) notify('Credit note raised. Accounts notified'); });
    draw();
  }
};
function wsShow(t) {
  const allowed = ROLES[ws.role][1];
  if (!allowed.includes(t)) { wsToast('🔒 ' + ROLES[ws.role][0] + ' role cannot open ' + TABNAME[t]); return; }
  ws.tab = t;
  $$('#wsTabs button').forEach(b => { b.classList.toggle('on', b.dataset.t === t); b.setAttribute('aria-selected', b.dataset.t === t); });
  wsScreens[t]($('#wsBody'));
}
inits[5] = () => {
  $$('#wsTabs button').forEach(b => b.addEventListener('click', () => { wsShow(b.dataset.t); const tb = $('#wsTabs'); tb.scrollTo({ left: b.offsetLeft - tb.clientWidth / 2 + b.offsetWidth / 2, behavior: reduced ? 'auto' : 'smooth' }); }));
  $('#wsRole').addEventListener('click', () => {
    ws.role = (ws.role + 1) % ROLES.length; const [name, allowed] = ROLES[ws.role];
    $('#wsRole').textContent = name + ' ▾';
    $$('#wsTabs button').forEach(b => b.classList.toggle('locked', !allowed.includes(b.dataset.t)));
    if (!allowed.includes(ws.tab)) wsShow('tasks');
    wsToast('Viewing as ' + name + ' · ' + allowed.length + ' of 6 areas');
  });
  $('#wsBell').addEventListener('click', () => { ws.badge = 0; $('#wsBadge').classList.remove('show'); wsToast('All notifications read'); });
  wsShow('tasks');
};

/* ================= SLIDE 7: Nalapad CRM ================= */
const KIDS = [['Aarav S.', 'Grade 2'], ['Diya H.', 'Early Years'], ['Kabir M.', 'Grade 6'], ['Myra R.', 'Grade 9'], ['Vihaan I.', 'Grade 4'], ['Sana Q.', 'Grade 11'], ['Ishaan N.', 'Grade 1'], ['Zara K.', 'Grade 7']];
const COUNS = ['Sneha M', 'Rahul K', 'Farah S'];
let crmN = 0, crmBusy = false;
function crmCounts() { $$('#crmKan .col').forEach(c => $('h5 b', c).textContent = $$('.kc', c).length); }
function crmAdd(src) {
  const [kid, cls] = KIDS[crmN % KIDS.length]; const id = 'ENQ-' + (1025 + crmN); const dup = crmN % 4 === 3;
  const cn = COUNS[crmN % 3]; crmN++;
  const card = el('div', 'kc', `<b>${kid} · ${cls}</b><small>${id} · ${cn} (round robin)</small><span class="tag">${src}</span>${dup ? '<span class="dup">⚠ Possible duplicate: phone seen before</span>' : ''}`);
  const cols = $$('#crmKan .col .cards');
  cols[0].prepend(card);
  const news = $$('.kc', cols[0]);
  if (news.length > 3) {
    const old = news[news.length - 1]; old.remove(); const s = $('small', old); s.textContent = s.textContent.split(' · ')[0] + ' · first call logged'; cols[1].prepend(old);
    const fu = $$('.kc', cols[1]);
    if (fu.length > 3) { const o2 = fu[fu.length - 1]; o2.remove(); $('small', o2).textContent = $('small', o2).textContent.split(' · ')[0] + ' · visit booked'; $('.dup', o2)?.remove(); cols[2].prepend(o2); const w = $$('.kc', cols[2]); if (w.length > 2) w[w.length - 1].remove(); }
  }
  crmCounts();
}
function crmSend(btn, i) {
  const pipes = $('.pipes'), pulse = $('#crmPulse'), path = $$('#crmPipes path')[i];
  btn.classList.add('hit'); setTimeout(() => btn.classList.remove('hit'), 500);
  if (reduced || !path.getTotalLength) { crmAdd(btn.dataset.s); return; }
  const W = pipes.clientWidth, H = pipes.clientHeight, L = path.getTotalLength();
  const kf = []; for (let k = 0; k <= 14; k++) { const p = path.getPointAtLength(L * k / 14); kf.push({ left: (p.x / 400 * W) + 'px', top: (p.y / 70 * H) + 'px', opacity: k === 14 ? 0 : 1 }); }
  const p2 = pulse.cloneNode(); p2.removeAttribute('id'); pipes.append(p2);
  p2.animate(kf, { duration: 650, easing: 'ease-in' }).onfinish = () => { p2.remove(); crmAdd(btn.dataset.s); };
}
inits[6] = () => {
  $$('#crmSrc button').forEach((b, i) => b.addEventListener('click', () => crmSend(b, i)));
};
enters[6] = async () => { if (crmN || crmBusy) return; crmBusy = true; const bs = $$('#crmSrc button'); await wait(300); crmSend(bs[0], 0); await wait(900); if (cur === 6) crmSend(bs[1], 1); crmBusy = false; };

/* ================= SLIDE 8: Nalapad Group ================= */
let grpP = 1, grpTab = 'group';
const PF = [.92, 1, 1.06];
const UNITS = [['Nalapad Academy', 'Indiranagar, Bengaluru', 'a', .9, 'school'], ['Hotel Nalapad Bangalore Intl.', 'Bengaluru', 'a', .86, 'hotels'], ['Hotel Nalapad Mangalore', 'Mangaluru', 'g', .98, 'hotels'], ['Cafés', 'Blanc · Burgers & Strawberries', 'a', .88, 'cafes'], ['Plantations', 'Cacao · arecanut · coffee · coconut', 'r', .74, 'plant'], ['Green Chapters', 'Landscaping', 'g', .95, 'green']];
const RAGT = { g: 'On track', a: 'Watch', r: 'Off track' };
const CROPS = { cacao: ['Cacao', '#7a4a2a'], areca: ['Arecanut', '#6B7A2A'], coffee: ['Coffee', '#3e2c22'], coco: ['Coconut', '#a9b85c'] };
const PLOTS = [['A', 'areca', 'M10 10 H120 V90 H10Z'], ['B', 'areca', 'M125 10 H220 V70 H125Z'], ['C', 'coffee', 'M225 10 H310 V110 H225Z'], ['D', 'cacao', 'M10 95 H90 V190 H10Z'], ['E', 'coco', 'M95 95 H220 V150 H95Z'], ['F', 'coffee', 'M95 155 H180 V190 H95Z'], ['G', 'cacao', 'M185 155 H310 V190 H185Z'], ['H', 'coco', 'M225 115 H310 V150 H225Z'], ['I', 'areca', 'M125 75 H220 V90 H125Z']];
const PLOTNOTE = ['Yield log updated this morning', 'Inspection due this week', 'Harvest crew scheduled', 'Irrigation check logged', 'Pest scouting report filed'];
const fillBars = (root, f) => requestAnimationFrame(() => requestAnimationFrame(() => $$('[data-w]', root).forEach(i => i.style.width = Math.min(100, i.dataset.w * f * 100) + '%')));
const grpScreens = {
  group(b) {
    const t = el('div', 'tiles anim');
    UNITS.forEach(u => { const x = el('button', 'tile', `<span class="rag ${u[2]}">${RAGT[u[2]]}</span><b>${u[0]}</b><small>${u[1]}</small><span class="bar"><i data-w="${u[3]}" style="background:${u[2] === 'g' ? '#4f8a2e' : u[2] === 'a' ? '#d9a23a' : '#c9424f'}"></i></span><small>vs plan · demo</small>`); x.addEventListener('click', () => grpShow(u[4])); t.append(x); });
    b.append(t); fillBars(t, PF[grpP]);
  },
  school(b) {
    const w = el('div', 'anim'); w.innerHTML = '<div class="sec-h">Nalapad Academy · admissions journey <span>demo</span></div>';
    const f = el('div', 'funnel'); [['Enquiry', 1], ['Counselling', .66], ['Application', .4], ['Confirmation', .24]].forEach(([k, v]) => f.append(el('div', '', `<span>${k}</span><i data-w="${v * .62}"></i>`)));
    w.append(f); w.append(el('p', 'muted', '<br><small>Fed by the admissions CRM: every stage change updates this view.</small>')); b.append(w); fillBars(f, PF[grpP]);
  },
  hotels(b) {
    const w = el('div', 'anim'); w.innerHTML = '<div class="sec-h">Hotels · occupancy <span>demo</span></div>';
    const g = el('div', 'gauge');
    [['Bangalore Intl.', .71], ['Mangalore', .78]].forEach(([n, v]) => { const val = Math.min(.97, v * PF[grpP]); g.append(el('div', 'g', `<svg viewBox="0 0 120 70"><path d="M10 64 A50 50 0 0 1 110 64" fill="none" stroke="#eee" stroke-width="10" stroke-linecap="round"/><path class="arc" d="M10 64 A50 50 0 0 1 110 64" fill="none" stroke="#6B7A2A" stroke-width="10" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" style="transition:stroke-dashoffset 1.1s cubic-bezier(.22,.8,.2,1)" data-v="${val}"/></svg><b style="font-family:var(--serif);font-size:16px">${n}</b><br><small class="muted">Occupancy · demo</small>`)); });
    w.append(g); w.append(el('p', 'muted', '<br><small>Rooms, F&amp;B and corporate blocks roll up from each property, every day.</small>')); b.append(w);
    requestAnimationFrame(() => requestAnimationFrame(() => $$('.arc', g).forEach(a => a.style.strokeDashoffset = 100 - a.dataset.v * 100)));
  },
  cafes(b) {
    const w = el('div', 'anim'); w.innerHTML = '<div class="sec-h">Cafés side by side <span>demo</span></div>';
    let h = '<div class="row" style="gap:14px;margin-bottom:8px;font-size:11px"><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#1A1A1A"></i> Blanc</span><span><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#D93A4B"></i> Burgers &amp; Strawberries</span></div>';
    [['Covers', .8, .64], ['Average bill', .6, .72], ['Food cost', .45, .7]].forEach(([k, a, c]) => h += `<div style="margin:8px 0"><small class="muted">${k}</small><div class="bar" style="height:10px;margin:4px 0"><i data-w="${a}" style="background:#1A1A1A"></i></div><div class="bar" style="height:10px"><i data-w="${c}" style="background:#D93A4B"></i></div></div>`);
    w.innerHTML += h; w.append(el('p', 'muted', '<small>Food cost above its line raises an alert for the owner.</small>')); b.append(w); fillBars(w, PF[grpP]);
  },
  plant(b) {
    const w = el('div', 'anim'); w.innerHTML = '<div class="sec-h">Plantations · around 100 acres <span>Tap a block</span></div>';
    w.innerHTML += `<svg class="plots" viewBox="0 0 320 200">${PLOTS.map(([n, c, d]) => `<path class="p" data-n="${n}" data-c="${c}" d="${d}" fill="${CROPS[c][1]}" tabindex="0" role="button" aria-label="Block ${n}"/>`).join('')}${PLOTS.map(([n, c, d]) => { const m = d.match(/M(\d+) (\d+)/); return `<text x="${+m[1] + 7}" y="${+m[2] + 16}" fill="#fff" font-size="12" font-weight="700" pointer-events="none">${n}</text>`; }).join('')}</svg><div class="legend">${Object.values(CROPS).map(([n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join('')}</div><div class="plot-info" id="plotInfo">Select a block to see its crop and latest field update.</div>`;
    b.append(w);
    $$('.p', w).forEach((p, k) => { const pick = () => { $$('.p', w).forEach(x => x.classList.remove('sel')); p.classList.add('sel'); $('#plotInfo').innerHTML = `<b>Block ${p.dataset.n} · ${CROPS[p.dataset.c][0]}</b><br><small class="muted">Demo: ${PLOTNOTE[k % PLOTNOTE.length]}</small>`; }; p.addEventListener('click', pick); p.addEventListener('keydown', e => { if (e.key === 'Enter') pick(); }); });
  },
  green(b) {
    const w = el('div', 'anim'); w.innerHTML = '<div class="sec-h">Green Chapters · projects <span>demo</span></div>';
    const l = el('div', 'lst');
    [['Hotel lobby & poolside landscape', 'For Hotel Bangalore Intl.', .7], ['Campus grounds upkeep', 'For Nalapad Academy', .45], ['Residential garden', 'External client', .9]].forEach(([n, s, v]) => l.append(el('div', 'item', `<span class="grow"><b>${n}</b><small>${s}</small><span class="bar" style="margin-top:6px"><i data-w="${v}" style="background:#4f8a2e"></i></span></span>`)));
    w.append(l); w.append(el('p', 'muted', '<br><small>Work for sister companies shows up as inter-company billing.</small>')); b.append(w); fillBars(l, PF[grpP]);
  }
};
function grpShow(g) {
  grpTab = g; $$('#grpTabs button').forEach(b => b.classList.toggle('on', b.dataset.g === g));
  const body = $('#grpBody'); body.innerHTML = '';
  const per = el('div', 'pos', ['Today', 'MTD', 'YTD'].map((p, i) => `<button data-p="${i}" class="${i === grpP ? 'on' : ''}">${p}</button>`).join('')); per.style.marginBottom = '10px';
  $$('button', per).forEach(x => x.addEventListener('click', () => { grpP = +x.dataset.p; grpShow(grpTab); }));
  body.append(per); grpScreens[g](body);
  $('#grpWaSheet').classList.remove('show');
  const tb = $('#grpTabs'), btn = $(`[data-g="${g}"]`, tb); tb.scrollTo({ left: btn.offsetLeft - tb.clientWidth / 2 + btn.offsetWidth / 2, behavior: reduced ? 'auto' : 'smooth' });
}
inits[7] = () => {
  $$('#grpTabs button').forEach(b => b.addEventListener('click', () => grpShow(b.dataset.g)));
  $('#grpWa').addEventListener('click', async () => {
    const sh = $('#grpWaSheet');
    sh.innerHTML = '<div class="wh"><span>WhatsApp · Group owner</span><button class="btn" id="waX">Close</button></div><div class="bub" id="waB"></div>';
    sh.classList.add('show'); $('#waX').addEventListener('click', () => sh.classList.remove('show'));
    const txt = 'Good evening. Today across the group (demo):\n• Academy: new enquiries in, walk-ins booked\n• Hotel BLR: corporate block confirmed\n• Cafés: food cost on watch at B&S\n• Plantations: Block B inspection due\nTap to open the dashboard.';
    const bub = $('#waB'); for (let i = 0; i <= txt.length; i += 3) { bub.textContent = txt.slice(0, i); await wait(12); if (!sh.classList.contains('show')) return; } bub.textContent = txt;
  });
  grpShow('group');
};

/* ================= SLIDE 9: Voltrix ================= */
const VX = { wallet: 1200, sel: -1, charging: false, timer: null, live: null, used: 0, slot: 0 };
const STNS = [['Indiranagar Hub', 30, 40, ['av', 'bu', 'av']], ['Koramangala', 60, 62, ['bu', 'bu', 'av']], ['Whitefield Plaza', 78, 34, ['av', 'av', 'of']], ['Old Airport Road', 40, 80, ['of', 'of', 'of']]];
const CONN = ['DC fast · CCS2', 'DC fast · CCS2', 'AC · Type 2'];
const STL = { av: 'Available', bu: 'Charging', of: 'Offline' };
const vxStatus = s => s[3].includes('av') ? 'av' : s[3].includes('bu') ? 'bu' : 'of';
function vxWallet(bump) { const w = $('#vxWallet'); w.textContent = 'Wallet ' + inr(VX.wallet); if (bump) { w.classList.add('bump'); setTimeout(() => w.classList.remove('bump'), 700); } }
function vxToast(m) { let t = $('.vtoast'); if (!t) { t = el('div', 'vtoast'); $('.ph-screen').append(t); } t.textContent = m; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2800); }
function vxPins() {
  const m = $('#vxMap'); $$('.pin', m).forEach(p => p.remove());
  STNS.forEach((s, i) => { const p = el('button', 'pin ' + vxStatus(s) + (i === VX.sel ? ' sel' : ''), '<i></i>'); p.style.left = s[1] + '%'; p.style.top = s[2] + '%'; p.setAttribute('aria-label', s[0] + ', ' + STL[vxStatus(s)]); p.addEventListener('click', () => vxOpen(i)); m.append(p); });
}
function vxSheet() {
  const sh = $('#vxSheet');
  if (VX.sel < 0) { sh.classList.remove('open'); sh.innerHTML = '<div class="grab"></div><h4>4 stations nearby</h4><small>Tap a pin · live status from the charging CMS</small>'; return; }
  const s = STNS[VX.sel], free = s[3].indexOf('av');
  sh.innerHTML = `<div class="grab"></div><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div><h4>${s[0]}</h4><small>Demo station · live status</small></div><button class="btn" id="vxX" aria-label="Close" style="background:#262a23;color:#ddd;border-color:#333">✕</button></div>
   <div class="cons">${s[3].map((c, k) => `<div class="con"><span>${CONN[k]}</span><span class="st ${c}">${STL[c]}</span></div>`).join('')}</div>
   <div class="amen"><span>☕ Café</span><span>💺 Massage chairs</span></div>
   <div class="chg${VX.charging ? ' show' : ''}" id="vxChg"><div class="bar"><i id="vxBar"></i></div><p><span id="vxKwh">0.0 kWh</span><span id="vxUsed">₹0 used</span></p></div>
   <button class="vx-btn${VX.charging ? ' stop' : ''}" id="vxGo" ${free < 0 && !VX.charging ? 'disabled style="opacity:.45"' : ''}>${VX.charging ? 'Stop charging' : free < 0 ? 'No charger free right now' : 'Start charging · hold ₹500'}</button>`;
  sh.classList.add('open');
  $('#vxX').addEventListener('click', () => { if (VX.charging) return vxToast('Stop the session first'); VX.sel = -1; vxPins(); vxSheet(); });
  $('#vxGo').addEventListener('click', () => VX.charging ? vxStop() : vxStart());
}
function vxOpen(i) { if (VX.charging && i !== VX.sel) return vxToast('Charging in progress at ' + STNS[VX.sel][0]); VX.sel = i; vxPins(); vxSheet(); }
function vxStart() {
  if (VX.wallet < 500) { VX.wallet += 1000; vxToast('Wallet topped up ₹1,000 (demo)'); }
  const s = STNS[VX.sel], k = s[3].indexOf('av'); if (k < 0) return; s[3][k] = 'bu'; VX.slot = k;
  VX.wallet -= 500; vxWallet(true); VX.charging = true; VX.used = 0; vxSheet(); vxPins();
  vxToast('₹500 held from wallet. Session started');
  let kwh = 0; const rate = 18;
  VX.timer = setInterval(() => { kwh += .6; const used = Math.round(kwh * rate); const bar = $('#vxBar'); if (!bar) return; bar.style.width = Math.min(100, used / 5) + '%'; $('#vxKwh').textContent = kwh.toFixed(1) + ' kWh'; $('#vxUsed').textContent = inr(used) + ' used'; VX.used = used; if (used >= 480) vxStop(); }, reduced ? 60 : 220);
}
function vxStop() {
  clearInterval(VX.timer); if (!VX.charging) return; const used = VX.used || 0, refund = 500 - used; VX.used = 0;
  STNS[VX.sel][3][VX.slot] = 'av'; VX.charging = false; VX.wallet += refund; vxWallet(true); vxSheet(); vxPins();
  vxToast(`Session ended. Unused ${inr(refund)} refunded to wallet automatically`);
}
inits[8] = () => { vxWallet(); vxPins(); vxSheet(); $('#vxWallet').addEventListener('click', () => { VX.wallet += 500; vxWallet(true); vxToast('Topped up ₹500 (demo)'); }); $('#vxSheet').addEventListener('click', e => { if (VX.sel < 0 && !e.target.closest('button')) vxOpen(0); }); };
enters[8] = () => { clearInterval(VX.live); if (reduced) return; VX.live = setInterval(() => { const s = STNS[1 + Math.floor(Math.random() * 2)]; if (VX.charging && s === STNS[VX.sel]) return; const k = Math.floor(Math.random() * 2); s[3][k] = s[3][k] === 'av' ? 'bu' : 'av'; vxPins(); if (VX.sel >= 0 && STNS[VX.sel] === s) vxSheet(); }, 3500); };
leaves[8] = () => clearInterval(VX.live);

/* ================= SLIDE 10: Clean Cart ================= */
const TOWERS = ['A', 'B', 'C', 'D', 'E', 'F'], CDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
let ccGrid = null, ccLeave = false, ccTab = 'sched', ccRunning = false;
const SUBS = [['Flat A-1204', 'Monthly · exterior', 2], ['Flat C-0807', 'Monthly · full', 0], ['Flat B-0302', 'Quarterly · full', 12], ['Flat E-1101', 'Monthly · exterior', 1], ['Flat D-0609', 'Monthly · full', 21]];
let subSt = null;
const PILL = st => st === 'r' ? ['s3', 'Auto-renewed'] : st === 'm' ? ['s2', 'Reminder sent'] : ['s0', 'Active'];
function carSvg(body, glass, dirt) {
  return `<g transform="translate(30 50)"><path d="M10 70 Q12 48 40 44 L70 18 Q80 10 100 10 L150 10 Q168 10 180 22 L200 44 Q226 48 228 70 L228 80 L10 80Z" fill="${body}"/><path d="M78 22 Q84 16 98 16 L118 16 L118 44 L64 44Z M124 16 L148 16 Q160 16 170 26 L184 44 L124 44Z" fill="${glass}"/><circle cx="60" cy="82" r="16" fill="#222"/><circle cx="60" cy="82" r="7" fill="#888"/><circle cx="180" cy="82" r="16" fill="#222"/><circle cx="180" cy="82" r="7" fill="#888"/>${dirt ? '<g fill="#3d3a2a" opacity=".55"><circle cx="40" cy="66" r="6"/><circle cx="90" cy="58" r="4"/><circle cx="150" cy="64" r="7"/><circle cx="200" cy="60" r="5"/><circle cx="120" cy="30" r="5"/><circle cx="160" cy="28" r="3"/><ellipse cx="110" cy="74" rx="22" ry="4"/></g>' : '<path d="M150 18 l5 -8 l5 8 l-5 8z M95 26 l3 -5 l3 5 l-3 5z" fill="#fff" opacity=".9"/>'}</g>`;
}
const ccScreens = {
  sched(b) {
    b.innerHTML = '<div class="team"><span><i style="background:#6B7A2A"></i>Team 1</span><span><i style="background:#1A1A1A"></i>Team 2</span><span><i style="background:#D93A4B"></i>Team 3</span></div>';
    const g = el('div', 'ccgrid anim'); g.append(el('span', 'h', ''));
    CDAYS.forEach(d => g.append(el('span', 'h', d)));
    TOWERS.forEach((t, r) => { g.append(el('span', 't', 'Tower ' + t)); CDAYS.forEach((d, c) => { const v = ccGrid ? ccGrid[r][c] : -1; g.append(el('span', 'cell' + (v >= 0 ? ' m' + v : ''), v >= 0 ? String(v + 1) : '')); }); });
    b.append(g);
    const row = el('div', 'row'); row.style.marginTop = '10px';
    const go = el('button', 'btn pri', ccGrid ? 'Re-run schedule' : 'Auto-schedule the week'); const lv = el('button', 'btn', ccLeave ? 'Team 2 is back' : 'Team 2 on leave Thu');
    row.append(go, lv); b.append(row);
    const note = el('p', 'muted', '<small>Every tower, every day, one owner. Loads stay balanced, and residents are told their slot.</small>'); note.style.marginTop = '8px'; b.append(note);
    go.addEventListener('click', () => ccRun(b)); lv.addEventListener('click', () => { ccLeave = !ccLeave; ccRun(b); });
  },
  proof(b) {
    b.innerHTML = `<div class="ba" id="ccBa"><svg viewBox="0 0 300 170" preserveAspectRatio="xMidYMid slice"><rect width="300" height="170" fill="#dfe5ea"/><rect y="128" width="300" height="42" fill="#b9c0c6"/>${carSvg('#6B7A2A', '#cfe3f2', false)}</svg><svg class="dirty" viewBox="0 0 300 170" preserveAspectRatio="xMidYMid slice"><rect width="300" height="170" fill="#d9d4c9"/><rect y="128" width="300" height="42" fill="#b3ab9b"/>${carSvg('#5b5a3c', '#a9a99a', true)}</svg><span class="lab" style="left:8px">AFTER</span><span class="lab" style="right:8px">BEFORE</span><div class="handle"></div></div>
     <div class="ticket"><div class="row"><b>Tower C · Flat 0807 (demo)</b><span class="pill s1" id="tkSt">In progress</span></div><small class="muted">Full clean · Team 3 · Today</small><div class="row" style="margin-top:8px"><button class="btn ok" id="tkGo">Complete &amp; send photos</button></div></div>
     <p class="muted" style="margin-top:8px"><small>Drag across the photo. Before and after shots attach to the job, and the resident receives them.</small></p>`;
    const ba = $('#ccBa', b), dirty = $('.dirty', ba), h = $('.handle', ba);
    const setP = p => { p = Math.max(0, Math.min(100, p)); dirty.style.clipPath = `inset(0 0 0 ${p}%)`; h.style.left = p + '%'; };
    const set = x => { const r = ba.getBoundingClientRect(); setP((x - r.left) / r.width * 100); };
    let drag = false, iv;
    ba.addEventListener('pointerdown', e => { drag = true; clearInterval(iv); ba.setPointerCapture(e.pointerId); set(e.clientX); });
    ba.addEventListener('pointermove', e => drag && set(e.clientX));
    ba.addEventListener('pointerup', () => drag = false); ba.addEventListener('pointercancel', () => drag = false);
    if (!reduced) { let k = 0; iv = setInterval(() => { k++; setP(50 + Math.sin(k / 8) * 30); if (k > 50) clearInterval(iv); }, 30); }
    $('#tkGo', b).addEventListener('click', e => { const s = $('#tkSt', b); s.textContent = 'Done · photos sent'; s.className = 'pill s3'; e.currentTarget.disabled = true; e.currentTarget.textContent = '✓ Resident notified'; });
  },
  renew(b) {
    if (!subSt) subSt = SUBS.map(() => null);
    b.innerHTML = '<div class="sec-h">Subscriptions <span>renewals run daily</span></div>';
    const l = el('div', 'lst anim');
    SUBS.forEach((s, i) => { const [c, t] = PILL(subSt[i]); l.append(el('div', 'item', `<span class="grow"><b>${s[0]}</b><small>${s[1]} · ${s[2] === 0 ? 'renews today' : s[2] + (s[2] === 1 ? ' day' : ' days') + ' left'}</small></span><span class="pill ${c}">${t}</span>`)); });
    b.append(l);
    const row = el('div', 'row'); row.style.marginTop = '10px';
    const go = el('button', 'btn pri', "Run today's renewals"); const rs = el('button', 'btn', 'Reset'); row.append(go, rs); b.append(row);
    go.addEventListener('click', async () => { go.disabled = true; const pills = $$('.pill', l); for (let i = 0; i < SUBS.length; i++) { const d = SUBS[i][2]; subSt[i] = d === 0 ? 'r' : d <= 2 ? 'm' : null; await wait(260); const [c, t] = PILL(subSt[i]); pills[i].className = 'pill ' + c; pills[i].textContent = t; pills[i].animate([{ transform: 'scale(1.2)' }, { transform: 'none' }], 300); } });
    rs.addEventListener('click', () => { subSt = null; ccScreens.renew(b); });
  }
};
async function ccRun(b) {
  if (ccRunning) return; ccRunning = true;
  const g = TOWERS.map(() => CDAYS.map(() => -1)); const load = [0, 0, 0];
  const order = []; CDAYS.forEach((d, c) => TOWERS.forEach((t, r) => order.push([r, c])));
  for (const [r, c] of order) { const avail = [0, 1, 2].filter(x => !(ccLeave && x === 1 && c === 3)); let m = (r + c) % 3; if (!avail.includes(m)) m = avail.sort((a, z) => load[a] - load[z])[0]; g[r][c] = m; load[m]++; }
  ccGrid = TOWERS.map(() => CDAYS.map(() => -1));
  ccScreens.sched(b);
  const cells = $$('.cell', b);
  for (const [r, c] of order) { if (ccTab !== 'sched') break; ccGrid[r][c] = g[r][c]; const e = cells[r * 6 + c]; e.className = 'cell m' + g[r][c] + ' pop'; e.textContent = g[r][c] + 1; await wait(28); }
  ccGrid = g; ccRunning = false;
  if (ccTab === 'sched') $$('.btn', b)[0].textContent = 'Re-run schedule';
}
function ccShow(t) { ccTab = t; $$('#ccTabs button').forEach(b => b.classList.toggle('on', b.dataset.c === t)); ccScreens[t]($('#ccBody')); }
inits[9] = () => { $$('#ccTabs button').forEach(b => b.addEventListener('click', () => ccShow(b.dataset.c))); ccShow('sched'); };
enters[9] = () => { if (!ccGrid && ccTab === 'sched') ccRun($('#ccBody')); };

/* ================= SLIDE 11: benefits ================= */
const GL = ['Today', 'Twice the work', 'Three times', 'Four times', 'Five times'];
const NM = ['The team keeps up.', 'Hiring to keep pace.', 'A backlog builds. More hiring.', 'More people, more hand-offs, more errors.', 'Growth is now limited by headcount.'];
const NA = ['The team keeps up.', 'Same team. The system takes the extra load.', 'Same team, more time with clients.', 'Same team. Live data shows what needs attention.', 'Growth without proportional headcount.'];
const BEN = ['Hours spent moving data go back to clients, quality and strategy.', 'Data is entered once and flows everywhere. No retyping, no version drift.', 'Enquiries are acknowledged and assigned the moment they arrive.', "Decisions on today's numbers, not last month's spreadsheet.", 'Volume grows, the system scales, and the team stays focused.'];
function growth(v) {
  const r = $('#growth'); r.style.setProperty('--p', ((v - 1) / 4 * 100) + '%');
  $('#growthLab').textContent = GL[v - 1];
  const pm = $('#pplM'), pa = $('#pplA'), qm = $('#qM'), qa = $('#qA');
  pm.innerHTML = ''; for (let i = 0; i < 3 + (v - 1) * 2; i++) pm.append(el('i', i >= 3 ? 'new' : ''));
  pa.innerHTML = ''; for (let i = 0; i < 3; i++) pa.append(el('i'));
  qm.innerHTML = ''; for (let i = 0; i < Math.round(v * v * 2.4); i++) { const s = el('span'); s.style.animationDelay = (i * 12) + 'ms'; qm.append(s); }
  qa.innerHTML = ''; for (let i = 0; i < 4 + v; i++) { const s = el('span'); s.style.animationDelay = (i * 120) + 'ms'; qa.append(s); }
  $('#noteM').textContent = NM[v - 1]; $('#noteA').textContent = NA[v - 1];
}
inits[10] = () => {
  const r = $('#growth'); r.addEventListener('input', () => { r.dataset.played = 1; growth(+r.value); }); growth(1);
  const cap = $('#benCap'); const setB = i => { $$('#benefits button').forEach((b, k) => b.classList.toggle('on', k === i)); cap.textContent = BEN[i]; cap.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], 400); };
  $$('#benefits button').forEach((b, i) => b.addEventListener('click', () => { setB(i); if (i === 4) { r.value = 5; growth(5); } })); setB(0);
};
enters[10] = async () => { const r = $('#growth'); if (r.dataset.played) return; r.dataset.played = 1; for (let v = 2; v <= 3; v++) { await wait(700); if (cur !== 10) return; r.value = v; growth(v); } };

/* ================= SLIDE 12: self-assessment ================= */
const DEPTS = ['Sales & enquiries', 'Operations', 'Finance & billing', 'HR & hiring', 'Customer service', 'Marketing & social', 'Leadership reporting'];
const PAINS = ['Manual follow-ups', 'Copy-paste between tools', 'Spreadsheet reports', 'Chasing approvals', 'Paper or WhatsApp records', 'Scheduling'];
const REC = {
  'Sales & enquiries': { base: ['Capture leads from ads, chat, calls and forms automatically', 'Assign enquiries by rules, instantly'], p: { 0: 'Automatic follow-up reminders and WhatsApp nudges', 1: 'One CRM record feeding every other tool', 2: 'Live pipeline dashboard', 5: 'Self-serve booking for meetings and visits', 4: 'Every conversation logged against the lead' } },
  'Operations': { base: ['Digital job cards and task boards', 'Auto-scheduling of people and resources'], p: { 3: 'One-tap approvals with an audit trail', 4: 'Photo-proof checklists in place of paper', 2: 'Daily operations summary sent to owners', 1: 'Systems that talk to each other, no re-entry', 5: 'Rosters that rebalance themselves' } },
  'Finance & billing': { base: ['GST-ready invoices generated from the work done', 'Payment reminders that send themselves'], p: { 1: 'Invoices created straight from projects, no retyping', 2: 'Live cash and receivables view', 3: 'Expense and purchase approvals on mobile', 0: 'Automatic overdue follow-ups' } },
  'HR & hiring': { base: ['AI résumé reading into a hiring pipeline', 'Interview scheduling with calendar links'], p: { 3: 'Leave and onboarding approvals in one place', 4: 'Digital employee records', 1: 'Candidate details captured once, used everywhere', 5: 'Interview slots offered automatically' } },
  'Customer service': { base: ['An AI assistant that answers common questions', 'Tickets with owners and deadlines'], p: { 0: 'Automatic status updates to customers', 4: 'WhatsApp conversations turned into tracked tickets', 2: 'Service quality dashboard', 5: 'Self-serve appointment booking' } },
  'Marketing & social': { base: ['Content calendar with client approvals', 'AI-assisted first drafts in your tone'], p: { 3: 'Approval links instead of chasing on WhatsApp', 2: 'Campaign results in one live view', 1: 'Campaign leads flowing straight into the CRM', 5: 'Posts scheduled automatically once approved' } },
  'Leadership reporting': { base: ['One live dashboard across the business', 'Daily summary on WhatsApp'], p: { 2: 'No more hand-built weekly reports', 3: 'Exceptions flagged to you, before they grow', 1: 'Numbers pulled from source systems automatically' } }
};
const qd = new Set(), qp = new Set();
function qRender() {
  const out = $('#qOut'); const depts = DEPTS.filter(d => qd.has(d)); const pains = PAINS.map((p, i) => qp.has(p) ? i : -1).filter(i => i >= 0);
  let html = `<div class="mo-hub"><h3>Your automation map</h3><span class="micro">${depts.length} team${depts.length > 1 ? 's' : ''} · ${pains.length} pain point${pains.length > 1 ? 's' : ''}</span></div><div class="mo-tree">`;
  const lines = [];
  depts.forEach((d, i) => {
    const r = REC[d]; const items = [...pains.filter(p => r.p[p]).map(p => r.p[p]), ...r.base].filter((v, k, a) => a.indexOf(v) === k).slice(0, 3);
    lines.push(d + ':\n' + items.map(x => '  - ' + x).join('\n'));
    html += `<div class="mo-br" style="animation-delay:${i * 120}ms"><h4>${d}</h4><ul>${items.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
  });
  html += `</div><p class="micro" style="margin-top:10px">A starting sketch. An automation audit turns it into a prioritised plan.</p><div class="mo-actions"><a class="cta" id="qMail" style="display:grid;place-items:center;text-decoration:none">Send my map to Carun</a><button class="ghost" id="qBack">Start again</button></div>`;
  out.innerHTML = html;
  const body = 'Hello Eeshan and Nayythan,\n\nI went through your Business Process Automation presentation. Here is my automation map:\n\n' + lines.join('\n\n') + '\n\nWhat slows us down: ' + [...qp].join(', ') + '\n\nCould we talk?\n';
  $('#qMail').href = 'mailto:eeshan@carunadvisory.com?cc=nayythan@carunadvisory.com&subject=' + encodeURIComponent('Our automation map') + '&body=' + encodeURIComponent(body);
  $('#qBack').addEventListener('click', () => { out.classList.remove('show'); $('#quiz').classList.remove('hide'); });
  $('#quiz').classList.add('hide'); out.classList.add('show');
  const sl = slides[11]; const top = out.getBoundingClientRect().top - sl.getBoundingClientRect().top + sl.scrollTop - 70;
  sl.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
}
inits[11] = () => {
  const mk = (box, arr, set) => arr.forEach(t => { const c = el('button', 'chip', t); c.setAttribute('aria-pressed', 'false'); c.addEventListener('click', () => { set.has(t) ? set.delete(t) : set.add(t); c.classList.toggle('on', set.has(t)); c.setAttribute('aria-pressed', set.has(t)); $('#qGo').disabled = !(qd.size && qp.size); }); box.append(c); });
  mk($('#qDept'), DEPTS, qd); mk($('#qPain'), PAINS, qp);
  $('#qGo').addEventListener('click', qRender);
};

/* ================= SLIDE 13: engagement ================= */
inits[12] = () => {
  const arts = $$('#eng article');
  $$('#engQ button').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.e; $$('#engQ button').forEach(x => x.classList.toggle('on', x === b));
    arts.forEach((a, k) => a.classList.toggle('rec', k === i));
    const e = $('#eng'); if (e.scrollWidth > e.clientWidth + 4) e.scrollTo({ left: arts[i].offsetLeft - 18, behavior: reduced ? 'auto' : 'smooth' });
  }));
  $('#eng').addEventListener('click', e => { const a = e.target.closest('article'); if (a) { const i = +a.dataset.e; $$('#engQ button')[i].click(); } });
};

/* ================= SLIDE 14: close ================= */
inits[13] = () => {
  const send = () => { const v = $('#askIn').value.trim(); const body = 'Hello Eeshan and Nayythan,\n\n' + (v ? 'Something my team does by hand every week: ' + v + '\n\n' : '') + 'Could we explore what we could automate?\n'; location.href = 'mailto:eeshan@carunadvisory.com?cc=nayythan@carunadvisory.com&subject=' + encodeURIComponent('Automation conversation') + '&body=' + encodeURIComponent(body); };
  $('#askGo').addEventListener('click', send);
  $('#askIn').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
};

/* start */
const h0 = parseInt((location.hash.match(/\d+/) || ['1'])[0], 10);
go(isNaN(h0) ? 0 : h0 - 1);
window.__deck = { go, get cur() { return cur; }, N };
})();

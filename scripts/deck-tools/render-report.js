'use strict';
/*
 * Renders the UX agent's 07-report.json into the deck-guide page.
 * Styling reuses the app's own tokens and fonts so the guide reads as part
 * of the same product. Deterministic: same JSON in, same page out.
 *
 * Usage: node scripts/deck-tools/render-report.js <report.json> <out.html>
 */
const fs = require('fs');

const [inFile, outFile] = process.argv.slice(2);
if (!inFile || !outFile) { console.error('usage: render-report.js <report.json> <out.html>'); process.exit(1); }
const R = JSON.parse(fs.readFileSync(inFile, 'utf8'));

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const need = (obj, key, where) => {
  if (obj[key] == null) throw new Error('report.json: missing "' + key + '" in ' + where);
  return obj[key];
};
const list = arr => (arr && arr.length) ? '<ul>' + arr.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '';
const thaiDate = iso => {
  const d = new Date(iso);
  if (isNaN(d)) return esc(iso);
  const m = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return d.getDate() + ' ' + m[d.getMonth()] + ' ' + d.getFullYear();
};

const ROLE_TH = { core: 'แกนหลัก', enabler: 'ตัวเปิดทาง', payoff: 'ตัวรับผล', support: 'สนับสนุน', interaction: 'ตัวกวน', finisher: 'ตัวปิดเกม' };

function curveChart(curve) {
  const keys = ['1', '2', '3', '4', '5', '6+'];
  const vals = keys.map(k => Number(curve && curve[k]) || 0);
  const zero = Number(curve && curve['0']) || 0;
  const max = Math.max(1, ...vals);
  return '<figure class="curve" aria-label="กราฟค่าพลังงาน">' +
    '<figcaption>เส้นพลังงาน' + (zero ? ' <span class="muted">(+' + zero + ' ใบค่า 0)</span>' : '') + '</figcaption>' +
    '<div class="bars">' + keys.map((k, i) =>
      '<div class="bar"><span class="n">' + vals[i] + '</span>' +
      '<span class="fill" style="height:' + Math.round(vals[i] / max * 100) + '%"></span>' +
      '<span class="k">' + k + '</span></div>').join('') +
    '</div></figure>';
}

function deckPanel(d, kind) {
  const where = 'deck ' + (d.id || d.name);
  const cards = need(d, 'cards', where).slice().sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
  const missingN = cards.filter(c => !c.owned).length;
  const plan = d.howToPlay || {};
  const rows = cards.map(c =>
    '<li class="card-row' + (c.owned ? '' : ' is-missing') + '">' +
      '<span class="cost" aria-label="ค่าพลังงาน ' + c.cost + '">' + esc(c.cost) + '</span>' +
      '<span class="cname"><b>' + esc(c.name) + '</b><small>' + esc(c.purpose) + '</small></span>' +
      '<span class="pow" aria-label="พลัง ' + c.power + '">' + esc(c.power) + '</span>' +
      '<span class="role">' + esc(ROLE_TH[c.role] || c.role) + '</span>' +
      '<span class="own">' + (c.owned ? '✓ มีแล้ว' : '⚠ ยังไม่มี') + '</span>' +
    '</li>').join('');

  const upgrade = (d.upgradePath && d.upgradePath.length)
    ? '<section class="block"><h4>เส้นทางอัปเกรด</h4><ol class="steps">' + d.upgradePath.map(u =>
        '<li><span class="swap"><span class="out">' + esc(u.replace) + '</span> → <span class="in">' + esc(u.add) + '</span></span>' +
        '<span>' + esc(u.why) + '</span></li>').join('') + '</ol></section>'
    : '';

  return '<article class="deck" id="' + esc(d.id) + '">' +
    '<header class="deck-head">' +
      '<div><p class="eyebrow">' + esc(d.archetype) + (d.basedOnMeta ? ' · ดัดแปลงจาก ' + esc(d.basedOnMeta) : '') + '</p>' +
      '<h3>' + esc(need(d, 'name', where)) + '</h3></div>' +
      '<span class="pill ' + (missingN ? 'pill-warn' : 'pill-ok') + '">' +
        (missingN ? 'ขาด ' + missingN + ' ใบ' : 'เล่นได้เลย') + '</span>' +
    '</header>' +
    '<div class="deck-grid">' +
      '<ol class="cards">' + rows + '</ol>' +
      '<div class="side">' + curveChart(d.curve) +
        '<dl class="keyfacts">' +
          '<dt>ชนะยังไง</dt><dd>' + esc(d.winCondition) + '</dd>' +
          '<dt>คอมโบหลัก</dt><dd>' + esc(d.coreCombo) + '</dd>' +
        '</dl>' +
        '<div class="code"><span class="code-label">โค้ดเด็ค — วางในเกม หรือช่อง "นำเข้าเด็ค" ในแอป</span>' +
          '<code id="code-' + esc(d.id) + '">' + esc(need(d, 'deckCode', where)) + '</code>' +
          '<button type="button" class="copy" data-target="code-' + esc(d.id) + '">คัดลอกโค้ด</button></div>' +
      '</div>' +
    '</div>' +
    '<section class="block plan"><h4>วิธีเล่น</h4><dl>' +
      '<dt>ต้นเกม</dt><dd>' + esc(plan.early) + '</dd>' +
      '<dt>กลางเกม</dt><dd>' + esc(plan.mid) + '</dd>' +
      '<dt>ท้ายเกม</dt><dd>' + esc(plan.late) + '</dd>' +
      '<dt>คอมโบ</dt><dd>' + esc(plan.combo) + '</dd>' +
      '<dt>ถ้าไพ่ไม่มา</dt><dd>' + esc(plan.alternative) + '</dd>' +
    '</dl></section>' +
    (d.snapGuidance ? '<p class="snap"><b>จังหวะ snap</b> ' + esc(d.snapGuidance) + '</p>' : '') +
    '<div class="sw"><section class="block"><h4>จุดแข็ง</h4>' + list(d.strengths) + '</section>' +
    '<section class="block"><h4>จุดอ่อน</h4>' + list(d.weaknesses) + '</section></div>' +
    upgrade +
  '</article>';
}

const col = need(R, 'collection', 'root');
const playNow = R.playNow || [];
const upgrade = R.upgrade || [];
const stale = col.fileModified && (Date.now() - Date.parse(col.fileModified)) > 3 * 86400000;

const html = `<title>เด็คจากคอลเลกชันของคุณ</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap">
<style>
:root{
  color-scheme:dark;
  --void:#07041a; --panel:#150d38; --panel2:#1d1247; --line:rgba(150,120,255,.18); --line2:rgba(150,120,255,.34);
  --ink:#eee6ff; --ink2:#a99cd0; --ink3:#71659a; --gold:#ffc94a; --ok:#5ef2a4; --warn:#f5a524;
  --disp:'Anton',Impact,'Arial Narrow',sans-serif;
  --body:'IBM Plex Sans Thai','Noto Sans Thai',-apple-system,'Segoe UI',sans-serif;
  --mono:'JetBrains Mono',ui-monospace,Menlo,monospace;
}
body{background:var(--void);color:var(--ink);font:15px/1.65 var(--body);-webkit-font-smoothing:antialiased}
.wrap{max-width:1080px;margin:0 auto;padding-inline:20px;padding-block:32px 64px;display:flex;flex-direction:column;gap:40px}
h1,h2,h3{font-family:var(--disp);font-weight:400;letter-spacing:.01em;text-wrap:balance;line-height:1.1}
h1{font-size:clamp(34px,6vw,54px);color:var(--gold)}
h2{font-size:26px;display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
h2 .count{font-family:var(--mono);font-size:14px;color:var(--ink3)}
h3{font-size:24px}
h4{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);font-weight:600;margin-bottom:8px}
.muted{color:var(--ink3)}
.lead{color:var(--ink2);max-width:65ch}
header.top{display:flex;flex-direction:column;gap:14px}
.stats{display:flex;flex-wrap:wrap;gap:10px 24px;font-family:var(--mono);font-size:14px;color:var(--ink2)}
.stats b{color:var(--ink);font-size:18px}
.stale{border:1px solid var(--warn);color:var(--warn);border-radius:10px;padding:10px 14px;font-size:14px;max-width:65ch}
nav.jump{display:flex;flex-wrap:wrap;gap:8px}
nav.jump a{color:var(--ink);text-decoration:none;border:1px solid var(--line2);border-radius:999px;padding:6px 14px;font-size:14px}
nav.jump a:hover,nav.jump a:focus-visible{border-color:var(--gold);color:var(--gold);outline:none}
.arch-list{display:flex;flex-wrap:wrap;gap:8px}
.arch{border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-size:14px;display:flex;flex-direction:column;gap:2px;max-width:320px}
.arch b{font-weight:600}
.arch .v{font-family:var(--mono);font-size:12px}
.v-Strong{color:var(--ok)} .v-Playable{color:var(--gold)} .v-Incomplete{color:var(--warn)}
section.group{display:flex;flex-direction:column;gap:20px}
.deck{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:22px;display:flex;flex-direction:column;gap:20px}
.deck-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
.eyebrow{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3)}
.pill{font-family:var(--mono);font-size:13px;border-radius:999px;padding:4px 12px;border:1px solid;white-space:nowrap}
.pill-ok{color:var(--ok);border-color:var(--ok)} .pill-warn{color:var(--warn);border-color:var(--warn)}
.deck-grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:22px;align-items:start}
@media (max-width:760px){.deck-grid{grid-template-columns:1fr}}
ol.cards{list-style:none;display:flex;flex-direction:column;border-top:1px solid var(--line)}
.card-row{display:grid;grid-template-columns:34px minmax(0,1fr) 34px auto;grid-template-areas:"cost name pow own" "cost name pow role";column-gap:12px;align-items:center;padding-block:9px;border-bottom:1px solid var(--line)}
.cost{grid-area:cost;width:30px;height:30px;border-radius:50%;background:#2a5ad8;color:#fff;font-family:var(--disp);font-size:17px;display:grid;place-items:center}
.cname{grid-area:name;display:flex;flex-direction:column;min-width:0}
.cname b{font-weight:600}
.cname small{color:var(--ink2);font-size:13px;line-height:1.45}
.pow{grid-area:pow;font-family:var(--disp);font-size:20px;color:var(--gold);text-align:center;font-variant-numeric:tabular-nums}
.own{grid-area:own;font-size:12px;color:var(--ok);text-align:right;white-space:nowrap}
.role{grid-area:role;font-size:12px;color:var(--ink3);text-align:right;white-space:nowrap}
.is-missing .own{color:var(--warn)}
.is-missing .cname b{color:var(--warn)}
.side{display:flex;flex-direction:column;gap:18px}
.curve figcaption{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);margin-bottom:8px}
.bars{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;height:120px;align-items:end}
.bar{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:4px}
.bar .fill{width:100%;background:linear-gradient(180deg,var(--gold),#b8862a);border-radius:4px 4px 0 0;min-height:2px}
.bar .n{font-family:var(--mono);font-size:12px;color:var(--ink2)}
.bar .k{font-family:var(--mono);font-size:12px;color:var(--ink3);border-top:1px solid var(--line2);width:100%;text-align:center;padding-top:3px}
dl.keyfacts{display:flex;flex-direction:column;gap:6px}
dl dt{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3)}
dl dd{margin-bottom:8px}
.code{display:flex;flex-direction:column;gap:6px;border:1px dashed var(--line2);border-radius:10px;padding:12px}
.code-label{font-size:12px;color:var(--ink3)}
.code code{font-family:var(--mono);font-size:11px;color:var(--ink2);word-break:break-all;max-height:4.8em;overflow:auto;user-select:all}
button.copy{align-self:flex-start;background:var(--gold);color:#1a1200;border:0;border-radius:8px;padding:7px 14px;font:600 13px var(--body);cursor:pointer}
button.copy:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.block{display:flex;flex-direction:column}
.plan dl{display:grid;grid-template-columns:120px minmax(0,1fr);column-gap:16px}
.plan dd{margin-bottom:10px}
@media (max-width:560px){.plan dl{grid-template-columns:1fr}}
.snap{border-left:3px solid var(--gold);padding-left:12px;color:var(--ink2);max-width:75ch}
.snap b{color:var(--gold);margin-right:6px}
.sw{display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media (max-width:560px){.sw{grid-template-columns:1fr}}
.block ul{padding-left:18px;color:var(--ink2)}
ol.steps{list-style:none;display:flex;flex-direction:column;gap:10px}
ol.steps li{display:flex;flex-direction:column;gap:2px;color:var(--ink2)}
.swap{font-weight:600;color:var(--ink)} .swap .out{text-decoration:line-through;color:var(--ink3)} .swap .in{color:var(--warn)}
.crafts{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.craft{border:1px solid var(--line);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:4px}
.craft b{color:var(--warn);font-size:16px}
.craft span{font-size:13px;color:var(--ink2)}
.syn{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.syn article{border:1px solid var(--line);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:6px}
.syn .chips{display:flex;flex-wrap:wrap;gap:6px}
.syn .chips span{font-size:12px;border:1px solid var(--line2);border-radius:999px;padding:2px 10px}
.unres li{color:var(--warn)}
footer{color:var(--ink3);font-size:13px;max-width:75ch}
@media (prefers-reduced-motion:no-preference){nav.jump a,button.copy{transition:border-color .15s,color .15s,filter .15s}button.copy:hover{filter:brightness(1.08)}}
</style>
<div class="wrap">
<header class="top">
  <p class="eyebrow">Marvel Snap Deck Builder · ${esc(thaiDate(R.generatedAt))}</p>
  <h1>${esc(R.title || 'เด็คจากคอลเลกชันของคุณ')}</h1>
  <p class="lead">${esc(col.summary)}</p>
  <div class="stats">
    <span><b>${esc(col.owned)}</b> ใบที่มี</span>
    <span><b>${esc(col.missing)}</b> ใบที่ยังไม่มี</span>
    <span><b>${playNow.length}</b> เด็คเล่นได้เลย</span>
    <span><b>${upgrade.length}</b> เด็คอัปเกรด</span>
    <span class="muted">คอลเลกชันอ่านจากเกม ${esc(thaiDate(col.fileModified))}</span>
  </div>
  ${stale ? '<p class="stale">ข้อมูลคอลเลกชันเก่ากว่า 3 วัน — เปิดเกมบน Steam สักครั้งแล้วรันใหม่ เพื่อให้ ✓/⚠ ตรงกับการ์ดที่มีตอนนี้</p>' : ''}
  <nav class="jump" aria-label="ไปยังส่วน">
    <a href="#now">เล่นได้เลย</a><a href="#upgrade">เด็คอัปเกรด</a><a href="#crafts">คราฟต์อะไรก่อน</a><a href="#synergy">คอมโบน่ารู้</a><a href="#collection">คอลเลกชัน</a>
  </nav>
</header>

<section class="group" id="now">
  <h2>เด็คที่เล่นได้เลย <span class="count">${playNow.length} เด็ค · ใช้แต่การ์ดที่มี</span></h2>
  ${playNow.map(d => deckPanel(d, 'now')).join('') || '<p class="muted">ยังไม่มีเด็คที่ผ่านการตรวจ</p>'}
</section>

<section class="group" id="upgrade">
  <h2>เด็คที่ขาดการ์ดไม่กี่ใบ <span class="count">${upgrade.length} เด็ค · เล่นได้วันนี้ด้วยตัวแทน</span></h2>
  ${upgrade.map(d => deckPanel(d, 'upgrade')).join('') || '<p class="muted">—</p>'}
</section>

<section class="group" id="crafts">
  <h2>คราฟต์อะไรก่อน <span class="count">การ์ดที่ปลดล็อกได้มากที่สุด</span></h2>
  <div class="crafts">${(R.priorityCrafts || []).map(c =>
    '<article class="craft"><b>' + esc(c.card) + '</b><span>' + esc(c.unlocks) + '</span><span>' + esc(c.why) + '</span></article>').join('')}</div>
</section>

<section class="group" id="synergy">
  <h2>คอมโบน่ารู้ <span class="count">จากการ์ดในคอลเลกชัน</span></h2>
  <div class="syn">${(R.synergies || []).map(s =>
    '<article><b>' + esc(s.name) + '</b><div class="chips">' + (s.cards || []).map(c => '<span>' + esc(c) + '</span>').join('') +
    '</div><span class="muted">' + esc(s.howItWorks) + '</span></article>').join('')}</div>
</section>

<section class="group" id="collection">
  <h2>สายที่คอลเลกชันรองรับ</h2>
  <div class="arch-list">${(col.archetypes || []).map(a =>
    '<div class="arch"><b>' + esc(a.name) + '</b><span class="v v-' + esc(a.verdict) + '">' + esc(a.verdict) + '</span><span class="muted">' + esc(a.note) + '</span></div>').join('')}</div>
  ${(R.unresolved && R.unresolved.length) ? '<div class="block unres"><h4>เด็คที่ยังไม่ผ่านการตรวจ</h4><ul>' +
    R.unresolved.map(u => '<li><b>' + esc(u.name) + '</b> — ' + esc(u.problem) + '</li>').join('') + '</ul></div>' : ''}
</section>

<footer>ค่าพลังและความสามารถของการ์ดอ้างอิงข้อมูลแอปล่าสุดหลัง OTA · ✓/⚠ มาจากไฟล์ CollectionState ของเกมบนเครื่องคุณ · จังหวะ snap เป็นคำแนะนำ ไม่ใช่การรับประกันผล</footer>
</div>
<script>
document.addEventListener('click', function (e) {
  var b = e.target.closest('button.copy'); if (!b) return;
  var el = document.getElementById(b.getAttribute('data-target')); if (!el) return;
  var done = function () { var t = b.textContent; b.textContent = 'คัดลอกแล้ว'; setTimeout(function () { b.textContent = t; }, 1600); };
  var select = function () { var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'เลือกข้อความแล้ว กด Ctrl+C'; };
  try { navigator.clipboard.writeText(el.textContent).then(done, select); } catch (err) { select(); }
});
</script>
`;

fs.writeFileSync(outFile, html, 'utf8');
console.log('wrote', outFile, '| play now:', playNow.length, '| upgrade:', upgrade.length);

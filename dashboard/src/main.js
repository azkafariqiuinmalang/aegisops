import { ASSETS, CAMPUS_CASES, RULES, SEVERITY_LABEL, SOURCE_LABEL, buildScenario } from './data.js';
import { detect, correlate } from './engine.js';
import { backendView } from './backend.js';

const STORAGE_KEY = 'aegisops-demo-v1';
const viewNames = { overview: 'Overview', network: 'Network Monitoring', threats: 'Cyber Threat Detection', events: 'Security Event Analysis', hardware: 'Hardware Health', predictive: 'Predictive Maintenance', incidents: 'Incident Management' };
const app = document.querySelector('#app');
const state = loadState();
let activeScenario = state.run?.type || 'campus';
let scenarioSpeed = 1;
let scenarioTimer = null;
let currentView = location.hash.slice(1) || 'overview';
let selectedIncident = state.incidents[0]?.id || null;
let eventFilters = { source: '', action: '', query: '' };
let threatFilter = 'all';
let dataMode = 'demo';
let backendData = null;
let backendRequest;
const backendPages = ['overview', 'network', 'threats', 'events', 'hardware'];

async function api(path, signal) {
  const response = await fetch(path, {signal, cache: 'no-store'});
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}

async function refreshBackend() {
  backendRequest?.abort();
  if (dataMode === 'demo') return;
  const request = new AbortController();
  backendRequest = request;
  const simulation = dataMode === 'simulation';
  backendData = null;
  render();
  try {
    const snapshot = await api('/api/dashboard?simulation=' + simulation, request.signal);
    if (request.signal.aborted) return;
    backendData = snapshot;
  } catch (error) {
    if (request.signal.aborted) return;
    backendData = {error: 'Data backend gagal dimuat (' + error.message + ').'};
  }
  if (!request.signal.aborted && dataMode !== 'demo') render();
}

async function openBackendEvent(id) {
  const mode = dataMode;
  try {
    const event = await api('/events/' + encodeURIComponent(id));
    if (dataMode !== mode) return;
    openModal('Detail event ' + event.event_id,
      '<pre class="backend-json">' + esc(JSON.stringify(event, null, 2)) + '</pre>');
  } catch (error) {
    toast('Bukti gagal dimuat (' + error.message + ').', 'warn');
  }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.events) && Array.isArray(saved.alerts) && Array.isArray(saved.incidents)) { const run = saved.run || null; if (run?.status === 'running') run.status = 'paused'; return { events: saved.events, alerts: saved.alerts, incidents: saved.incidents, theme: saved.theme === 'light' ? 'light' : 'dark', nextAlert: saved.nextAlert || 1, nextIncident: saved.nextIncident || 1, run }; }
  } catch { /* Local demo state can safely reset when storage is unavailable. */ }
  return { events: [], alerts: [], incidents: [], theme: 'dark', nextAlert: 1, nextIncident: 1, run: null };
}
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { toast('Penyimpanan browser penuh; data sesi mungkin tidak tersimpan.', 'warn'); } }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function fmtTime(value) { return value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value)) : '—'; }
function fmtShort(value) { return value ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value)) : '—'; }
function toast(message, type = 'success') { const box = document.createElement('div'); box.className = `toast ${type}`; box.textContent = message; document.querySelector('#toast-root').append(box); setTimeout(() => box.remove(), 3200); }
function badge(text, kind = '') { return `<span class="badge ${kind}">${esc(text)}</span>`; }
function severityBadge(severity) { return badge(SEVERITY_LABEL[severity] || severity, severity); }
function setView(view) { currentView = Object.hasOwn(viewNames, view) && (dataMode === 'demo' || backendPages.includes(view)) ? view : 'overview'; if (location.hash.slice(1) !== currentView) history.replaceState(null, '', `#${currentView}`); document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.view === currentView)); document.querySelector('#page-title').textContent = viewNames[currentView]; document.querySelector('#sidebar').classList.remove('open'); render(); }
function render() {
  save();
  const demo = dataMode === 'demo';
  document.querySelector('#data-mode-note').textContent = {
    demo: 'Data simulasi dari browser.',
    simulation: 'Data simulasi dari SQLite.',
    observed: 'Data observasi lab dari SQLite.',
  }[dataMode];
  document.querySelector('.system-card strong').textContent = demo ? 'Mesin simulasi aktif' : 'Sumber data backend';
  document.querySelector('.system-card small').textContent = demo ? 'Sesi demo lokal' : 'FastAPI dan SQLite';
  document.querySelectorAll('.nav-item').forEach(button => {
    button.hidden = !demo && !backendPages.includes(button.dataset.view);
  });
  if (!demo) {
    document.querySelector('#nav-alert-count').textContent = backendData?.findings?.length ?? '—';
    app.innerHTML = backendView(currentView, backendData, {
      esc, badge, heading, simulation: dataMode === 'simulation',
    });
    return;
  }
  updateCounts();
  const views = { overview: renderOverview, network: renderNetwork, threats: renderThreats, events: renderEvents, hardware: renderHardware, predictive: renderPredictive, incidents: renderIncidents };
  app.innerHTML = (views[currentView] || renderOverview)();
}
function updateCounts() { document.querySelector('#nav-alert-count').textContent = state.alerts.filter(a => a.state !== 'closed').length; document.querySelector('#nav-incident-count').textContent = state.incidents.filter(i => !['selesai', 'false_positive'].includes(i.status)).length; }
function heading(title, description, actions = '') { return `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div><div class="actions">${actions}</div></div>`; }
function openModal(title, content, actions = '') { const root = document.querySelector('#modal-root'); root.innerHTML = `<div class="modal-backdrop" data-action="backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h2>${esc(title)}</h2><button class="modal-close" data-action="close-modal" aria-label="Tutup">×</button></div>${content}${actions}</section></div>`; root.querySelector('.modal-close').focus(); }
function closeModal() { document.querySelector('#modal-root').innerHTML = ''; }
function activeAlerts() { return state.alerts.filter(a => a.state !== 'closed').sort((a, b) => b.risk - a.risk); }
function getAsset(id) { return ASSETS.find(a => a.id === id); }
function riskClass(risk) { return risk >= 75 ? 'crit' : 'score'; }
function eventCountForAlert(alert) { return alert.evidence_event_ids?.length || 0; }
function addDetectedFindings() {
  for (const finding of detect(state.events.slice(-state.run.index), ASSETS)) {
    const signature = `${finding.rule}|${finding.src_ip}|${finding.targets.join(',')}`;
    const existing = state.alerts.find(a => `${a.rule}|${a.src.ip}|${a.targets.join(',')}` === signature && a.state !== 'closed' && a.evidence_event_ids.some(id => finding.eventIds.includes(id)));
    if (existing) {
      const updated = correlate(finding, state.events, ASSETS, existing.id);
      Object.assign(existing, updated, { state: existing.state });
      continue;
    }
    const id = `AL-${String(state.nextAlert++).padStart(4, '0')}`;
    state.alerts.unshift(correlate(finding, state.events, ASSETS, id));
    toast(`Alert ${id}: ${finding.title}`, finding.severity === 'crit' ? 'warn' : 'success');
  }
  save();
}
function advanceScenario() { if (!state.run || state.run.status !== 'running') return; const batch = state.run.events.slice(state.run.index, state.run.index + 2); state.events.push(...batch); state.run.index += batch.length; addDetectedFindings(); if (state.run.index >= state.run.events.length) { state.run.status = 'complete'; stopScenario(); toast('Skenario selesai. Event dan hasil deteksi tersedia untuk ditinjau.'); } render(); }
function startScenarioTimer() { stopScenario(); scenarioTimer = setInterval(advanceScenario, 300 / scenarioSpeed); }
function beginScenario(type) {
  stopScenario(); activeScenario = type;
  const generated = buildScenario(type, 20261113, Date.now());
  generated.forEach((event, index) => { event.id = `ev-${type}-${state.events.length + index + 1}`; });
  state.run = { type, events: generated, index: 0, status: 'running' };
  render();
  startScenarioTimer();
}
function stopScenario() { if (scenarioTimer) clearInterval(scenarioTimer); scenarioTimer = null; }
function pauseScenario() { if (!state.run) return; if (state.run.status === 'paused') { state.run.status = 'running'; startScenarioTimer(); } else { state.run.status = 'paused'; stopScenario(); } render(); }
function resetDemo() { stopScenario(); state.events = []; state.alerts = []; state.incidents = []; state.run = null; state.nextAlert = 1; state.nextIncident = 1; save(); closeModal(); render(); toast('Sesi demo direset.'); }
function scenarioBox() {
  const run = state.run;
  const percent = run?.events?.length ? Math.round(run.index / run.events.length * 100) : 0;
  const status = run ? ({ running: 'Berjalan', paused: 'Dijeda', complete: 'Selesai' }[run.status] || 'Siap') : 'Siap';
  return `<section class="scenario-box"><div><h3>Simulasi pusat data kampus</h3><p>Event sintetis deterministik · seed 20261113 · tidak ada trafik ke host nyata</p><div class="scenario-state">${status}${run ? ` · ${run.index}/${run.events.length} event` : ''}</div><div class="progress"><span style="width:${percent}%"></span></div></div><div class="scenario-actions"><select class="field" id="scenario-select" aria-label="Pilih skenario" ${run && run.status !== 'complete' ? 'disabled' : ''}><option value="campus" ${activeScenario === 'campus' ? 'selected' : ''}>Kampus - Dugaan kebocoran web Syariah</option><option value="campus-backup" ${activeScenario === 'campus-backup' ? 'selected' : ''}>Kampus - Backup terjadwal</option>${Object.entries(CAMPUS_CASES).map(([id, config]) => `<option value="${id}" ${activeScenario === id ? 'selected' : ''}>Kampus - ${esc(config.label)}</option>`).join('')}<option value="scan" ${activeScenario === 'scan' ? 'selected' : ''}>Port scan</option><option value="brute" ${activeScenario === 'brute' ? 'selected' : ''}>Brute force SSH</option><option value="newdev" ${activeScenario === 'newdev' ? 'selected' : ''}>Perangkat baru</option><option value="infra" ${activeScenario === 'infra' ? 'selected' : ''}>Gangguan UPS</option></select><select class="field" id="scenario-speed" aria-label="Kecepatan simulasi"><option value="1" ${scenarioSpeed === 1 ? 'selected' : ''}>1×</option><option value="5" ${scenarioSpeed === 5 ? 'selected' : ''}>5×</option><option value="10" ${scenarioSpeed === 10 ? 'selected' : ''}>10×</option></select><button class="btn primary" data-action="run-scenario" ${run && run.status !== 'complete' ? 'disabled' : ''}>▶ Jalankan</button>${run && run.status !== 'complete' ? `<button class="btn" data-action="pause-scenario">${run.status === 'paused' ? 'Lanjutkan' : 'Jeda'}</button>` : ''}<button class="btn" data-action="reset-demo">Reset demo</button></div></section>`;
}
function topologyMarkup() { return `<div class="topology"><svg viewBox="0 0 600 170" preserveAspectRatio="none" aria-hidden="true"><path d="M300 35 L150 90 M300 35 L300 90 M300 35 L450 90 M150 90 L90 140 M150 90 L200 140 M300 90 L300 140 M450 90 L400 140 M450 90 L510 140" fill="none" stroke="var(--line)" stroke-width="1.5"/><path d="M300 35 L150 90" fill="none" stroke="var(--accent)" stroke-width="2"/></svg><div class="topo-node" style="left:50%;top:22%"><strong><i class="node-dot"></i>CORE GW</strong><small>10.0.0.1 · 3.2 ms</small></div><div class="topo-node" style="left:25%;top:54%"><strong><i class="node-dot"></i>SW CORE</strong><small>10.0.0.2 · aktif</small></div><div class="topo-node" style="left:50%;top:54%"><strong><i class="node-dot"></i>WEB-SYA-01</strong><small>10.0.1.20 · aktif</small></div><div class="topo-node warn" style="left:75%;top:54%"><strong><i class="node-dot"></i>DB SERVER</strong><small>10.0.1.30 · aktif</small></div><div class="topo-node" style="left:15%;top:84%"><strong><i class="node-dot"></i>DNS</strong><small>10.0.0.53</small></div><div class="topo-node warn" style="left:34%;top:84%"><strong><i class="node-dot"></i>UPS CORE</strong><small>18% baterai</small></div><div class="topo-node" style="left:66%;top:84%"><strong><i class="node-dot"></i>BACKUP</strong><small>10.0.1.40</small></div><div class="topo-node" style="left:85%;top:84%"><strong><i class="node-dot"></i>ACCESS SW</strong><small>10.0.2.10</small></div></div>`; }
function queueItem(alert) { return `<div class="queue-item" data-action="open-alert" data-id="${esc(alert.id)}"><i class="severity-stripe ${alert.severity}"></i><div class="queue-copy"><strong>${esc(alert.title)}</strong><small>${esc(alert.src.ip)} · ${esc(alert.rule)} · ${eventCountForAlert(alert)} bukti</small></div><span class="score ${alert.risk >= 75 ? 'crit' : ''}">${alert.risk}</span></div>`; }
function renderOverview() {
  const alerts = activeAlerts(); const critical = alerts.filter(a => a.severity === 'crit').length; const incidents = state.incidents.filter(i => !['selesai', 'false_positive'].includes(i.status)).length;
  const actions = `<button class="btn" data-action="go-view" data-view="events">Lihat event</button><button class="btn primary" data-action="go-view" data-view="threats">Buka alert center →</button>`;
  return `${heading('Overview','Simulasi fiktif pusat data kampus berlatar UIN Maulana Malik Ibrahim Malang. Aset, topologi, dan kejadian dibuat untuk demo.',actions)}${scenarioBox()}<div class="kpi-grid"><div class="kpi-card"><div class="kpi-top">Aset jaringan terpantau <span class="kpi-symbol">⌘</span></div><div class="kpi-value">${ASSETS.length}</div><div class="kpi-foot">Inventaris simulasi · 12 perangkat</div></div><div class="kpi-card"><div class="kpi-top">Alert keamanan aktif <span class="kpi-symbol">⬡</span></div><div class="kpi-value ${critical ? 'text-crit' : ''}">${alerts.length}</div><div class="kpi-foot">${critical} kritis · ${alerts.filter(a => a.severity === 'warn').length} peringatan</div></div><div class="kpi-card"><div class="kpi-top">Ketersediaan jaringan <span class="kpi-symbol">◉</span></div><div class="kpi-value text-ok">99.4<span style="font-size:14px">%</span></div><div class="kpi-foot">Nilai demo · periode 24 jam</div></div><div class="kpi-card"><div class="kpi-top">Insiden belum selesai <span class="kpi-symbol">◷</span></div><div class="kpi-value">${incidents}</div><div class="kpi-foot">Perlu tinjauan operator</div></div></div><div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><div class="panel-title">Indeks kesehatan infrastruktur</div><div class="panel-subtitle">Agregat simulasi status perangkat dan metrik jaringan</div></div>${badge('BAIK','ok')}</div><div class="health-score"><div class="health-ring"><div>89<small>/ 100</small></div></div><div class="health-copy"><strong>Operasi berjalan normal</strong><p>11 dari 12 aset berstatus normal. UPS Core perlu ditinjau: kapasitas baterai demo 18%.</p><div class="source-row"><span class="source-chip">SNMP · SIMULASI</span><span class="source-chip">AGEN · SIMULASI</span><span class="source-chip">FIREWALL · SIMULASI</span></div></div></div></section><section class="panel"><div class="panel-head"><div><div class="panel-title">Distribusi sumber event</div><div class="panel-subtitle">${state.events.length} event dalam sesi ini</div></div>${badge('LIVE DEMO','info')}</div><div class="metric-bars"><div class="metric-row"><span>Zeek</span><div class="metric-track"><span style="width:${state.events.length ? '74%' : '8%'}"></span></div><small>${state.events.filter(e => e.source === 'zeek').length}</small></div><div class="metric-row"><span>Firewall</span><div class="metric-track"><span style="width:${state.events.length ? '48%' : '4%'}"></span></div><small>${state.events.filter(e => e.source === 'firewall').length}</small></div><div class="metric-row"><span>Auth / SNMP</span><div class="metric-track"><span style="width:${state.events.length ? '28%' : '2%'}"></span></div><small>${state.events.filter(e => ['auth', 'snmp'].includes(e.source)).length}</small></div></div><div class="source-row"><span class="source-chip">DETEKSI BERBASIS ATURAN</span><span class="source-chip">TANPA BACKEND</span></div></section></div><div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><div class="panel-title">Topologi jaringan</div><div class="panel-subtitle">Relasi aset utama · status ditandai teks dan warna</div></div><button class="panel-link" data-action="go-view" data-view="network">Detail jaringan →</button></div>${topologyMarkup()}</section><section class="panel"><div class="panel-head"><div><div class="panel-title">Perlu perhatian</div><div class="panel-subtitle">Prioritas keamanan dan infrastruktur</div></div><button class="panel-link" data-action="go-view" data-view="incidents">Semua insiden →</button></div><div class="queue-list">${alerts.length ? alerts.slice(0, 3).map(queueItem).join('') : `<div class="queue-item" data-action="go-view" data-view="hardware"><i class="severity-stripe"></i><div class="queue-copy"><strong>UPS Core — kapasitas baterai rendah</strong><small>Hardware Health · status simulasi</small></div><span class="score">Periksa</span></div><div class="empty-state" style="padding:9px">Belum ada alert keamanan. Jalankan skenario di atas untuk mencoba alur deteksi.</div>`}</div></section></div>`;
}
function renderNetwork() { return `${heading('Network Monitoring','Metrik jaringan dan relasi perangkat contoh. Nilai tidak berasal dari pemantauan nyata.')}<div class="kpi-grid"><div class="kpi-card"><div class="kpi-top">Latency median</div><div class="kpi-value">3.2 <span style="font-size:13px">ms</span></div><div class="kpi-foot">Simulasi · gateway inti</div></div><div class="kpi-card"><div class="kpi-top">Packet loss</div><div class="kpi-value text-ok">0.2<span style="font-size:13px">%</span></div><div class="kpi-foot">Simulasi · 24 jam</div></div><div class="kpi-card"><div class="kpi-top">Bandwidth masuk</div><div class="kpi-value">142 <span style="font-size:13px">Mbps</span></div><div class="kpi-foot">Nilai ilustratif</div></div><div class="kpi-card"><div class="kpi-top">Perangkat aktif</div><div class="kpi-value">11/12</div><div class="kpi-foot">1 perangkat perlu perawatan</div></div></div><section class="panel"><div class="panel-head"><div><div class="panel-title">Peta topologi</div><div class="panel-subtitle">Jaringan contoh 10.0.0.0/16 · garis menunjukkan relasi ilustratif</div></div>${badge('SIMULASI','warn')}</div>${topologyMarkup()}</section><section class="panel" style="margin-top:14px"><div class="panel-head"><div><div class="panel-title">Inventaris perangkat</div><div class="panel-subtitle">Kepentingan aset digunakan untuk konteks dan skor risiko</div></div></div><div class="asset-row header"><span>ASET</span><span>ALAMAT IP</span><span>SEGMEN</span><span>STATUS</span></div>${ASSETS.map(a => `<div class="asset-row"><div class="asset-name"><strong>${esc(a.name)}</strong><small>${esc(a.id)} · ${esc(a.type)} · pemilik ${esc(a.owner)}</small></div><span class="mono">${esc(a.ip)}</span><span>${esc(a.segment)} · kritikalitas ${a.criticality}/5</span>${badge(a.status === 'warn' ? 'Perlu periksa' : 'Normal', a.status)}</div>`).join('')}</section>`; }
function renderThreats() {
  const all = activeAlerts(); const alerts = all.filter(a => threatFilter === 'all' || a.severity === threatFilter);
  const rows = alerts.length ? alerts.map(a => `<div class="alert-item" data-action="open-alert" data-id="${esc(a.id)}"><i class="severity-stripe ${a.severity}"></i><div class="alert-copy"><strong>${esc(a.title)} <span class="mono" style="color:var(--muted)">${esc(a.id)}</span></strong><small>${esc(a.rule)} · sumber ${esc(a.src.ip)} · ${esc(a.targets.map(id => getAsset(id)?.name || id).join(', ') || 'Aset tidak dikenal')} · ${fmtTime(a.t_first)}</small><small>${esc(a.why)}</small><div class="source-row">${a.sources.map(s => `<span class="source-chip">${esc(SOURCE_LABEL[s] || s)}</span>`).join('')}${badge(`Keyakinan ${a.confidence}`, 'info')}${badge(`${eventCountForAlert(a)} bukti`, '')}</div></div><span class="score ${a.risk >= 75 ? 'crit' : ''}">${a.risk}</span></div>`).join('') : `<div class="empty-state">Belum ada alert pada filter ini. Jalankan Port scan, Brute force, atau Perangkat baru di Overview.</div>`;
  return `${heading('Cyber Threat Detection','Temuan berbasis aturan dengan bukti, konteks aset, risiko transparan, dan langkah aman.',`<button class="btn" data-action="go-view" data-view="events">Analisis event →</button>`)}<div class="kpi-grid"><div class="kpi-card"><div class="kpi-top">Alert terbuka</div><div class="kpi-value">${all.length}</div><div class="kpi-foot">Dedup per rule, sumber, dan target</div></div><div class="kpi-card"><div class="kpi-top">Kritis</div><div class="kpi-value ${all.some(a => a.severity === 'crit') ? 'text-crit' : ''}">${all.filter(a => a.severity === 'crit').length}</div><div class="kpi-foot">Memerlukan triase operator</div></div><div class="kpi-card"><div class="kpi-top">Aturan aktif</div><div class="kpi-value">${RULES.length}</div><div class="kpi-foot">Rule deteksi yang dapat dijelaskan</div></div><div class="kpi-card"><div class="kpi-top">Event dianalisis</div><div class="kpi-value">${state.events.length}</div><div class="kpi-foot">Event sintetis sesi ini</div></div></div><section class="panel"><div class="panel-head"><div><div class="panel-title">Alert Center</div><div class="panel-subtitle">Pilih alert untuk melihat bukti dan membuka insiden</div></div><select class="field" id="threat-filter"><option value="all">Semua severity</option><option value="crit">Kritis</option><option value="warn">Peringatan</option></select></div><div class="alert-list">${rows}</div></section><section class="panel" style="margin-top:14px"><div class="panel-head"><div><div class="panel-title">Aturan deteksi</div><div class="panel-subtitle">Ambang aktif dan penjelasan singkat</div></div></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>ATURAN</th><th>JENDELA</th><th>AMBANG</th><th>HASIL</th></tr></thead><tbody>${RULES.map(r => `<tr><td class="mono">${esc(r.id)}</td><td>${esc(r.description)}</td><td>${r.windowSec} detik</td><td>${esc(r.threshold)}</td><td>${badge('Aktif','ok')}</td></tr>`).join('')}</tbody></table></div><div class="risk-formula" style="margin-top:11px">Skor risiko = clamp(base severity + 6 × kritikalitas aset + 10 jika firewall mengizinkan + 8 × (sumber penguat − 1), 0, 100). Base: peringatan 30, kritis 50. Nilai tiap komponen tampil pada detail alert.</div></section>`;
}
function renderEvents() {
  const filtered = state.events.filter(e => (!eventFilters.source || e.source === eventFilters.source) && (!eventFilters.action || e.action === eventFilters.action) && (!eventFilters.query || `${e.id} ${e.src_ip} ${e.dst_ip} ${e.asset_id || ''} ${e.service}`.toLowerCase().includes(eventFilters.query.toLowerCase()))).slice().reverse();
  return `${heading('Security Event Analysis','Jelajahi event ternormalisasi dan buka payload raw untuk menelusuri bukti alert.')}<section class="panel"><div class="panel-head"><div><div class="panel-title">Event stream</div><div class="panel-subtitle">${filtered.length} dari ${state.events.length} event · semua timestamp disimpan dalam UTC</div></div>${badge('SIMULASI','warn')}</div><div class="toolbar"><input class="field search" id="event-search" placeholder="Cari ID, IP, aset…" value="${esc(eventFilters.query)}"><select class="field" id="event-source"><option value="">Semua sumber</option>${[...new Set(state.events.map(e => e.source))].map(s => `<option value="${esc(s)}" ${eventFilters.source === s ? 'selected' : ''}>${esc(SOURCE_LABEL[s] || s)}</option>`).join('')}</select><select class="field" id="event-action"><option value="">Semua aksi</option><option value="allow" ${eventFilters.action === 'allow' ? 'selected' : ''}>Diizinkan</option><option value="deny" ${eventFilters.action === 'deny' ? 'selected' : ''}>Ditolak</option><option value="none" ${eventFilters.action === 'none' ? 'selected' : ''}>Tanpa aksi</option></select><button class="btn small" data-action="clear-event-filters">Reset filter</button></div><div class="table-wrap"><table><thead><tr><th>WAKTU</th><th>ID EVENT</th><th>SUMBER</th><th>SUMBER IP</th><th>TUJUAN</th><th>LAYANAN</th><th>AKSI / HASIL</th><th>BUKTI</th></tr></thead><tbody>${filtered.length ? filtered.map(e => { const evidence = state.alerts.some(a => a.evidence_event_ids.includes(e.id)); return `<tr data-clickable="true" data-action="open-event" data-id="${esc(e.id)}"><td class="mono">${fmtShort(e.ts)}</td><td class="mono">${esc(e.id)}</td><td>${esc(SOURCE_LABEL[e.source] || e.source)}</td><td class="mono">${esc(e.src_ip)}</td><td class="mono">${esc(e.dst_ip || '—')}${e.dst_port ? `:${e.dst_port}` : ''}</td><td>${esc(e.service || e.kind)}</td><td>${e.action === 'allow' ? badge('Diizinkan','warn') : e.action === 'deny' ? badge('Ditolak','info') : esc(e.outcome === 'failure' ? 'Gagal' : e.outcome === 'success' ? 'Berhasil' : '—')}</td><td>${evidence ? badge('Alert','crit') : '—'}</td></tr>`; }).join('') : `<tr><td colspan="8" class="empty-state">${state.events.length ? 'Tidak ada event yang sesuai filter.' : 'Belum ada event. Jalankan skenario di Overview.'}</td></tr>`}</tbody></table></div></section>`;
}
function renderHardware() {
  const hardware = ASSETS.filter(a => ['UPS', 'Pendingin', 'Sensor'].includes(a.type));
  return `${heading('Hardware Health','Kesehatan perangkat dan sensor demo. Hardware eksternal tidak terhubung.')}<div class="kpi-grid"><div class="kpi-card"><div class="kpi-top">Node simulasi</div><div class="kpi-value">${hardware.length}</div><div class="kpi-foot">UPS, pendingin, AegisNode</div></div><div class="kpi-card"><div class="kpi-top">Perlu pemeriksaan</div><div class="kpi-value text-warn">1</div><div class="kpi-foot">UPS Core · baterai 18%</div></div><div class="kpi-card"><div class="kpi-top">Suhu ruang server</div><div class="kpi-value">24.8 <span style="font-size:13px">°C</span></div><div class="kpi-foot">Nilai ilustratif</div></div><div class="kpi-card"><div class="kpi-top">AegisNode</div><div class="kpi-value text-ok">Aktif</div><div class="kpi-foot">ESP32-S3 + BME280 · simulasi</div></div></div><section class="panel"><div class="panel-head"><div><div class="panel-title">Perangkat infrastruktur</div><div class="panel-subtitle">Status dan telemetri contoh</div></div>${badge('SIMULASI','warn')}</div><div class="asset-list">${hardware.map(a => `<div class="asset-row"><div class="asset-name"><strong>${esc(a.name)}</strong><small>${esc(a.id)} · ${esc(a.type)}</small></div><span class="mono">${esc(a.ip)}</span><span>${a.type === 'UPS' ? 'Baterai 18% · suhu 41°C' : a.type === 'Pendingin' ? 'Suhu inlet normal' : 'Sensor lingkungan aktif'}</span>${badge(a.status === 'warn' ? 'Perlu periksa' : 'Normal', a.status)}</div>`).join('')}</div><div class="detail-card" style="margin-top:12px"><h3>Rekomendasi pemeriksaan — UPS Core</h3><p>Pastikan telemetri baterai dan catu daya melalui pemeriksaan operator. Angka 18% dan suhu 41°C adalah data demo; sistem tidak mengendalikan UPS.</p></div></section>`;
}
function renderPredictive() { return `${heading('Predictive Maintenance','Ilustrasi tren linear untuk perawatan. Ini indikasi berbasis data sintetis, bukan prediksi pasti.')}<div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><div class="panel-title">Tren kapasitas baterai UPS Core</div><div class="panel-subtitle">Regresi linear pada titik telemetri simulasi 7 hari</div></div>${badge('KEYAKINAN SEDANG','warn')}</div><svg class="sparkline" viewBox="0 0 600 90" preserveAspectRatio="none" aria-label="Grafik tren kapasitas baterai menurun"><path d="M0 20 L100 26 L200 33 L300 39 L400 52 L500 61 L600 73" fill="none" stroke="var(--warn)" stroke-width="3"/><path d="M0 20 L100 26 L200 33 L300 39 L400 52 L500 61 L600 73 L600 90 L0 90Z" fill="var(--warn)" opacity=".08"/><g fill="var(--warn)"><circle cx="0" cy="20" r="4"/><circle cx="100" cy="26" r="4"/><circle cx="200" cy="33" r="4"/><circle cx="300" cy="39" r="4"/><circle cx="400" cy="52" r="4"/><circle cx="500" cy="61" r="4"/><circle cx="600" cy="73" r="4"/></g></svg><div class="source-row"><span class="source-chip">HARI 1 · 72%</span><span class="source-chip">HARI 4 · 49%</span><span class="source-chip">HARI 7 · 18%</span></div></section><section class="panel"><div class="panel-head"><div><div class="panel-title">Indikasi perawatan</div><div class="panel-subtitle">Estimasi sangat bergantung pada tren demo</div></div></div><div class="detail-pairs"><div><small>Perangkat</small><strong>UPS Core</strong></div><div><small>Nilai terakhir</small><strong class="text-warn">18%</strong></div><div><small>ETA indikatif</small><strong>≈ 2 hari</strong></div><div><small>Keyakinan</small><strong>Sedang</strong></div></div><div class="detail-card" style="margin-top:13px"><h3>Langkah yang disarankan</h3><p>Periksa status baterai langsung mengikuti prosedur fasilitas. Tren simulasi tidak menggantikan inspeksi atau pembacaan perangkat nyata.</p></div></section></div><section class="panel"><div class="panel-head"><div><div class="panel-title">Metode dan batasan</div></div></div><div class="risk-formula">Regresi linear sederhana atas tujuh nilai contoh. ETA dihitung dari kemiringan garis ke ambang 10%. Tidak ada model machine learning atau data historis perangkat nyata. Hasil hanya indikasi untuk demo dan harus divalidasi sebelum tindakan.</div></section>`; }
function statusLabel(status) { return ({ baru: 'Baru', dianalisis: 'Dianalisis', ditangani: 'Ditangani', selesai: 'Selesai', false_positive: 'False positive' })[status] || status; }
function renderIncidents() {
  const items = state.incidents;
  if (!selectedIncident || !items.some(i => i.id === selectedIncident)) selectedIncident = items[0]?.id || null;
  const selected = items.find(i => i.id === selectedIncident);
  const list = items.length ? `<div class="incident-list">${items.slice().reverse().map(i => `<button class="btn incident-select ${i.id === selectedIncident ? 'selected' : ''}" data-action="select-incident" data-id="${esc(i.id)}"><strong>${esc(i.id)} · ${esc(i.alert_ids.join(', '))}</strong><small>${esc(statusLabel(i.status))} · ${fmtShort(i.created_at)}</small></button>`).join('')}</div>` : `<div class="empty-state">Belum ada insiden. Buka alert keamanan lalu pilih “Buat insiden”.</div>`;
  if (!selected) return `${heading('Incident Management','Kelola alert sebagai insiden, catat tindakan, dan simpan timeline selama sesi.',`<button class="btn" data-action="go-view" data-view="threats">Ke Alert Center →</button>`)}<section class="panel">${list}</section>`;
  const alertList = selected.alert_ids.map(id => state.alerts.find(a => a.id === id)).filter(Boolean);
  return `${heading('Incident Management','Kelola status, penugasan, catatan, dan resolusi.',`<button class="btn" data-action="go-view" data-view="threats">Ke Alert Center →</button>`)}<div class="incident-layout"><section class="panel">${list}</section><section class="panel"><div class="panel-head"><div><div class="panel-title">${esc(selected.id)} · ${esc(selected.title || "Insiden simulasi")}</div><div class="panel-subtitle">Alert terkait: ${esc(selected.alert_ids.join(', '))}</div></div>${badge(statusLabel(selected.status), selected.status === 'selesai' ? 'ok' : selected.status === 'false_positive' ? 'info' : 'warn')}</div><div class="detail-pairs"><div><small>Penanggung jawab</small><strong>${esc(selected.assignee || 'Belum ditugaskan')}</strong></div><div><small>Dibuat</small><strong>${fmtTime(selected.created_at)}</strong></div><div><small>Alert tertaut</small><strong>${alertList.length}</strong></div><div><small>Hasil</small><strong>${esc(selected.resolution || 'Belum ada')}</strong></div></div><div class="input-row"><input class="field" id="assignee-input" placeholder="Nama / tim penanggung jawab" value="${esc(selected.assignee || '')}"><button class="btn" data-action="assign-incident" data-id="${esc(selected.id)}">Simpan penugasan</button></div><label class="field-label" for="incident-note">Catatan operator</label><textarea class="textarea" id="incident-note" placeholder="Catat hasil pemeriksaan atau tindakan..."></textarea><div class="actions" style="margin:8px 0 16px"><button class="btn" data-action="add-note" data-id="${esc(selected.id)}">Tambah catatan</button><button class="btn" data-action="approve-isolation" data-id="${esc(selected.id)}">Simulasikan isolasi…</button></div><label class="field-label" for="incident-status">Status insiden</label><div class="input-row"><select class="field" id="incident-status"><option value="baru" ${selected.status === 'baru' ? 'selected' : ''}>Baru</option><option value="dianalisis" ${selected.status === 'dianalisis' ? 'selected' : ''}>Dianalisis</option><option value="ditangani" ${selected.status === 'ditangani' ? 'selected' : ''}>Ditangani</option><option value="selesai" ${selected.status === 'selesai' ? 'selected' : ''}>Selesai</option><option value="false_positive" ${selected.status === 'false_positive' ? 'selected' : ''}>False positive</option></select><button class="btn primary" data-action="update-status" data-id="${esc(selected.id)}">Perbarui status</button></div><div class="panel-title" style="margin:18px 0 10px">Timeline</div><div class="timeline">${selected.timeline.slice().reverse().map(t => `<div class="timeline-item"><strong>${esc(t.x)}</strong><small>${fmtTime(t.t)} · ${esc(t.by || 'Sistem')}</small>${t.note ? `<p>${esc(t.note)}</p>` : ''}</div>`).join('')}</div></section></div>`;
}
function addTimeline(incident, text, note = '') { incident.timeline.push({ t: new Date().toISOString(), x: text, by: 'Operator Demo', ...(note ? { note } : {}) }); }
function createIncident(alert) { const existing = state.incidents.find(i => i.alert_ids.includes(alert.id) && !['selesai', 'false_positive'].includes(i.status)); if (existing) { selectedIncident = existing.id; setView('incidents'); toast(`Alert sudah ditautkan ke ${existing.id}.`, 'warn'); return; } const id = `INC-${String(state.nextIncident++).padStart(3, '0')}`; const incident = { id, title: alert.title, alert_ids: [alert.id], status: 'baru', assignee: '', notes: [], timeline: [{ t: new Date().toISOString(), x: `Insiden dibuat dari ${alert.id}`, by: 'Operator Demo' }], created_at: new Date().toISOString(), resolution: null }; state.incidents.unshift(incident); alert.state = 'incident'; selectedIncident = id; save(); setView('incidents'); toast(`Insiden ${id} dibuat.`); }
function openAlert(id) { const a = state.alerts.find(x => x.id === id); if (!a) return; const targetAssets = a.targets.map(getAsset).filter(Boolean); const evidence = a.evidence_event_ids.map(id => state.events.find(e => e.id === id)).filter(Boolean); const actions = `<div class="modal-actions"><button class="btn" data-action="close-alert" data-id="${esc(a.id)}">Tandai ditinjau</button><button class="btn primary" data-action="create-incident" data-id="${esc(a.id)}">Buat insiden</button></div>`; openModal(a.title, `<div class="detail-pairs" style="margin-bottom:12px"><div><small>ID / Rule</small><strong>${esc(a.id)} · ${esc(a.rule)}</strong></div><div><small>Severity / Keyakinan</small><strong>${SEVERITY_LABEL[a.severity]} · ${esc(a.confidence)}</strong></div><div><small>Sumber</small><strong class="mono">${esc(a.src.ip)} ${a.src.known ? '(terdaftar)' : '(tidak dikenal)'}</strong></div><div><small>Waktu</small><strong>${fmtTime(a.t_first)}</strong></div><div><small>Skor risiko</small><strong class="${a.risk >= 75 ? 'text-crit' : 'text-warn'}">${a.risk}/100</strong></div><div><small>Jumlah bukti</small><strong>${evidence.length} event</strong></div></div><div class="detail-card"><h3>Mengapa alert dibuat</h3><p>${esc(a.why)}</p><div class="source-row">${a.sources.map(s => `<span class="source-chip">${esc(SOURCE_LABEL[s] || s)}</span>`).join('')}</div></div><div class="detail-card"><h3>Dampak aset</h3><p>${targetAssets.length ? targetAssets.map(x => `${esc(x.name)} (${esc(x.ip)}), kritikalitas ${x.criticality}/5, pemilik ${esc(x.owner)}`).join('<br>') : 'Sumber atau perangkat belum cocok dengan inventaris aset yang dikelola.'}</p></div><div class="detail-card"><h3>Rincian skor risiko</h3><div class="risk-formula">Base severity ${a.risk_breakdown.base} + kritikalitas aset ${a.risk_breakdown.asset_criticality} + firewall allowed ${a.risk_breakdown.fw_allowed} + penguatan sumber ${a.risk_breakdown.corroboration} = ${a.risk}/100</div></div><div class="detail-card"><h3>Bukti event · pilih event untuk membuka raw</h3><div class="evidence-list">${evidence.map(e => `<button class="evidence-row" data-action="open-event" data-id="${esc(e.id)}"><span>${esc(e.id)} · ${fmtShort(e.ts)}</span><span>${esc(e.src_ip)} → ${esc(e.dst_ip || '—')}:${e.dst_port || '—'} · ${esc(e.action || e.outcome)}</span></button>`).join('')}</div></div><div class="detail-card"><h3>Rekomendasi aman</h3><ol style="padding-left:18px;margin:0">${a.recommendations.map(r => `<li style="font-size:10px;color:var(--muted);padding:3px 0">${esc(r)}</li>`).join('')}</ol></div><p>Tindakan jaringan nyata tidak dijalankan. Mitigasi demo memerlukan persetujuan operator dan hanya mengubah catatan simulasi.</p>`, actions); }
function openEvent(id) { const e = state.events.find(x => x.id === id); if (!e) return; openModal(`Detail event ${e.id}`, `<div class="detail-pairs"><div><small>Waktu UTC</small><strong>${esc(e.ts)}</strong></div><div><small>Sumber</small><strong>${esc(SOURCE_LABEL[e.source] || e.source)}</strong></div><div><small>Alamat sumber</small><strong class="mono">${esc(e.src_ip)}</strong></div><div><small>Alamat tujuan</small><strong class="mono">${esc(e.dst_ip || '—')}${e.dst_port ? `:${e.dst_port}` : ''}</strong></div><div><small>Jenis / layanan</small><strong>${esc(e.kind)} · ${esc(e.service || '—')}</strong></div><div><small>Aksi / hasil</small><strong>${esc(e.action)} / ${esc(e.outcome)}</strong></div></div><div class="detail-card" style="margin-top:13px"><h3>Raw event (JSON)</h3><pre class="mono" style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:9px;color:var(--muted)">${esc(JSON.stringify(e, null, 2))}</pre></div>`, `<div class="modal-actions"><button class="btn" data-action="close-modal">Tutup</button></div>`); }

document.addEventListener('click', e => {
  const button = e.target.closest('[data-action]'); if (!button) return;
  const action = button.dataset.action; const id = button.dataset.id;
  if (action === 'go-view') setView(button.dataset.view);
  else if (action === 'refresh-backend') refreshBackend();
  else if (action === 'backend-event') openBackendEvent(id);
  else if (action === 'run-scenario') beginScenario(document.querySelector('#scenario-select')?.value || activeScenario);
  else if (action === 'pause-scenario') pauseScenario();
  else if (action === 'reset-demo') openModal('Reset sesi demo?', '<p>Event, alert, dan insiden simulasi di browser ini akan dihapus. Aksi ini hanya menghapus data demo lokal.</p>', '<div class="modal-actions"><button class="btn" data-action="close-modal">Batal</button><button class="btn danger" data-action="confirm-reset">Reset demo</button></div>');
  else if (action === 'confirm-reset') resetDemo();
  else if (action === 'open-alert') openAlert(id);
  else if (action === 'open-event') openEvent(id);
  else if (action === 'close-modal' || (action === 'backdrop' && e.target === button)) closeModal();
  else if (action === 'create-incident') { const a = state.alerts.find(x => x.id === id); closeModal(); if (a) createIncident(a); }
  else if (action === 'close-alert') { const a = state.alerts.find(x => x.id === id); if (a) { a.state = 'closed'; save(); closeModal(); render(); toast(`${id} ditandai ditinjau; status alert diperbarui.`); } }
  else if (action === 'select-incident') { selectedIncident = id; render(); }
  else if (action === 'assign-incident') { const i = state.incidents.find(x => x.id === id); if (i) { i.assignee = document.querySelector('#assignee-input').value.trim() || 'Belum ditugaskan'; addTimeline(i, `Penugasan diperbarui: ${i.assignee}`); save(); render(); toast('Penugasan tersimpan.'); } }
  else if (action === 'add-note') { const i = state.incidents.find(x => x.id === id); const note = document.querySelector('#incident-note').value.trim(); if (!note) return toast('Isi catatan sebelum menyimpan.', 'warn'); i.notes.push({ t: new Date().toISOString(), by: 'Operator Demo', text: note }); addTimeline(i, 'Catatan operator ditambahkan', note); save(); render(); toast('Catatan tersimpan pada timeline.'); }
  else if (action === 'update-status') { const i = state.incidents.find(x => x.id === id); const status = document.querySelector('#incident-status').value; i.status = status; if (status === 'selesai') i.resolution = i.notes[i.notes.length - 1]?.text || 'Ditutup oleh operator demo.'; if (status === 'false_positive') i.resolution = 'Ditandai false positive oleh operator demo.'; if (['selesai', 'false_positive'].includes(status)) i.alert_ids.forEach(alertId => { const alert = state.alerts.find(a => a.id === alertId); if (alert) alert.state = 'closed'; }); addTimeline(i, `Status diubah menjadi ${statusLabel(status)}`); save(); render(); toast('Status insiden diperbarui.'); }
  else if (action === 'approve-isolation') { const i = state.incidents.find(x => x.id === id); openModal('Persetujuan simulasi isolasi', `<p>Setujui pencatatan tindakan isolasi simulasi untuk <strong>${esc(i.alert_ids.join(', '))}</strong>? Tidak ada perubahan jaringan yang dilakukan.</p>`, `<div class="modal-actions"><button class="btn" data-action="close-modal">Batal</button><button class="btn primary" data-action="confirm-isolation" data-id="${esc(id)}">Setujui simulasi</button></div>`); }
  else if (action === 'confirm-isolation') { const i = state.incidents.find(x => x.id === id); addTimeline(i, 'Isolasi simulasi disetujui operator', 'Tindakan dicatat untuk demo. Tidak ada host yang diisolasi.'); i.notes.push({ t: new Date().toISOString(), by: 'Operator Demo', text: 'Isolasi simulasi disetujui; tidak ada perubahan jaringan nyata.' }); save(); closeModal(); render(); toast('Persetujuan simulasi tercatat.'); }
  else if (action === 'clear-event-filters') { eventFilters = { source: '', action: '', query: '' }; render(); }
});

document.addEventListener('change', e => {
  if (e.target.id === 'data-mode') {
    dataMode = e.target.value;
    closeModal();
    if (dataMode !== 'demo' && !backendPages.includes(currentView)) setView('overview');
    if (dataMode === 'demo') {
      backendRequest?.abort();
      render();
    } else {
      if (state.run?.status === 'running') pauseScenario();
      refreshBackend();
    }
  }
  if (e.target.id === 'scenario-select') activeScenario = e.target.value;
  if (e.target.id === 'scenario-speed') { scenarioSpeed = Number(e.target.value) || 1; if (state.run?.status === 'running') startScenarioTimer(); }
  if (e.target.id === 'threat-filter') { threatFilter = e.target.value; render(); }
  if (e.target.id === 'event-source') { eventFilters.source = e.target.value; render(); }
  if (e.target.id === 'event-action') { eventFilters.action = e.target.value; render(); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'event-search') { const pos = e.target.selectionStart; eventFilters.query = e.target.value; render(); const next = document.querySelector('#event-search'); next.focus(); next.setSelectionRange(pos, pos); }
});
document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
document.querySelector('#theme-toggle').addEventListener('click', () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; applyTheme(); save(); });
document.querySelector('#mobile-menu').addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); if (e.key.toLowerCase() === 'g' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) document.querySelector('#theme-toggle').click(); });
function applyTheme() { document.documentElement.dataset.theme = state.theme; }
function tickClock() { document.querySelector('#clock').textContent = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date()); }
window.addEventListener('hashchange', () => setView(location.hash.slice(1)));
applyTheme(); tickClock(); setInterval(tickClock, 1000); setView(currentView);

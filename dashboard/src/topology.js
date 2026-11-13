import { ASSETS, CAMPUS_CASES, CAMPUS_WEB } from './data.js';

const nodes = [
  ['external', 'Jaringan eksternal', 'Alamat fixture', 50, 12],
  ['gw-core-01', 'Core Gateway', '10.0.0.1', 50, 31],
  ['sw-core-01', 'Core Switch', '10.0.0.2', 17, 53],
  [CAMPUS_WEB.id, 'WEB-SYA-01', CAMPUS_WEB.ip, 50, 53],
  ['db-srv-01', 'Database', '10.0.1.30', 83, 53],
  ['dns-01', 'DNS', '10.0.0.53', 17, 70],
  ['backup-01', 'Backup', '10.0.1.40', 50, 70],
  ['app-srv-02', 'SIAKAD', '10.0.1.21', 83, 70],
  ['new-device', 'Perangkat baru', 'DHCP simulasi', 17, 89],
  ['ups-core-01', 'UPS Core', 'Telemetri UPS', 50, 89],
  ['cooling-01', 'Pendingin', 'Suhu ruang server', 83, 89],
];
const coordinates = new Map(nodes.map(([id, , , x, y]) => [id, [x, y]]));
const assetIds = new Map(ASSETS.map(asset => [asset.ip, asset.id]));
const links = [
  ['external', 'gw-core-01'], ['gw-core-01', 'sw-core-01'],
  ['gw-core-01', CAMPUS_WEB.id], ['gw-core-01', 'db-srv-01'],
  ['sw-core-01', 'dns-01'], [CAMPUS_WEB.id, 'backup-01'], ['db-srv-01', 'app-srv-02'],
];

function path(ids) {
  return ids.map((id, index) => {
    const [x, y] = coordinates.get(id);
    return `${index ? 'L' : 'M'}${x * 6} ${y * 2.8}`;
  }).join(' ');
}

export function topologyFlow(run) {
  const events = run?.events.slice(0, run.index);
  const event = events?.findLast(item => item.raw?.scenario === run.type) ??
    events?.findLast(item => ['transfer', 'conn', 'fw', 'auth', 'health', 'asset'].includes(item.kind));
  if (!event) return null;
  const resolve = ip => {
    const id = assetIds.get(ip);
    return id ? (coordinates.has(id) ? id : 'sw-core-01')
      : ip.startsWith('10.0.') ? 'sw-core-01' : 'external';
  };
  if (event.kind === 'health') {
    const config = Object.hasOwn(CAMPUS_CASES, run.type) ? CAMPUS_CASES[run.type] : null;
    const value = event.raw?.value;
    const label = config ? (config.metric === 'backup_failed'
      ? `Backup: ${value ? 'gagal' : 'berhasil'}`
      : `${config.label} · ${value} ${config.unit}`)
      : event.raw?.battery_percent != null ? `Baterai UPS · ${event.raw.battery_percent}%`
        : 'Layanan web merespons';
    return {event, from: resolve(event.src_ip), label,
      warning: config ? value >= config.threshold : event.raw?.battery_percent != null};
  }
  const from = event.kind === 'asset' ? 'new-device' : resolve(event.src_ip);
  const to = event.kind === 'asset' ? 'sw-core-01' : resolve(event.dst_ip);
  if (from === to) return {event, from, label: 'Komunikasi pada segmen yang sama'};
  const via = from === 'gw-core-01' || to === 'gw-core-01' ||
    links.some(([a, b]) => (a === from && b === to) || (a === to && b === from))
    ? [] : ['gw-core-01'];
  const warning = event.kind === 'asset' || event.action === 'deny' ||
    (event.kind === 'transfer' && event.raw?.approved_destination === false);
  const label = event.kind === 'asset' ? 'Perangkat baru · DHCP' : event.kind === 'transfer'
    ? `Transfer ${event.raw.bytes_sent / 1024 ** 2} MiB · ${warning ? 'Tujuan belum disetujui' : 'Tujuan disetujui'}`
    : event.kind === 'auth' ? `Autentikasi SSH · ${event.outcome === 'success' ? 'berhasil' : 'gagal'}`
      : `Koneksi · port ${event.dst_port ?? '—'}`;
  return {event, from, to, route: path([from, ...via, to]), label, warning};
}

export function renderTopology(run, esc) {
  const flow = topologyFlow(run);
  const playing = flow && run.status !== 'paused';
  const motion = flow?.route && playing
    ? `<circle class="topo-packet" r="4"><animateMotion dur="${run.status === 'running' ? '0.25s' : '1.4s'}" repeatCount="${run.status === 'running' ? 'indefinite' : '2'}"
        path="${flow.route}"/></circle>` : '';
  return `<div class="topology replay-topology">
    <svg viewBox="0 0 600 280" preserveAspectRatio="none" aria-hidden="true">
      <path class="topo-links" d="${links.map(path).join(' ')}"/>
      ${flow?.route ? `<g class="topo-flow ${flow.warning ? 'warning' : ''}">
        <path class="topo-active" d="${flow.route}" marker-end="url(#topo-arrow)"/>
        ${motion}</g>
        <defs><marker id="topo-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6Z" fill="context-stroke"/></marker></defs>` : ''}
    </svg>
    ${nodes.map(([id, name, ip, x, y]) => {
      const active = flow?.from === id || flow?.to === id;
      const emphasis = active ? `topo-endpoint ${flow.warning ? 'topo-warning' : ''} ${playing && !flow.route ? 'topo-pulse' : ''}` : '';
      return `<div class="topo-node ${emphasis}" style="left:${x}%;top:${y}%">
        <strong>${name}</strong><small>${ip}</small></div>`;
    }).join('')}
  </div><div class="topo-caption">
    ${flow ? `<strong>${esc(flow.label)}</strong><span>${esc(flow.event.src_ip)}${flow.route ? ' → ' + esc(flow.event.dst_ip) : ''}</span>
      <button type="button" class="btn small" data-action="open-event" data-id="${esc(flow.event.id)}">Lihat event</button>`
      : '<span>Jalankan skenario untuk melihat event pada peta.</span>'}
    <small>Rute ilustratif dari replay simulasi.</small></div>`;
}

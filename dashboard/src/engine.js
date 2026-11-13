import { CAMPUS_CASES, CAMPUS_WEB, RULES } from './data.js';

function campusHealthFindings(events) {
  return Object.values(CAMPUS_CASES).flatMap(config => {
    const samples = events.filter(event => event.kind === 'health' && event.asset_id === config.asset &&
      event.source === config.source && event.raw?.simulation === true && event.raw.metric === config.metric)
      .sort((first, second) => first.ts.localeCompare(second.ts));
    const evidence = samples.slice(-3);
    if (evidence.length < 3 || new Set(evidence.map(event => event.ts)).size < 3 ||
        Date.parse(evidence[2].ts) - Date.parse(evidence[0].ts) > 120_000 ||
        !evidence.every(event => Number.isFinite(event.raw.value) && event.raw.value >= config.threshold)) return [];
    const describe = value => config.metric === 'backup_failed' ? (value ? 'gagal' : 'berhasil') : `${value} ${config.unit}`;
    const reason = config.metric === 'backup_failed'
      ? 'Tiga percobaan backup gagal dalam dua menit pada replay simulasi.'
      : `Tiga observasi dalam dua menit mencapai ambang simulasi ${describe(config.threshold)}. Nilai bukti: ${evidence.map(event => describe(event.raw.value)).join(', ')}.`;
    return [{
      rule: config.rule, src_ip: evidence[0].src_ip, title: config.label, severity: 'warn',
      targets: [config.asset], eventIds: evidence.map(event => event.id), sources: [config.source],
      reason, recommendations: [config.action],
    }];
  });
}

function isCampusEgress(event) {
  const raw = event.raw;
  return event.kind === 'transfer' && event.source === 'firewall' &&
    event.asset_id === CAMPUS_WEB.id && event.src_ip === CAMPUS_WEB.ip &&
    event.action === 'allow' && Boolean(event.dst_ip) &&
    raw?.simulation === true && raw.direction === 'outbound' &&
    raw.approved_destination === false &&
    Number.isFinite(raw.bytes_sent) && Number.isFinite(raw.usual_upper_bytes) &&
    raw.usual_upper_bytes >= 0 && raw.bytes_sent > raw.usual_upper_bytes;
}

function campusFinding(events, findings, transfers) {
  const assetId = CAMPUS_WEB.id;
  const byId = new Map(events.map(event => [event.id, event]));
  const scans = findings.filter(f => f.rule === 'R-SCAN-01' && f.targets.includes(assetId));
  const logins = findings.filter(f => f.rule === 'R-BRUTE-01' && f.targets.includes(assetId));
  for (const transfer of transfers) {
    for (const login of logins) {
      const scan = scans.find(f => f.src_ip === login.src_ip);
      const loginEvents = login.eventIds.map(id => byId.get(id));
      const success = loginEvents.find(event =>
        event.asset_id === assetId && event.outcome === 'success' &&
        loginEvents.filter(sample => sample.outcome === 'failure' && sample.ts < event.ts).length >= 8);
      if (!scan || !success) continue;
      const scanEnd = byId.get(scan.eventIds.at(-1));
      const authStart = byId.get(login.eventIds[0]);
      const gap = Date.parse(transfer.ts) - Date.parse(success.ts);
      if (gap <= 0 || gap > 180_000 || scanEnd.ts >= authStart.ts ||
          Date.parse(authStart.ts) - Date.parse(scanEnd.ts) > 120_000) continue;
      return {
        rule: 'R-CAMPUS-01', src_ip: login.src_ip,
        title: 'Dugaan akses tidak sah dan transfer keluar tidak wajar',
        severity: 'crit', targets: [assetId],
        eventIds: [...scan.eventIds, ...login.eventIds, transfer.id],
        sources: [...new Set([...scan.sources, ...login.sources, transfer.source])],
        reason: `Aktivitas jaringan dan login SSH terkait pada ${assetId} diikuti transfer keluar ${transfer.raw.bytes_sent / 1024 ** 2} MiB ke tujuan yang belum disetujui (${transfer.dst_ip}). Ambang pembanding simulasi ${transfer.raw.usual_upper_bytes / 1024 ** 2} MiB. Isi transfer belum diketahui.`,
        recommendations: [
          'Cocokkan waktu login dengan jadwal pemeliharaan dan identitas admin yang berwenang.',
          'Verifikasi tujuan transfer terhadap daftar tujuan backup yang disetujui.',
          'Periksa log akses file dan catat hasil investigasi sebelum menyimpulkan kebocoran.',
        ],
      };
    }
  }
  return null;
}

export function detect(events, assets) {
  const findings = [];
  const knownIps = new Set(assets.map(a => a.ip));
  const knownMacs = new Set(assets.map(a => a.mac.toLowerCase()));
  const groups = new Map();
  for (const e of events) {
    if (!e.src_ip) continue;
    if (!groups.has(e.src_ip)) groups.set(e.src_ip, []);
    groups.get(e.src_ip).push(e);
  }
  for (const list of groups.values()) {
    const eventsBySource = [...list].sort((a, b) => a.ts.localeCompare(b.ts));
    const source = eventsBySource[0];
    if (eventsBySource.some(e => e.kind === 'conn' || e.kind === 'fw')) {
      const scanEvents = eventsBySource.filter(e => e.kind === 'conn' || e.kind === 'fw');
      for (let i = 0; i < scanEvents.length; i++) {
        const start = new Date(scanEvents[i].ts).getTime();
        const window = scanEvents.filter(e => new Date(e.ts).getTime() >= start && new Date(e.ts).getTime() <= start + 30_000);
        const ports = new Set(window.map(e => e.dst_port).filter(Boolean));
        const hosts = new Set(window.map(e => e.dst_ip).filter(Boolean));
        if (ports.size >= 15 || hosts.size >= 10) {
          const evidence = window.filter(e => ports.has(e.dst_port) || hosts.has(e.dst_ip));
          const targets = [...new Set(evidence.map(e => e.asset_id).filter(Boolean))];
          const allowed = evidence.some(e => e.action === 'allow');
          const critical = targets.some(id => (assets.find(a => a.id === id)?.criticality ?? 0) >= 4);
          findings.push({ rule: 'R-SCAN-01', src_ip: source.src_ip, title: 'Aktivitas port scanning terdeteksi', severity: allowed && critical ? 'crit' : 'warn', eventIds: evidence.map(e => e.id), targets, sources: [...new Set(evidence.map(e => e.source))], reason: `${ports.size} port unik diakses dalam jendela 30 detik dari sumber ${source.src_ip}. ${allowed ? 'Sebagian koneksi diizinkan firewall.' : 'Tidak ada koneksi yang diizinkan.'}`, recommendations: ['Verifikasi pemilik perangkat sumber dan konteks aktivitas.', 'Tinjau koneksi yang diizinkan serta aturan firewall terkait.', 'Pertimbangkan segmentasi setelah verifikasi operator.'] });
          break;
        }
      }
    }
    const authEvents = eventsBySource.filter(e => e.kind === 'auth');
    const authByService = new Map();
    for (const event of authEvents) { const key = JSON.stringify([event.service || 'auth', event.asset_id || event.dst_ip]); if (!authByService.has(key)) authByService.set(key, []); authByService.get(key).push(event); }
    for (const serviceEvents of authByService.values()) {
      const service = serviceEvents[0].service || 'auth';
      let match = null;
      for (const startEvent of serviceEvents) {
        const start = new Date(startEvent.ts).getTime();
        const window = serviceEvents.filter(event => { const time = new Date(event.ts).getTime(); return time >= start && time <= start + 60_000; });
        const failures = window.filter(event => event.outcome === 'failure');
        if (failures.length >= 8) { match = { window, failures, successAfterFailures: window.some(event => event.outcome === 'success' && event.ts > failures[7].ts) }; break; }
      }
      if (match) {
        const evidence = match.window;
        const target = evidence.find(e => e.asset_id)?.asset_id;
        findings.push({ rule: 'R-BRUTE-01', src_ip: source.src_ip, title: 'Percobaan autentikasi SSH berulang', severity: match.successAfterFailures ? 'crit' : 'warn', eventIds: evidence.map(e => e.id), targets: target ? [target] : [], sources: [...new Set(evidence.map(e => e.source))], reason: `${match.failures.length} login gagal pada layanan ${service} dalam 60 detik${match.successAfterFailures ? ', diikuti login berhasil.' : '.'}`, recommendations: ['Verifikasi aktivitas login dan pemilik alamat sumber.', 'Tinjau akun terkait dan autentikasi pada server tujuan.', 'Ikuti prosedur respons akses organisasi; perubahan akses perlu persetujuan.'] });
        break;
      }
    }
    const newDevice = eventsBySource.find(e => e.kind === 'asset' && e.src_ip?.startsWith('10.0.') && (!knownIps.has(e.src_ip) || !knownMacs.has((e.src_mac || '').toLowerCase())));
    if (newDevice) findings.push({ rule: 'R-NEWDEV-01', src_ip: newDevice.src_ip, title: 'Perangkat baru terdeteksi di jaringan', severity: 'warn', eventIds: [newDevice.id], targets: [], sources: [newDevice.source], reason: `IP ${newDevice.src_ip} dan MAC ${newDevice.src_mac} belum tercatat di inventaris pada segmen terkelola.`, recommendations: ['Verifikasi identitas perangkat dan pemiliknya.', 'Periksa apakah perangkat seharusnya berada di segmen tersebut.', 'Perbarui inventaris setelah verifikasi.'] });
  }
  const transfers = events.filter(isCampusEgress);
  const campus = campusFinding(events, findings, transfers);
  if (campus) findings.push(campus);
  const transfer = transfers.findLast(event => !campus?.eventIds.includes(event.id));
  if (transfer) findings.push({
    rule: 'R-CAMPUS-EGRESS',
    src_ip: transfer.src_ip,
    title: 'Transfer keluar tidak wajar',
    severity: 'warn',
    targets: [CAMPUS_WEB.id],
    eventIds: [transfer.id],
    sources: [transfer.source],
    reason: `Firewall mencatat ${transfer.raw.bytes_sent / 1024 ** 2} MiB keluar dari ${CAMPUS_WEB.id} ke ${transfer.dst_ip}, tujuan yang belum disetujui. Pembanding normal pada fixture adalah ${transfer.raw.usual_upper_bytes / 1024 ** 2} MiB. Isi transfer belum diketahui.`,
    recommendations: [
      'Cocokkan tujuan dan waktu transfer dengan jadwal backup serta daftar tujuan yang disetujui.',
      'Periksa log akses file dan catat hasil verifikasi dalam insiden demo.',
    ],
  });
  findings.push(...campusHealthFindings(events));
  return dedupeFindings(findings);
}

function dedupeFindings(findings) {
  const seen = new Set();
  return findings.filter(f => { const key = `${f.rule}|${f.src_ip}|${f.targets.join(',')}`; if (seen.has(key)) return false; seen.add(key); return true; });
}

export function calculateRisk(finding, events, assets) {
  const targetAssets = finding.targets.map(id => assets.find(a => a.id === id)).filter(Boolean);
  const criticality = targetAssets.length ? Math.max(...targetAssets.map(a => a.criticality)) : 1;
  const allowed = finding.eventIds.some(id => events.find(e => e.id === id)?.action === 'allow');
  const sourceCount = new Set(finding.eventIds.map(id => events.find(e => e.id === id)?.source).filter(Boolean)).size;
  const base = finding.severity === 'crit' ? 50 : 30;
  const asset = 6 * criticality;
  const firewall = allowed ? 10 : 0;
  const corroboration = 8 * Math.max(0, sourceCount - 1);
  return { score: Math.max(0, Math.min(100, base + asset + firewall + corroboration)), breakdown: { base, asset_criticality: asset, fw_allowed: firewall, corroboration } };
}

export function correlate(finding, events, assets, id) {
  const risk = calculateRisk(finding, events, assets);
  const lastEventId = finding.eventIds[finding.eventIds.length - 1];
  return { id, rule: finding.rule, title: finding.title, severity: finding.severity, risk: risk.score, risk_breakdown: risk.breakdown, confidence: finding.sources.length > 1 ? 'tinggi' : finding.eventIds.length > 5 ? 'sedang' : 'rendah', t_first: events.find(e => e.id === finding.eventIds[0])?.ts || new Date().toISOString(), t_last: events.find(e => e.id === lastEventId)?.ts || new Date().toISOString(), sources: finding.sources, src: { ip: finding.src_ip, known: assets.some(a => a.ip === finding.src_ip) }, targets: finding.targets, impacted: [...new Set(finding.targets)], evidence_event_ids: finding.eventIds, why: finding.reason, recommendations: finding.recommendations, state: 'open' };
}

export { RULES };

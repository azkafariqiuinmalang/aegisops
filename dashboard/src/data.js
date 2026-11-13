export const CAMPUS_WEB = { id: 'WEB-SYA-01', name: 'Web Fakultas Syariah', type: 'Server', ip: '10.0.1.20', mac: '02:00:00:01:00:20', owner: 'Unit TI Kampus', segment: 'Server', criticality: 4, status: 'ok', latency: 4.6 };

export const CAMPUS_CASES = {
  'campus-siakad': {
    rule: 'R-CAMPUS-SIAKAD', label: 'SIAKAD lambat saat pengisian KRS',
    asset: 'app-srv-02', source: 'agent', metric: 'response_ms', unit: 'ms',
    threshold: 1500, values: [320, 1820, 2130, 2480],
    action: 'Periksa antrean aplikasi dan waktu respons database selama pengisian KRS.',
  },
  'campus-storage': {
    rule: 'R-CAMPUS-STORAGE', label: 'Penyimpanan database akademik hampir penuh',
    asset: 'db-srv-01', source: 'agent', metric: 'disk_used_percent', unit: '%',
    threshold: 90, values: [81, 91, 93, 95],
    action: 'Periksa volume log dan data sebelum menjadwalkan penambahan kapasitas.',
  },
  'campus-cooling': {
    rule: 'R-CAMPUS-COOLING', label: 'Suhu ruang server meningkat',
    asset: 'cooling-01', source: 'snmp', metric: 'room_temperature_c', unit: '°C',
    threshold: 30, values: [24, 31, 32, 34],
    action: 'Verifikasi sensor dan minta Unit Fasilitas memeriksa pendingin ruang server.',
  },
  'campus-backup-failure': {
    rule: 'R-CAMPUS-BACKUP', label: 'Backup data akademik gagal berulang',
    asset: 'backup-01', source: 'agent', metric: 'backup_failed', unit: '',
    threshold: 1, values: [0, 1, 1, 1],
    action: 'Tinjau log backup, cek kapasitas tujuan, dan verifikasi cadangan terakhir yang berhasil.',
  },
};

export const ASSETS = [
  { id: 'gw-core-01', name: 'Core Gateway', type: 'Gateway', ip: '10.0.0.1', mac: '02:00:00:00:00:01', owner: 'Jaringan', segment: 'Core', criticality: 5, status: 'ok', latency: 3.2 },
  { id: 'sw-core-01', name: 'Core Switch A', type: 'Switch', ip: '10.0.0.2', mac: '02:00:00:00:00:02', owner: 'Jaringan', segment: 'Core', criticality: 5, status: 'ok', latency: 1.8 },
  CAMPUS_WEB,
  { id: 'app-srv-02', name: 'Server SIAKAD', type: 'Server', ip: '10.0.1.21', mac: '02:00:00:01:00:21', owner: 'Unit TI Kampus', segment: 'Server', criticality: 3, status: 'ok', latency: 5.1 },
  { id: 'db-srv-01', name: 'Database Server', type: 'Server', ip: '10.0.1.30', mac: '02:00:00:01:00:30', owner: 'Data', segment: 'Server', criticality: 5, status: 'ok', latency: 4.1 },
  { id: 'sw-access-01', name: 'Access Switch A', type: 'Switch', ip: '10.0.2.10', mac: '02:00:00:02:00:10', owner: 'Jaringan', segment: 'User', criticality: 3, status: 'ok', latency: 2.4 },
  { id: 'dns-01', name: 'DNS Resolver', type: 'Server', ip: '10.0.0.53', mac: '02:00:00:00:00:53', owner: 'Jaringan', segment: 'Core', criticality: 4, status: 'ok', latency: 2.1 },
  { id: 'ups-core-01', name: 'UPS Core', type: 'UPS', ip: '10.0.0.80', mac: '02:00:00:00:00:80', owner: 'Fasilitas', segment: 'Core', criticality: 4, status: 'warn', latency: null },
  { id: 'cooling-01', name: 'Cooling Unit A', type: 'Pendingin', ip: '10.0.0.81', mac: '02:00:00:00:00:81', owner: 'Fasilitas', segment: 'Core', criticality: 3, status: 'ok', latency: null },
  { id: 'backup-01', name: 'Backup Server', type: 'Server', ip: '10.0.1.40', mac: '02:00:00:01:00:40', owner: 'Data', segment: 'Server', criticality: 3, status: 'ok', latency: 6.2 },
  { id: 'sw-access-02', name: 'Access Switch B', type: 'Switch', ip: '10.0.2.11', mac: '02:00:00:02:00:11', owner: 'Jaringan', segment: 'User', criticality: 2, status: 'ok', latency: 2.7 },
  { id: 'aegis-node-01', name: 'AegisNode Demo', type: 'Sensor', ip: '10.0.0.90', mac: '02:00:00:00:00:90', owner: 'Operasi', segment: 'Core', criticality: 2, status: 'ok', latency: null }
];

export const RULES = [
  { id: 'R-SCAN-01', title: 'Aktivitas port scanning', description: 'Minimal 15 port unik atau 10 host unik dari satu sumber dalam 30 detik.', windowSec: 30, threshold: '15 port / 10 host' },
  { id: 'R-BRUTE-01', title: 'Percobaan login berulang', description: 'Minimal 8 autentikasi gagal untuk layanan yang sama dalam 60 detik. Login berhasil sesudahnya menaikkan severity.', windowSec: 60, threshold: '8 gagal' },
  { id: 'R-NEWDEV-01', title: 'Perangkat baru di segmen terkelola', description: 'IP atau MAC yang tidak terdaftar muncul pada subnet 10.0.0.0/16.', windowSec: 60, threshold: '1 perangkat' }
];

export const SEVERITY_LABEL = { crit: 'Kritis', warn: 'Peringatan', info: 'Informasi', ok: 'Normal' };
export const SOURCE_LABEL = { suricata: 'Suricata (simulasi)', zeek: 'Zeek (simulasi)', firewall: 'Firewall (simulasi)', auth: 'Auth log (simulasi)', snmp: 'SNMP (simulasi)', agent: 'Agen host (simulasi)', aegisnode: 'AegisNode (simulasi)', dhcp: 'DHCP (simulasi)' };

export function mulberry32(seed) {
  let value = seed >>> 0;
  return () => { value += 0x6D2B79F5; let t = value; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function buildScenario(type, seed = 20261113, baseTime = Date.now()) {
  const rand = mulberry32(seed);
  const events = [];
  const event = (offset, fields) => events.push({ id: '', ts: new Date(baseTime + offset * 1000).toISOString(), source: 'zeek', kind: 'conn', src_ip: '10.0.2.25', src_mac: '02:00:00:02:00:25', dst_ip: CAMPUS_WEB.ip, dst_port: 443, proto: 'tcp', action: 'allow', outcome: 'none', service: 'https', asset_id: CAMPUS_WEB.id, raw: {}, ...fields });
  if (Object.hasOwn(CAMPUS_CASES, type)) {
    const config = CAMPUS_CASES[type];
    const asset = ASSETS.find(item => item.id === config.asset);
    config.values.forEach((value, index) => event(index * 60, {
      id: `${type}-${index + 1}`, source: config.source, kind: 'health', service: config.metric,
      src_ip: asset.ip, src_mac: asset.mac, dst_ip: null, dst_port: null, proto: null,
      action: 'none', outcome: config.metric === 'backup_failed' ? (value ? 'failure' : 'success') : 'none',
      asset_id: asset.id,
      raw: {scenario: type, simulation: true, metric: config.metric, value, unit: config.unit},
    }));
    return events;
  }
  if (type === 'campus' || type === 'campus-backup') {
    const suspicious = type === 'campus';
    const raw = fields => ({ scenario: type, simulation: true, ...fields });
    const sourceIp = '198.51.100.25';
    event(0, {id: 'campus-health', source: 'agent', kind: 'health', src_ip: CAMPUS_WEB.ip,
      raw: raw({ service_status: 'up', note: 'Layanan web merespons pada simulasi.' })});
    if (suspicious) {
      [21, 22, 25, 53, 80, 110, 143, 389, 443, 445, 587, 636, 993, 3306, 8080].forEach((port, index) => {
        event(60 + index, {id: 'campus-net-' + index, src_ip: sourceIp, dst_port: port,
          service: 'tcp', action: 'none', raw: raw({ destination_port: port })});
      });
      for (let index = 0; index < 9; index++) {
        const outcome = index === 8 ? 'success' : 'failure';
        event(120 + index * 5, {id: 'campus-auth-' + index, source: 'auth', kind: 'auth',
          src_ip: sourceIp, dst_port: 22, service: 'ssh', action: 'none', outcome,
          raw: raw({ account: 'admin-demo', result: outcome })});
      }
    }
    event(300, {id: 'campus-transfer', source: 'firewall', kind: 'transfer', src_ip: CAMPUS_WEB.ip,
      dst_ip: suspicious ? '203.0.113.77' : '10.0.1.40', action: 'allow',
      raw: raw({ direction: 'outbound', bytes_sent: 180 * 1024 ** 2,
        usual_upper_bytes: 20 * 1024 ** 2, approved_destination: !suspicious,
        scheduled_backup: !suspicious })});
    return events;
  }
  for (let i = 0; i < 12; i++) {
    const port = [53, 80, 123, 443][Math.floor(rand() * 4)];
    event(i * 2, { id: `ev-bg-${i + 1}`, source: i % 2 ? 'zeek' : 'suricata', dst_ip: i % 3 ? '10.0.1.20' : '10.0.0.53', dst_port: port, service: ({ 53: 'dns', 80: 'http', 123: 'ntp', 443: 'https' })[port], asset_id: i % 3 ? CAMPUS_WEB.id : 'dns-01', src_ip: `10.0.2.${10 + i}`, raw: { scenario: 'background-normal', detail: 'Koneksi normal sintetis' } });
  }
  if (type === 'scan') {
    const ports = [22, 80, 443, 445, 3389, 8080, 8443, 1433, 3306, 5432, 25, 110, 161, 8081, 9000, 9200, 27017, 6379];
    ports.forEach((port, i) => event(i, { id: `ev-scan-${i + 1}`, source: i % 3 === 0 ? 'firewall' : 'zeek', kind: i % 3 === 0 ? 'fw' : 'conn', src_ip: '10.0.3.45', src_mac: '02:00:00:03:00:45', dst_port: port, service: `port-${port}`, action: i < 3 ? 'allow' : 'deny', asset_id: i % 4 === 0 ? 'db-srv-01' : CAMPUS_WEB.id, raw: { scenario: 'scan', port, decision: i < 3 ? 'allow' : 'deny', note: 'Event sintetis; tidak ada paket jaringan yang dikirim.' } }));
  } else if (type === 'brute') {
    for (let i = 0; i < 9; i++) event(i * 5, { id: `ev-brute-${i + 1}`, source: i % 2 ? 'auth' : 'zeek', kind: 'auth', src_ip: '10.0.2.77', src_mac: '02:00:00:02:00:77', dst_ip: '10.0.1.30', dst_port: 22, service: 'ssh', outcome: i === 8 ? 'success' : 'failure', action: 'none', asset_id: 'db-srv-01', raw: { scenario: 'brute', user: 'demo-operator', result: i === 8 ? 'success' : 'failure', note: 'Event login sintetis.' } });
  } else if (type === 'newdev') {
    event(3, { id: 'ev-newdev-1', source: 'dhcp', kind: 'asset', src_ip: '10.0.4.88', src_mac: '02:00:00:04:00:88', dst_ip: '10.0.4.1', dst_port: 67, service: 'dhcp', action: 'allow', outcome: 'success', asset_id: null, raw: { scenario: 'newdev', hostname: 'workstation-demo-88', segment: 'Server', note: 'Perangkat contoh tidak terdaftar.' } });
  } else if (type === 'infra') {
    event(4, { id: 'ev-infra-1', source: 'snmp', kind: 'health', src_ip: '10.0.0.80', dst_ip: '10.0.0.80', service: 'ups', action: 'none', outcome: 'none', asset_id: 'ups-core-01', raw: { scenario: 'infra', battery_percent: 18, temperature_c: 41, note: 'Telemetri UPS simulasi.' } });
  }
  return events.sort((a, b) => a.ts.localeCompare(b.ts));
}

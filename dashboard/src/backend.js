export function backendView(view, data, {esc, badge, heading, simulation}) {
  const mode = simulation ? 'Simulasi tersimpan' : 'Observasi lab';
  const title = {
    overview: 'Overview', network: 'Inventaris Aset', hardware: 'Hardware Health',
    events: 'Security Event Analysis', threats: 'Cyber Threat Detection',
  }[view] || 'Overview';
  const header = heading(title, mode + ' · FastAPI dan SQLite',
    '<button type="button" class="btn" data-action="refresh-backend">Muat ulang</button>');
  const empty = text => '<p class="empty-state">' + esc(text) + '</p>';
  if (!data) return header + empty('Memuat data API…');
  if (data.error) return header + '<p role="alert">' + esc(data.error) + '</p>';

  const {assets, events, findings} = data;
  const metric = (label, value, unit = '') => value == null ? '' :
    '<div><small>' + esc(label) + '</small><strong>' + esc(value.toLocaleString('id-ID')) +
    esc(unit) + '</strong></div>';
  const assetList = assets.map(item => {
    const {asset, collector, observation} = item;
    const metrics = item.asset_status === 'up' ? observation?.details?.metrics : null;
    const status = item.asset_status === 'up' ? badge('Up', 'ok') : badge('Unknown', 'warn');
    return `<article class="detail-card"><h3>${esc(asset.hostname || asset.asset_id)} ${status}</h3>
      <p>${esc(asset.asset_id)} · ${esc(asset.role || 'Aset')} · ${esc(asset.ip.join(', ') || 'IP belum tersedia')}</p>
      <p>${esc(collector?.source.type || 'Collector')} · ${esc(collector?.status || 'Belum ada observasi')}
      ${collector?.reason ? ' · ' + esc(collector.reason) : ''}</p>
      ${collector ? '<p><time>' + esc(collector.checked_at) + '</time></p>' : ''}
      <div class="detail-pairs">
      ${metric('Memori terpakai', metrics?.memory_used_percent, '%')}
      ${metric('Load 1 menit', metrics?.load_1m)}
      ${metric('Uptime', metrics?.uptime_seconds, ' detik')}</div></article>`;
  }).join('') || empty('Belum ada aset terdaftar. Daftarkan aset lewat API untuk melihat statusnya.');

  const eventList = events.map(event => `<tr>
    <td>${esc(event.timestamp)}</td><td>${esc(event.event_type)}</td>
    <td>${esc(event.asset?.asset_id || '—')}</td><td>${esc(event.source.name)}</td>
    <td><button class="btn small" data-action="backend-event" data-id="${esc(event.event_id)}">Detail</button></td></tr>`).join('');
  const timeline = eventList ? `<div class="table-wrap"><table><thead><tr>
    <th>Waktu UTC</th><th>Event</th><th>Aset</th><th>Sumber</th><th>Bukti</th>
    </tr></thead><tbody>${eventList}</tbody></table></div>` : empty('Belum ada event untuk mode ini.');
  const detected = findings.map(finding => `<details class="detail-card"><summary>
    ${esc(finding.rule_id)} · ${esc(finding.title)}</summary>
    <p>${esc(finding.asset_id)} · ${esc(finding.source_ip)} · ${esc(finding.first_seen)} → ${esc(finding.last_seen)}</p>
    <p>Hitungan ${esc(finding.count)} · ambang ${esc(finding.threshold)} · jendela ${esc(finding.window_seconds)} detik</p>
    <p>${esc(finding.recommended_action)}</p>
    <div class="evidence-list">${finding.source_event_ids.map(id => `<button class="evidence-row"
      data-action="backend-event" data-id="${esc(id)}">${esc(id)}</button>`).join('')}</div>
    </details>`).join('') || empty('Belum ada temuan pada event yang dimuat.');

  const panel = (label, html) => `<section class="panel backend-panel">
    <h2 class="panel-title">${label}</h2>${html}</section>`;
  if (view === 'network' || view === 'hardware') return header + panel('Kesehatan aset', assetList);
  if (view === 'events') return header + panel('Event terbaru', timeline);
  if (view === 'threats') return header + panel('Hasil evaluasi', detected);
  const cards = [
    ['Aset terdaftar', assets.length],
    ['Aset Up', assets.filter(item => item.asset_status === 'up').length],
    ['Event dimuat', events.length],
    ['Temuan', findings.length],
  ].map(([label, count]) => `<div class="kpi-card"><div class="kpi-top">${label}</div>
    <div class="kpi-value">${count}</div></div>`).join('');
  return header + `<div class="kpi-grid">${cards}</div><div class="dashboard-grid">
    ${panel('Kesehatan aset', assetList)}${panel('Hasil evaluasi', detected)}</div>` +
    panel('Event terbaru', timeline);
}

export function mountWokwiPanel(root) {
  root.innerHTML = `<section class="panel" style="margin-bottom:16px" aria-labelledby="wokwi-title">
    <div class="panel-head"><div><h2 class="panel-title" id="wokwi-title">AegisNode · Wokwi</h2>
    <div class="panel-subtitle">ESP32 DevKit + DHT22 · Telemetri simulasi</div></div>
    <a class="btn" href="https://wokwi.com/projects/new/esp32" target="_blank" rel="noopener noreferrer">Buka template ESP32 di Wokwi</a></div>
    <details>
      <summary>Siapkan proyek AegisNode di Wokwi</summary>
      <ol>
        <li>Ganti isi tab sketch.ino dan diagram.json di Wokwi dengan file di bawah.</li>
        <li>Di Library Manager, tambahkan DHT sensor library for ESPx dan PubSubClient.</li>
        <li>Isi MQTT_TOPIC di sketch dengan nilai AEGISOPS_MQTT_TOPIC yang dipakai saat FastAPI dijalankan, lalu tekan Play.</li>
      </ol>
      <div class="actions">
        <a class="btn" href="/api/hardware/wokwi/files/sketch.ino">sketch.ino</a>
        <a class="btn" href="/api/hardware/wokwi/files/diagram.json">diagram.json</a>
        <a class="btn" href="/api/hardware/wokwi/files/libraries.txt">libraries.txt</a>
      </div>
    </details>
    <p data-wokwi-status role="status">Memuat telemetri…</p>
    <div class="detail-pairs"><div><small>Suhu terakhir</small><strong data-wokwi-temp>—</strong></div>
    <div><small>Kelembapan terakhir</small><strong data-wokwi-humidity>—</strong></div></div>
    <p class="panel-subtitle" data-wokwi-time></p>
  </section>`;
  const status = root.querySelector('[data-wokwi-status]');
  const temperature = root.querySelector('[data-wokwi-temp]');
  const humidity = root.querySelector('[data-wokwi-humidity]');
  const time = root.querySelector('[data-wokwi-time]');

  async function poll() {
    if (!root.isConnected) return;
    try {
      const response = await fetch('/api/hardware/wokwi', {cache: 'no-store', signal: AbortSignal.timeout(4000)});
      if (response.status === 404) {
        status.textContent = 'Endpoint telemetri belum tersedia (HTTP 404). Buka dashboard dari proses FastAPI AEGISOPS versi terbaru.';
        return;
      }
      if (!response.ok) throw new Error('Telemetry request failed');
      const [latest] = await response.json();
      if (!latest) {
        status.textContent = 'API siap. Menunggu sampel Wokwi dari MQTT atau pengiriman manual.';
      } else {
        const {temperature_c, humidity_percent} = latest.details;
        const age = Math.max(0, Math.floor((Date.now() - Date.parse(latest.timestamp)) / 1000));
        const warning = temperature_c >= 30 || humidity_percent >= 70;
        status.textContent = age >= 15 ? 'Offline · heartbeat terakhir sudah lebih dari 15 detik'
          : warning ? 'Perlu pemeriksaan · ambang demo terlampaui' : 'Online · pembacaan normal';
        temperature.textContent = temperature_c.toFixed(1) + ' °C';
        humidity.textContent = humidity_percent.toFixed(1) + '% RH';
        time.textContent = 'Sampel diterima ' + new Date(latest.timestamp).toLocaleString('id-ID');
      }
    } catch {
      status.textContent = 'API Wokwi belum dapat diakses. Jalankan dashboard melalui FastAPI.';
    } finally {
      if (root.isConnected) setTimeout(poll, 2500);
    }
  }
  poll();
}

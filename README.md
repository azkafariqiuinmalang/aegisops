# AEGISOPS - Event Ingestion dan Host Monitoring

Fondasi ingestion lokal menggunakan Python 3.11+, FastAPI, dan SQLite. Paket rancangan proyek tersedia di [AEGISOPS_agent_docs_v0.1](AEGISOPS_agent_docs_v0.1/README.md).

## Jalankan di PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe -m uvicorn aegisops.main:app --host 127.0.0.1 --port 8000
```

SQLite dibuat saat startup di `var/aegisops.sqlite3`. Set `$env:AEGISOPS_DB_PATH` sebelum startup untuk memakai path lain. `.env.example` mendokumentasikan variabel tersebut. Aplikasi membaca environment proses.

Di terminal PowerShell lain dari root proyek:

```powershell
$base = 'http://127.0.0.1:8000'
$body = Get-Content -Raw tests/fixtures/ssh_failure.json
$event = Invoke-RestMethod -Uri "$base/events" -Method Post -ContentType 'application/json' -Body $body
Invoke-RestMethod -Uri "$base/events/$($event.event_id)"
```

## Kontrak M1

- `POST /events` menerima satu event yang mengikuti format fixture dan [skema event](AEGISOPS_agent_docs_v0.1/EVENT_SCHEMA.md). API mengisi `event_id` dan `ingested_at`. Respons `201` berarti event baru, `200` berarti event yang sama sudah tercatat, `422` berarti input invalid, dan `413` berarti payload di atas 64 KiB.
- `GET /events/{event_id}` mengembalikan event tersimpan atau `404`. Gangguan operasi SQLite mendapat `503`.
- Timestamp input wajib memiliki zona waktu dan disimpan dalam UTC. Event dengan `simulation: true` dan status `observed` atau `normalized` dipetakan ke `simulated`. Status gangguan tetap bisa dibawa bersama penanda simulasi.
- Deduplikasi memakai penanda simulasi, tipe sumber, nama sumber, dan ID asli. Saat ID asli kosong, fingerprint SHA-256 dihitung dari representasi JSON event yang sudah divalidasi dan timestamp yang sudah dinormalisasi. Pengiriman ulang mempertahankan record pertama.
- Model `Asset`, `Alert`, dan `CollectorStatus` tersedia. Jalankan API development di loopback.

## Demo M2 dengan data simulasi

Dengan API berjalan di loopback, jalankan dari root proyek di terminal kedua. Jika memakai database khusus, set `AEGISOPS_DB_PATH` ke path yang sama di kedua terminal.

```powershell
$base = 'http://127.0.0.1:8000'
$asset = @{ asset_id = 'lab-host'; role = 'linux-server' } | ConvertTo-Json
Invoke-RestMethod -Uri "$base/assets" -Method Post -ContentType 'application/json' -Body $asset
.\.venv\Scripts\python.exe -m aegisops.host_health lab-host --fixture tests/fixtures/node_exporter.prom
Invoke-RestMethod -Uri "$base/assets/lab-host/health?simulation=true" | ConvertTo-Json -Depth 10
```

`POST /assets` membuat atau memperbarui metadata aset berdasarkan `asset_id`.
`GET /assets/{asset_id}/health` membaca hasil collector terakhir untuk data aktual secara default.
Gunakan `simulation=true` untuk fixture. Observasi terakhir disimpan terpisah untuk setiap mode. Aset yang belum terdaftar mendapat `404`.

Pada host Linux lab yang menjalankan Node Exporter dan menggunakan database lokal yang sama dengan API, jalankan `python -m aegisops.host_health lab-host`. Collector membaca `http://127.0.0.1:9100/metrics` sekali per eksekusi. Gunakan `--port` jika port exporter berbeda. Hasil sukses mencatat load rata-rata satu menit, metrik memori, dan uptime jika sumber menyediakan sampelnya. Timestamp adalah waktu pembacaan dalam UTC. `load_1m` adalah load average dan menggunakan satuan load Linux.

Respons menyertakan event sumber yang dapat dibaca melalui `GET /events/{event_id}`. `up` menunjukkan exporter berhasil dibaca. Poll gagal menyimpan event `collector_error`, mengembalikan exit code 1, dan membuat status aset `unknown`. Hasil yang lebih lama dari lima menit juga menghasilkan status `unknown` sambil tetap menampilkan observasi terakhir. Untuk pemantauan berkala, jalankan collector melalui penjadwal host dengan interval di bawah lima menit.

Tahap ini mencakup satu host Linux melalui Node Exporter. ICMP dan latency perangkat jaringan, SNMP, dashboard, alert, serta autentikasi masih dalam roadmap.

## M3 — Deteksi berbasis event

Buka `AEGISOPS_Prototype.html` di browser untuk mencoba empat skenario sintetis. Pilih **Aktivitas mencurigakan** untuk melihat bukti per aturan, lalu ubah jendela dan ambang. Skenario **Trafik berulang** memakai lima koneksi ke satu port, sehingga jumlah port uniknya tetap satu. Dashboard menghitung aturan atas fixture lokal di browser.

Jalankan API lokal dengan perintah setup di atas dan gunakan Swagger di `http://127.0.0.1:8000/docs`.

1. Kirim record JSON ke `POST /security/ssh-failures` atau `POST /security/tcp-connections`. Kedua endpoint menerima `timestamp` berzona waktu, `record_id`, `source_name`, `asset_id`, dan `src_ip`. Koneksi TCP juga memerlukan `dst_ip` dan `dst_port`. Gunakan nama sumber yang stabil serta ID unik per record dalam sumber tersebut. Query `simulation` default ke `true`.
2. Ambil `event_id` dari respons dan kirim daftar ID tersebut ke `POST /security/evaluate` dengan bentuk `{"event_ids": ["<uuid>"]}`. Daftar dibatasi hingga 250 ID. Untuk mengganti default lab, sertakan `policy` dengan `window_seconds`, `ssh_failures`, atau `distinct_ports`.
3. Gunakan `source_event_ids` pada hasil untuk membuka bukti lewat `GET /events/{event_id}`. Evaluasi menghasilkan temuan pertama per kelompok dalam batch tersebut dan dapat diulang.

DET-001 mencari empat kegagalan SSH dari IP sumber yang sama pada satu aset dalam 60 detik. DET-002 mencari lima port TCP tujuan unik dari IP sumber yang sama ke satu IP tujuan pada satu aset dalam 60 detik. Keduanya mengevaluasi data aktual dan simulasi secara terpisah.

Endpoint menerima record terstruktur dari feed yang sudah diproses. Adapter live untuk Wazuh/journald dan sensor pasif Zeek/Suricata masih perlu diintegrasikan dan diuji. Tampilan dashboard hackathon berjalan dengan fixture. Penyimpanan alert, korelasi lintas sumber, dan lifecycle tindak lanjut masuk M4.

## Dashboard utama

Jalankan Uvicorn seperti langkah setup, lalu buka http://127.0.0.1:8000.
FastAPI menyajikan UI dari folder `dashboard/` melalui `/dashboard/`.

- **Demo browser** memakai skenario dan insiden lokal dari UI
  [agnigaluhev-svg/AegisOps](https://github.com/agnigaluhev-svg/AegisOps).
- **Simulasi tersimpan** menampilkan observasi simulasi di SQLite. Jalankan demo M2 untuk mengisi kesehatan host, atau kirim event simulasi lewat API M3.
- **Observasi lab** menampilkan event aktual dan health collector yang tercatat. Inventaris memakai aset terdaftar. Aset tanpa observasi dalam mode terpilih tampil sebagai Unknown.

Mode backend memuat maksimum 100 event terbaru secara default. Temuan dihitung dari event tersebut memakai kebijakan DET-001 dan DET-002 bawaan. Detail bukti diambil dari endpoint event. Gunakan **Muat ulang** setelah collector atau ingestion dijalankan. Predictive Maintenance dan Incident Management tersedia pada demo browser.

### Demo pusat data kampus

Pada **Demo browser → Overview**, jalankan **Kampus - Dugaan kebocoran web Syariah**. Skenario fiktif berlatar UIN Maulana Malik Ibrahim Malang dan memakai aset sintetis `WEB-SYA-01`.

1. Lihat status web pada event kesehatan dan jalankan replay hingga selesai.
2. Buka **Cyber Threat Detection** dan pilih **Dugaan akses tidak sah dan transfer keluar tidak wajar**. Bukti mencakup event jaringan, autentikasi, dan transfer keluar. Isi transfer belum diketahui.
3. Pilih **Buat insiden**, catat hasil pemeriksaan awal, lalu ubah status ke **Dianalisis**.
4. Untuk membandingkan hasil secara bersih, reset sesi demo dan jalankan **Kampus - Backup terjadwal**. Transfer pembanding memiliki volume yang sama, tetapi tujuan backup telah disetujui dan alert korelasi tidak muncul.

Replay dan korelasi kasus kampus berjalan di browser. Insiden demo tersimpan pada browser yang sama.

Peta topologi pada **Overview** dan **Network Monitoring** mengikuti event komunikasi terakhir yang sudah diputar. Panah dan indikator bergerak mengikuti arah sumber ke tujuan. Transfer ke tujuan yang belum disetujui ditandai amber. Saat replay dijeda atau perangkat memakai preferensi pengurangan gerakan, arah tetap terlihat melalui panah dan alamat sumber serta tujuan. Pilih **Lihat event** di bawah peta untuk membuka bukti.

Untuk melihat peringatan dari komunikasi server saja, pilih **Kampus - Transfer keluar tidak wajar**. Web tetap merespons dan replay hanya berisi observasi kesehatan serta catatan transfer firewall. Rule `R-CAMPUS-EGRESS` memicu satu peringatan ketika volume keluar 180 MiB melampaui pembanding simulasi 20 MiB dan tujuan belum disetujui. Pada skenario gabungan, transfer yang sama masuk ke bukti alert korelasi. **Kampus - Backup terjadwal** menggunakan volume yang sama dengan tujuan yang disetujui.

Empat replay operasional tambahan tersedia pada pemilih skenario kampus.

| Skenario | Bukti yang memicu peringatan |
|---|---|
| SIAKAD lambat saat pengisian KRS | Tiga observasi waktu respons mencapai ambang demo 1.500 ms. |
| Penyimpanan database akademik hampir penuh | Tiga observasi penggunaan disk mencapai 90%. |
| Suhu ruang server meningkat | Tiga observasi suhu mencapai 30 °C. |
| Backup data akademik gagal berulang | Tiga percobaan backup gagal. |

Masing-masing replay menyertakan satu observasi awal normal, lalu tiga observasi yang memenuhi ambang dalam dua menit waktu simulasi. Temuan, bukti, dan rekomendasi tersedia di **Cyber Threat Detection**. Untuk review per kasus, reset sesi demo agar temuan dari replay sebelumnya tidak ikut tampil.

Skenario telemetri menyorot node aset dengan denyut, termasuk SIAKAD, database, pendingin, backup, dan UPS. Nilai terakhir serta tautan **Lihat event** tetap terlihat setelah replay selesai. Skenario DHCP menampilkan arah dari perangkat baru ke segmen jaringan kampus.

### AegisNode dengan Wokwi dan MQTT

1. Buat proyek ESP32 DevKit di Wokwi. Salin sketch.ino dan diagram.json dari hardware/wokwi. Tambahkan library DHT sensor library for ESPx dan PubSubClient dari libraries.txt.
2. Buat topic unik untuk sesi demo. Di PowerShell, gunakan:

   ```powershell
   $env:AEGISOPS_MQTT_TOPIC = "aegisops/demo/$([guid]::NewGuid().ToString('N'))/telemetry"
   $env:AEGISOPS_MQTT_TOPIC
   ```

   Salin hasilnya ke MQTT_TOPIC dalam sketch. Untuk deployment, set nilai yang sama pada environment service FastAPI. Topic adalah alamat pesan publik. Broker ini hanya untuk data sintetis.
3. Instal requirements.txt dan jalankan FastAPI. Server memulai subscriber jika AEGISOPS_MQTT_TOPIC diisi. Broker default broker.hivemq.com pada TCP 1883.
4. Jalankan Wokwi dengan Public IoT Gateway. Buka **Demo browser → Hardware Health** dan cocokkan suhu serta kelembapan dengan Serial Monitor. Ubah slider DHT22 untuk memverifikasi pembaruan. Geser sakelar heartbeat ke kanan untuk menghentikan pengiriman. Panel beralih ke Offline setelah 15 detik tanpa sampel baru.

Alur data adalah ESP32 virtual → MQTT → FastAPI → SQLite → Hardware Health. Pesan MQTT dipublikasikan tanpa retain. Dashboard membaca API dari origin yang sama.

Untuk deployment, gunakan satu proses Uvicorn pada layanan Python atau kontainer yang terus berjalan, izinkan koneksi keluar TCP 1883, dan arahkan AEGISOPS_DB_PATH ke volume persisten yang bisa ditulis. Contoh start command:

```sh
uvicorn aegisops.main:app --host 0.0.0.0 --port "${PORT:-8000}"
```

Gunakan deployment demo terisolasi dengan data sintetis. Frontend statis saja tidak menjalankan FastAPI, dan runtime yang menghentikan proses saat idle tidak dapat mempertahankan subscriber MQTT. Untuk menjalankan alur lokal, ikuti perintah Uvicorn dengan bind loopback di atas.

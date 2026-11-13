# AEGISOPS --- Architecture (MVP)

## 1. Gambaran umum

Arsitektur MVP menggunakan pipeline modular:

`Data Sources → Collectors/Adapters → Normalizer → Event Store → Correlator/Detection → Alert & Recommendation API → Dashboard`

Komponen dapat berjalan pada satu Linux host saat prototyping. Pisahkan
modul secara logis agar kelak dapat dipindah ke layanan terpisah.

## 2. Sumber data

  ------------------------------------------------------------------------------
  Sumber                  Data                           Metode awal
  ----------------------- ------------------------------ -----------------------
  Linux server            CPU, RAM, disk, uptime,        Prometheus Node
                          network interface              Exporter

  Linux security          SSH login success/failure,     Wazuh integration atau
                          privilege/auth events          journald/syslog

  Network device          Reachability, latency,         ICMP dan SNMP read-only
                          interface status/counters      

  Network traffic         Metadata koneksi, scan         Zeek atau Suricata pada
                          indicators, DNS/connection     sensor Linux pasif
                          events                         

  Network device logs     Link up/down,                  Syslog jika perangkat
                          authentication/configuration   mendukung
                          events                         
  ------------------------------------------------------------------------------

Tidak semua sumber harus aktif pada hari pertama. Implementasikan
adapter secara bertahap dan tampilkan status integrasi dengan jelas.

## 3. Komponen

### A. Collectors / adapters

Mengambil data dari sumber eksternal. Masing-masing adapter memiliki: -
konfigurasi endpoint/credential melalui environment/secret; - timeout
dan retry terbatas; - health status; - parser dan validasi; - metadata
sumber.

### B. Normalizer

Mengubah format spesifik sumber ke skema event AEGISOPS pada
`EVENT_SCHEMA.md`. Simpan referensi ke raw event jika kebijakan retensi
mengizinkan.

### C. Event store

Penyimpanan awal dapat berupa PostgreSQL atau database yang sudah
digunakan repository. Jangan menambahkan database baru sebelum memeriksa
stack aktual. Pisahkan tabel/collection untuk: - devices/assets; -
raw/source events (bila dibutuhkan); - normalized events; - alerts; -
alert evidence; - collector status.

### D. Detection engine

Mulai dari rule-based detection yang transparan: - threshold; -
frequency/window; - baseline sederhana bila data cukup; - kombinasi
beberapa sinyal.

Setiap rule memiliki ID, versi, deskripsi, kondisi, severity, dan test
fixture.

### E. Correlator

Menghubungkan event menggunakan: - asset/device ID; - source/destination
IP; - hostname; - timestamp dan time window; - event category; -
identitas akun jika relevan dan tersedia.

Korelasi harus menyimpan alasan dan daftar event sumber.

### F. Alert & recommendation service

Menghasilkan alert yang dapat ditinjau operator. Rekomendasi adalah
panduan manual, bukan eksekusi tindakan.

### G. Dashboard

Tampilan minimum: - ringkasan kesehatan perangkat; - daftar perangkat
dan status collector; - timeline event; - daftar alert menurut
severity/status; - detail alert berisi bukti, alasan deteksi, sumber,
dan rekomendasi.

## 4. Aliran data contoh

1.  SNMP poller membaca status interface router/switch menggunakan akun
    read-only.
2.  ICMP health check mengukur reachability dan latency.
3.  Node Exporter menyajikan metrik host Linux.
4.  Wazuh mengirim event autentikasi SSH.
5.  Zeek/Suricata pada sensor lab mengirim metadata/event jaringan.
6.  Adapter menormalisasi semua event.
7.  Correlator menghubungkan kegagalan SSH berulang dari IP tertentu
    dengan event scan dari sumber yang sama dalam jendela waktu.
8.  Detection engine membuat alert beserta bukti.
9.  Dashboard menampilkan alert dan rekomendasi pemeriksaan.

Korelasi di atas adalah contoh skenario pengujian, bukan klaim bahwa
semua sumber sudah tersedia.

## 5. Penempatan sensor dan hardware

-   **Linux host / Ubuntu VM:** tempat awal menjalankan backend,
    database, collector, dan dashboard dalam lab.
-   **Network sensor:** Linux host/VM dengan interface yang menerima
    salinan trafik dari port mirror/SPAN/TAP atau virtual switch lab.
-   **ESP32-S3:** opsional sebagai node telemetry/heartbeat/tamper atau
    demonstrator hardware. Bukan alat packet capture, bukan pengganti
    Zeek/Suricata/Wazuh, dan tidak dipasang seri di antara backbone dan
    subnet.
-   **Mini-PC:** belum wajib untuk MVP lab. Pertimbangkan ketika
    membutuhkan sensor Linux dedicated, dua interface jaringan,
    penyimpanan/buffering lokal, atau operasi 24/7.
-   **Backbone:** jangan memasang prototype inline. Untuk observasi
    trafik, minta konfigurasi SPAN/TAP dari administrator jaringan.

## 6. Ketahanan pipeline

-   Collector tidak boleh membuat dashboard/backend gagal total saat
    satu sumber mati.
-   Gunakan timeout, retry dengan backoff, dan status `degraded`.
-   Hindari event ganda dengan deduplication key.
-   Beri batas ukuran event dan queue.
-   Catat waktu event dari sumber dan waktu diterima sistem.
-   Jika storage tidak tersedia, jangan diam-diam membuang event;
    tampilkan error dan log status.

## 7. Deployment prototyping

Mulai dengan satu host Linux/Ubuntu VM. Gunakan Docker Compose hanya
jika repository dan kapasitas host mendukung. Pastikan port layanan
dibatasi ke localhost atau jaringan lab. Simpan konfigurasi di `.env`,
sediakan `.env.example`, dan jangan commit secret.

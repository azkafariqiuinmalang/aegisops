# AEGISOPS --- MVP Roadmap

## Prinsip

Implementasikan secara bertahap. Target pertama adalah pipeline data
yang dapat dipercaya, bukan dashboard yang terlihat ramai. Jangan
melompat ke AI/predictive maintenance sebelum kualitas data dan deteksi
dasar tervalidasi.

## Milestone 0 --- Repository reconnaissance

**Pekerjaan** - Inspeksi stack, folder, konfigurasi, database, test, dan
dokumentasi. - Identifikasi komponen yang sudah tersedia. - Buat gap
analysis terhadap dokumen AEGISOPS.

**Selesai jika** - Ada laporan kondisi repository. - Tidak ada perubahan
kode yang tidak diminta. - Stack dan cara menjalankan proyek telah
dikonfirmasi.

## Milestone 1 --- Data model & ingestion foundation

**Pekerjaan** - Definisikan model asset, normalized event, alert, dan
collector status. - Implementasikan event ingestion API atau message
interface sesuai stack. - Buat validasi, timestamp UTC, deduplication,
dan error handling. - Siapkan fixture data `simulated`.

**Selesai jika** - Event valid dapat masuk dan dibaca kembali. - Event
invalid ditolak dengan error yang jelas. - Event simulasi diberi
label. - Test parser/validator lulus.

## Milestone 2 --- Infrastructure health monitoring

**Pekerjaan** - Integrasi metrik Linux server (Node Exporter/Prometheus
atau yang sudah tersedia). - Implementasi ICMP health check untuk
perangkat lab. - Tambahkan SNMP read-only jika perangkat dan kredensial
tersedia. - Tampilkan status perangkat, latency, metrik, dan collector
health.

**Selesai jika** - Perangkat lab dapat didaftarkan. - Status `up`,
`down`, `unknown`, dan `collector_error` dibedakan. - Metrik memiliki
timestamp dan sumber. - Dashboard menunjukkan data aktual atau label
simulasi dengan jelas.

## Milestone 3 --- Security event ingestion & network detection

**Pekerjaan** - Integrasi Wazuh atau sumber log keamanan host. -
Tambahkan satu network sensor pasif (Zeek atau Suricata) di lab. -
Implementasikan rule DET-001 dan DET-002 dengan fixture. -
Dokumentasikan kebutuhan sensor dan keterbatasan visibility.

**Selesai jika** - Event autentikasi host dapat dinormalisasi. - Event
jaringan dapat dinormalisasi. - Rule memiliki test positif dan
negatif. - Tidak ada packet capture di jaringan tanpa izin.

## Milestone 4 --- Correlation & alerting

**Pekerjaan** - Implementasikan korelasi berbasis asset/IP/time
window. - Simpan bukti dan alasan rule. - Buat alert lifecycle: new,
acknowledged, investigating, resolved, false_positive. - Buat
rekomendasi respons manual.

**Selesai jika** - Alert merujuk ke event sumber. - Operator dapat
memahami alasan alert dibuat. - Korelasi tidak menyatakan kompromi tanpa
bukti. - Pengujian membuktikan kasus positif dan negatif.

## Milestone 5 --- Dashboard & operational readiness

**Pekerjaan** - Dashboard health overview. - Device inventory/status. -
Event timeline. - Alert list dan alert detail. - Dokumentasi setup,
konfigurasi, backup, retensi, dan troubleshooting.

**Selesai jika** - Alur demo end-to-end dapat diulang. - Kegagalan satu
collector tidak menjatuhkan seluruh aplikasi. - Tidak ada secret di
repository. - Langkah deployment lab terdokumentasi.

## Di luar MVP

-   Automated blocking/remediation.
-   Inline backbone deployment.
-   AI anomaly detection produksi tanpa evaluasi.
-   Predictive maintenance matang.
-   Integrasi OT/alutsista produksi.

## Skenario demo minimum

1.  Daftarkan satu Linux server dan satu perangkat jaringan lab.
2.  Tampilkan metrik kesehatan server.
3.  Simulasikan perangkat tidak merespons atau interface down
    menggunakan fixture/lingkungan lab.
4.  Kirim event autentikasi gagal dari fixture atau skenario lab yang
    diizinkan.
5.  Masukkan event network scan yang telah direkam/disimulasikan.
6.  Tunjukkan korelasi dan alert beserta bukti.
7.  Tunjukkan rekomendasi respons manual dan status tindak lanjut.

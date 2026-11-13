# AEGISOPS --- Detection, Correlation & Response

## 1. Tujuan

Menyediakan deteksi awal yang dapat dijelaskan dan rekomendasi
pemeriksaan bagi operator. Pada MVP, deteksi menggunakan rule-based
logic; machine learning bukan prasyarat.

## 2. Use case awal

  -----------------------------------------------------------------------
  ID                Use case          Sinyal minimum    Catatan
  ----------------- ----------------- ----------------- -----------------
  DET-001           SSH               Event login       Integrasi
                    authentication    gagal, sumber IP, Wazuh/journald
                    failures berulang time window       

  DET-002           Port scan         Event koneksi ke  Zeek/Suricata
                    indicator         banyak port/host  atau metadata
                                      dalam window      sensor

  DET-003           Device            ICMP/SNMP timeout Collector error
                    availability      atau status       harus dibedakan
                    degradation       interface         dari device down

  DET-004           Server resource   CPU/RAM/disk      Gunakan durasi
                    pressure          threshold         agar spike sesaat
                                      berkelanjutan     tidak langsung
                                                        alert

  DET-005           Cross-source      Event jaringan +  Simpan event
                    correlation       keamanan host     pendukung dan
                                      dengan IP/asset   alasan korelasi
                                      dan waktu terkait 

  DET-006           Collector health  Polling gagal,    Alert tentang
                    failure           queue menumpuk,   observability,
                                      source tidak      bukan otomatis
                                      mengirim data     serangan
  -----------------------------------------------------------------------

## 3. Format rule

Setiap rule minimal mendefinisikan: - `rule_id` dan `version`; - nama
dan deskripsi; - sumber data yang diperlukan; - kondisi dan time
window; - severity dan confidence; - pengecualian/false-positive yang
diketahui; - bukti yang harus disimpan; - test positif dan negatif.

Jangan membuat threshold universal tanpa konteks. Threshold awal harus
dapat dikonfigurasi dan ditandai sebagai default lab.

## 4. Korelasi event

Contoh logika konseptual: - Ada beberapa event `ssh_login_failed` dari
`src_ip` yang sama dalam jendela waktu tertentu. - Sensor jaringan
melaporkan koneksi ke banyak port dari `src_ip` tersebut. - Kedua event
memiliki timestamp yang berdekatan dan target asset yang konsisten. -
Correlator membuat satu alert gabungan dengan daftar ID event pendukung.

Korelasi tidak boleh menyimpulkan kompromi berhasil hanya dari kegagalan
login dan port scan. Gunakan bahasa seperti **"indikasi aktivitas
pemindaian yang berdekatan dengan kegagalan autentikasi"**, bukan
**"server berhasil diretas"**.

## 5. Alert object

Alert minimal berisi: - `alert_id` - `rule_id` dan versi - `title` -
`severity` - `confidence` atau tingkat keyakinan bila dihitung secara
eksplisit - `first_seen`, `last_seen` - `affected_assets` -
`source_event_ids` - `reason` / alasan rule terpenuhi - `evidence` /
nilai yang mendukung - `recommended_actions` - `status` (new,
acknowledged, investigating, resolved, false_positive) - `created_at`

## 6. Rekomendasi respons

Rekomendasi harus aman, spesifik, dan dapat diverifikasi. Contoh: -
Periksa log autentikasi pada host dan rentang waktu terkait. - Validasi
apakah sumber IP merupakan scanner internal yang disetujui. - Periksa
status interface dan log perangkat jaringan. - Periksa utilisasi
CPU/RAM/disk dan tren sebelum alert. - Tinjau rule firewall yang berlaku
melalui prosedur change management.

Hindari rekomendasi seperti "langsung blokir IP" sebagai tindakan
otomatis. Jika pemblokiran dipertimbangkan, tampilkan sebagai keputusan
operator sesuai SOP dan persetujuan administrator.

## 7. Prioritas alert

-   `info`: perubahan informatif.
-   `low`: anomali ringan, dampak belum terlihat.
-   `medium`: indikator perlu ditinjau operator.
-   `high`: beberapa bukti konsisten atau dampak layanan signifikan.
-   `critical`: gangguan/risiko besar yang didukung bukti kuat dan perlu
    eskalasi segera.

Severity harus mempertimbangkan dampak, cakupan, durasi, dan kualitas
bukti; jangan menaikkan severity hanya karena nama event terdengar
berbahaya.

## 8. Anti-noise

-   Gunakan grouping dan deduplication.
-   Terapkan cooldown yang dapat dikonfigurasi.
-   Beri konteks maintenance window bila tersedia.
-   Simpan alasan alert digabung atau ditekan.
-   Sediakan mekanisme acknowledge dan false-positive feedback.

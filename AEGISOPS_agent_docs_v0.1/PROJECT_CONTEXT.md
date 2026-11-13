# Project Context --- AEGISOPS

## 1. Identitas proyek

**Nama:** AEGISOPS\
**Tagline:** Infrastructure Security & Health Intelligence\
**Deskripsi:** Platform untuk memantau keamanan dan kondisi kesehatan
infrastruktur jaringan serta server, membantu operator mengenali risiko,
memahami kejadian, dan menentukan respons berdasarkan bukti.

AEGISOPS mengadopsi gagasan *ECU untuk infrastruktur digital*: satu
sistem pemantauan yang mengumpulkan sinyal dari komponen infrastruktur,
memahami kondisi operasional dan keamanannya, lalu menyajikan informasi
yang dapat ditindaklanjuti operator.

## 2. Masalah yang ingin diselesaikan

Operasional jaringan dan server sering dipantau melalui beberapa alat
yang terpisah. Informasi keamanan, ketersediaan perangkat, performa, dan
log tidak selalu terlihat dalam satu konteks. Akibatnya: - Gangguan
konektivitas atau degradasi perangkat terlambat diketahui. - Aktivitas
jaringan mencurigakan dapat terlewat atau sulit ditelusuri. - Event dari
perangkat jaringan dan sistem keamanan tidak mudah dikorelasikan. -
Operator menerima banyak alert, tetapi kekurangan konteks untuk
menentukan prioritas. - Dokumentasi insiden dan bukti teknis tersebar di
berbagai sumber.

## 3. Sasaran pengembangan pertama

Fase pertama membangun MVP yang mampu:

1.  **Memantau infrastruktur jaringan**\
    Mengambil status ketersediaan dan kesehatan perangkat melalui
    mekanisme yang sesuai, misalnya ICMP/health check, SNMP, dan
    syslog/API bila tersedia.

2.  **Mendeteksi aktivitas jaringan mencurigakan**\
    Mengidentifikasi pola awal seperti lonjakan koneksi, port scanning,
    koneksi gagal berulang, atau komunikasi yang tidak biasa dari
    metadata trafik/log. Deteksi harus berbasis data yang benar-benar
    dikumpulkan.

3.  **Mengorelasikan event perangkat jaringan dan sistem keamanan**\
    Menyatukan event dari network collector/perangkat jaringan dengan
    event keamanan host, misalnya Wazuh, menggunakan timestamp, alamat
    IP, hostname, jenis event, dan jendela waktu.

4.  **Memberikan peringatan dini dan rekomendasi respons**\
    Menyajikan tingkat prioritas, alasan alert, bukti pendukung, dampak
    potensial, dan langkah pemeriksaan/mitigasi yang aman. Pada MVP,
    rekomendasi bersifat informatif dan memerlukan persetujuan operator.

5.  **Memantau kesehatan perangkat**\
    Memantau reachability, latency, packet loss bila tersedia,
    penggunaan CPU/RAM/disk pada server, serta metrik perangkat jaringan
    yang diekspos.

## 4. Target pengguna

-   Operator jaringan / system administrator.
-   Tim keamanan informasi / SOC.
-   Pengelola infrastruktur yang membutuhkan gambaran kondisi keamanan
    dan kesehatan layanan.

## 5. Ruang lingkup MVP

### Termasuk

-   Linux server sebagai host collector dan backend awal.
-   Pengumpulan metrik kesehatan server menggunakan Prometheus Node
    Exporter atau exporter sejenis.
-   Pengumpulan status perangkat jaringan melalui SNMP dan/atau ICMP.
-   Pengumpulan log keamanan host, dengan Wazuh sebagai integrasi awal
    bila tersedia.
-   Network traffic metadata / event detection melalui sensor Linux
    pasif seperti Zeek atau Suricata pada lab.
-   Normalisasi event ke satu skema internal.
-   Korelasi rule-based sederhana.
-   Dashboard status, daftar event, alert, dan detail bukti.
-   Rekomendasi respons manual yang tidak melakukan perubahan
    konfigurasi.

### Tidak termasuk dalam MVP

-   Pemblokiran IP otomatis, perubahan firewall, atau konfigurasi
    switch/router otomatis.
-   Inline deployment di jalur backbone.
-   Deep packet inspection terhadap payload terenkripsi atau klaim dapat
    membaca seluruh isi komunikasi.
-   Prediksi kerusakan berbasis machine learning / predictive
    maintenance matang.
-   Integrasi OT/alutsista atau protokol industri sebagai fitur
    produksi.
-   Klaim deteksi AI tanpa dataset, evaluasi, dan metrik yang dapat
    diuji.

## 6. Tahapan pengembangan

-   **Tahap 1 --- MVP:** Linux server dan network infrastructure
    monitoring, event ingestion, deteksi dasar, korelasi, alert,
    rekomendasi, dashboard.
-   **Tahap 2:** Perluasan integrasi perangkat jaringan, peningkatan
    cakupan protokol, dan kualitas korelasi.
-   **Tahap 3:** Predictive maintenance dan analitik lanjutan setelah
    data historis cukup.
-   **Visi jangka panjang:** Ekspansi ke lingkungan OT dan infrastruktur
    kritis sesuai izin, kebutuhan, dan validasi keselamatan.

## 7. Prinsip produk

-   Evidence first: setiap alert harus menunjuk ke sumber data dan waktu
    kejadian.
-   Passive by default: observasi dahulu, tidak mengubah trafik.
-   Explainable: jelaskan mengapa alert dibuat.
-   Modular: collector, normalizer, correlator, API, dan UI dipisahkan.
-   Interoperable: gunakan protokol dan format terbuka jika
    memungkinkan.
-   Human in the loop: operator tetap memutuskan respons.
-   Secure by design: kredensial, akses, retensi, dan audit harus
    diperhatikan sejak awal.

## 8. Indikator keberhasilan MVP

-   Perangkat yang dikonfigurasi dapat ditampilkan statusnya.
-   Metrik kesehatan server dapat dikumpulkan dan ditampilkan.
-   Event keamanan dan jaringan dapat masuk ke pipeline dengan timestamp
    dan sumber.
-   Minimal satu skenario deteksi jaringan dan satu skenario keamanan
    host dapat diuji ulang.
-   Korelasi menghasilkan hubungan event yang dapat dijelaskan, bukan
    sekadar menggabungkan alert secara acak.
-   Alert menampilkan bukti, prioritas, dan rekomendasi.
-   Sistem tidak melakukan pemblokiran atau perubahan jaringan otomatis.

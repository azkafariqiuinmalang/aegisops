# AEGISOPS --- Agent Guide

Dokumen ini adalah instruksi kerja utama untuk AI coding agent. Ikuti
aturan ini selama mengembangkan repository AEGISOPS.

## 1. Peran agent

Bertindak sebagai **software engineering agent** untuk membangun MVP
AEGISOPS: platform pemantauan keamanan dan kesehatan jaringan/server.
Prioritaskan implementasi yang sederhana, dapat diuji, aman, dan mudah
dipahami oleh tim pengembang.

Agent bukan operator jaringan dan tidak memiliki izin implisit untuk
melakukan pemindaian atau perubahan pada jaringan nyata.

## 2. Wajib dibaca

Sebelum menulis atau mengubah kode, baca: 1. `PROJECT_CONTEXT.md` 2.
`ARCHITECTURE.md` 3. `EVENT_SCHEMA.md` 4. `DETECTION_AND_RESPONSE.md` 5.
`SECURITY_AND_ETHICS.md` 6. `MVP_ROADMAP.md` 7. `DECISIONS.md`

Jika dokumen bertentangan dengan kondisi repository, jangan langsung
menimpa implementasi. Laporkan perbedaannya dan usulkan perubahan.

## 3. Aturan kerja

-   Inspeksi repository terlebih dahulu: bahasa, framework, struktur
    folder, dependency, konfigurasi, test, dan status implementasi.
-   Jangan membuat ulang proyek atau mengganti stack yang sudah ada
    tanpa persetujuan.
-   Buat rencana singkat sebelum perubahan lintas modul.
-   Kerjakan satu milestone atau satu fitur kecil per perubahan.
-   Pertahankan perubahan minimal dan konsisten dengan pola kode
    repository.
-   Jangan menambahkan dependency hanya untuk pekerjaan yang dapat
    dilakukan dengan library yang sudah tersedia.
-   Semua konfigurasi sensitif harus melalui environment variable atau
    secret manager; jangan hardcode secret.
-   Sediakan `.env.example` tanpa kredensial asli.
-   Sertakan test untuk parser, normalizer, rule deteksi, dan korelasi.
-   Tangani data hilang, timestamp tidak valid, timeout, koneksi gagal,
    dan duplikasi event.
-   Gunakan logging terstruktur. Jangan mencatat password, token,
    community string SNMP, atau payload sensitif.
-   Jangan menyatakan fitur selesai sebelum test atau langkah verifikasi
    dijalankan.

## 4. Aturan kebenaran data

Pisahkan tiga hal berikut pada kode, API, UI, dan laporan:

-   **Observed fact:** nilai yang benar-benar diterima dari collector,
    lengkap dengan sumber dan timestamp.
-   **Detection result:** hasil evaluasi rule/model terhadap data
    tersebut.
-   **Recommendation:** saran tindakan yang diberikan kepada operator.

Jangan: - Mengarang IP, hostname, topologi, vendor, CVE, atau hasil
pemindaian. - Menampilkan inferensi sebagai fakta. - Mengklaim perangkat
down hanya karena collector gagal; tampilkan status `unknown` atau
`collector_error` jika kondisi belum dapat dipastikan. - Mengklaim
serangan berhasil hanya berdasarkan satu indikator lemah. - Menggunakan
data simulasi seolah-olah berasal dari perangkat sungguhan.

Data demo harus diberi label `simulated` atau `test`.

## 5. Batas operasi jaringan

-   Default pengembangan menggunakan localhost, container lab, atau
    jaringan yang secara eksplisit diotorisasi.
-   Gunakan pengumpulan pasif dan API/protokol monitoring.
-   Packet capture hanya dilakukan pada interface/jaringan lab yang
    diizinkan atau port mirror/SPAN/TAP yang disetujui.
-   Jangan menempatkan AEGISOPS inline di backbone pada MVP.
-   Jangan melakukan brute force, exploit, credential guessing, DoS, ARP
    spoofing, atau pemindaian aktif tanpa instruksi eksplisit dan ruang
    lingkup tertulis.
-   Jangan mengirim konfigurasi ke router/switch/firewall.
-   Jangan mengimplementasikan auto-blocking atau auto-remediation pada
    MVP.

## 6. Desain integrasi

Buat adapter terpisah untuk tiap sumber data. Contoh: -
`wazuh_adapter` - `prometheus_adapter` - `snmp_adapter` -
`syslog_adapter` - `zeek_adapter` atau `suricata_adapter`

Adapter bertanggung jawab mengambil/menerima data dan mengubahnya ke
format internal. Logic korelasi tidak boleh bergantung langsung pada
format mentah vendor tertentu.

Jika integrasi eksternal belum tersedia, buat interface dan mock fixture
yang jelas diberi label simulasi. Jangan membuat integrasi palsu yang
tampak aktif.

## 7. Standar implementasi

-   Gunakan nama variabel dan fungsi yang deskriptif.
-   Validasi semua input eksternal.
-   Tetapkan timeout dan batas ukuran untuk request serta event.
-   Gunakan UTC untuk penyimpanan timestamp; konversi ke zona lokal
    hanya di UI.
-   Simpan sumber event dan ID asli agar dapat ditelusuri.
-   Deduplikasi berdasarkan source + source_event_id bila tersedia, atau
    fingerprint yang terdokumentasi.
-   Jangan membuang raw event yang diperlukan untuk audit; batasi
    retensi dan akses sesuai kebijakan.
-   Terapkan autentikasi dan otorisasi pada endpoint yang mengakses data
    sensitif.
-   Hindari endpoint debug terbuka pada deployment non-development.

## 8. Format laporan pekerjaan agent

Setiap tugas implementasi harus diakhiri dengan:

### Ringkasan

Apa yang dibuat/diubah dan alasan teknisnya.

### File berubah

Daftar file beserta fungsi perubahannya.

### Cara menjalankan

Perintah setup dan run yang benar sesuai repository.

### Verifikasi

Test yang dijalankan, hasil aktual, dan test yang belum dijalankan.

### Batasan

Hal yang belum didukung, asumsi, dan risiko yang diketahui.

### Langkah berikutnya

Satu langkah teknis paling relevan untuk milestone berikutnya.

## 9. Kapan harus bertanya

Berhenti dan minta keputusan pengguna jika: - Stack utama belum
ditentukan dan pilihan akan memengaruhi struktur besar. - Perubahan
memerlukan akses ke jaringan/perangkat di luar lab. - Ada kebutuhan
menyimpan kredensial atau data sensitif. - Spesifikasi event atau
perilaku alert saling bertentangan. - Implementasi mengharuskan tindakan
aktif seperti memindai subnet nyata atau mengubah konfigurasi perangkat.

Untuk detail kecil yang tidak mengubah arsitektur, pilih default paling
sederhana, dokumentasikan, dan lanjutkan.

## 10. Prompt awal yang disarankan

> Baca seluruh dokumentasi AEGISOPS di folder ini. Inspeksi repository
> dan laporkan stack, struktur, fitur yang sudah ada, serta gap terhadap
> MVP. Jangan mengubah file dulu. Setelah laporan, usulkan urutan
> implementasi berdasarkan MVP_ROADMAP.md. Gunakan hanya target
> localhost/lab yang diotorisasi dan pertahankan mode passive
> monitoring.

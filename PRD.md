# PRD — UI Dashboard AEGISOPS

**Status** · Draft untuk review tim hackathon  
**Tanggal** · 13 November 2026  
**Baseline** · Prototipe M3, `AEGISOPS_Prototype.html` versi 1  
**Target desain** · Dashboard M3 yang siap didemokan, dengan alur investigasi M4 sebagai pengembangan berikutnya

## 1. Tujuan produk

Operator perlu melihat kesehatan infrastruktur dan menelusuri alasan sebuah temuan tanpa berpindah antara tampilan metrik dan log. Dashboard menyatukan ringkasan aset, kondisi collector, linimasa event, dan bukti deteksi.

Untuk demo hackathon, penilai harus bisa membuka prototipe, memilih skenario, mengubah jendela deteksi, dan menjelaskan alasan sebuah temuan muncul atau hilang. Target uji tim adalah menyelesaikan alur ini dalam dua menit tanpa arahan.

## 2. Pengguna dan prioritas

| Pengguna | Kebutuhan utama |
|---|---|
| Operator jaringan atau server | Mengetahui aset mana yang bisa dipantau, collector mana yang gagal, serta kapan data terakhir diamati. |
| Analis keamanan | Memeriksa aturan yang terpenuhi, melihat event sumber, dan menentukan langkah pemeriksaan. |
| Penilai hackathon | Mencoba skenario berulang dengan hasil konsisten dan memahami fitur yang ditunjukkan. |

| Prioritas | Cakupan |
|---|---|
| **P0 · Review hackathon** | Ringkasan, kesehatan aset, linimasa, kontrol skenario dan aturan, serta bukti DET-001/DET-002. Baseline M3 sudah menyediakan fungsi inti. Kriteria akses link dan aksesibilitas perlu diuji. |
| **P1 · M4** | Alert korelasi, detail bukti lintas sumber, filter status, dan pencatatan tindak lanjut. |
| **P2 · M5** | Inventaris lengkap, data lab melalui API, filter waktu dan sumber, serta state pemuatan dan pemulihan. |

## 3. Tata letak dan interaksi

Gunakan satu halaman utama untuk demo. Pada desktop, letakkan kesehatan aset dan linimasa dalam dua kolom dengan panel evaluasi di bawahnya. Pada layar sempit, susun panel dalam satu kolom dengan urutan ringkasan, kesehatan aset, linimasa, lalu hasil evaluasi. Pada M4, detail alert dapat dibuka dalam panel samping di desktop atau tampilan penuh di ponsel.

| Area | Elemen dan perilaku | Prioritas |
|---|---|---|
| Header | Identitas AEGISOPS, judul **Monitoring Infrastruktur**, dan label **DATA SIMULASI** yang tetap terlihat saat menelusuri halaman demo. | P0 |
| Kontrol demo | Empat pilihan skenario dengan satu pilihan aktif. Pilihan awal **Operasi normal**. Kontrol jendela 15/30/60 detik, ambang SSH 3/4/5, dan ambang port unik 4/5/6. Perubahan menghitung ulang hasil tanpa memuat ulang halaman. Saat berganti skenario, pertahankan pengaturan aturan. | P0 |
| Ringkasan | Tampilkan jumlah aset, collector bermasalah, dan temuan skenario. Temuan skenario mencakup gangguan collector dan temuan keamanan yang tampil di panel evaluasi. | P0 |
| Kesehatan aset | Tampilkan nama, status aset, sumber dan status collector. Server Linux menampilkan penggunaan memori dan load satu menit. Gateway lab menampilkan latency dari fixture ICMP. | P0 |
| Linimasa | Urutkan event terbaru terlebih dahulu. Setiap baris menampilkan waktu UTC, ID, ringkasan, dan sumber. Perubahan ambang menghitung ulang evaluasi dengan event skenario yang sama. | P0 |
| Hasil evaluasi | Setiap temuan dapat dibuka untuk membaca ID aturan, hitungan, ambang, jendela, ID bukti, dan langkah pemeriksaan. Jika kosong, tampilkan **Ambang deteksi belum terpenuhi pada skenario ini**. | P0 |
| Daftar dan detail alert | Tampilkan prioritas, status, aset, waktu terakhir, aturan, alasan, bukti, dan langkah pemeriksaan. Pemilihan ID bukti membuka event yang sesuai. Filter status dan prioritas mengubah isi daftar. | P1 |

## 4. Semantik status dan sumber data

| Keadaan | Tampilan yang diharapkan |
|---|---|
| Metrik host diterima | Aset `Up`, collector `Sehat`, metrik dan sumber ditampilkan. Status `Up` pada server berarti exporter berhasil dibaca. |
| Collector gagal | Collector `Error`, aset `Unknown`, dan tampilkan waktu serta alasan kegagalan. Metrik aktif disembunyikan. Jika data terakhir ditampilkan pada versi API, beri label **Observasi terakhir** dan timestamp. |
| Observasi kedaluwarsa | Aset dan collector `Unknown`. Pada jalur API host, ambang saat ini lima menit. |
| Belum ada observasi | Tampilkan **Belum ada observasi**. Nilai metrik yang belum tersedia ditampilkan sebagai **—**. |
| Kegagalan mengambil panel | Tampilkan pesan spesifik dan tombol **Coba lagi** pada panel tersebut. Panel yang berhasil dimuat tetap bisa dipakai. Berlaku saat UI memakai API. |

Untuk demo, angka memori **25%**, load **0,35**, dan latency **4,2 ms** berasal dari fixture. Jalur API lokal menyediakan health host melalui `GET /assets/{asset_id}/health` dan bukti melalui `GET /events/{event_id}`. UI publik versi M3 menjalankan skenario di browser. Koneksi API lab, telemetry perangkat nyata, dan tindakan otomatis terhadap perangkat berada di luar cakupan demo.

## 5. Alur operator dan kriteria penerimaan

| ID | Langkah pengujian | Hasil yang diharapkan |
|---|---|---|
| UI-01 | Buka prototipe dalam kondisi awal. | Mode simulasi terlihat, dua aset tampil, nol collector bermasalah, dan nol temuan. |
| UI-02 | Pilih **Gangguan collector**. | Server menjadi `Unknown`, collector menunjukkan `Error`, metrik aktif tersembunyi, dan bukti timeout `EVT-003` tersedia. Gateway tetap tampil. |
| UI-03 | Pilih **Trafik berulang** dengan nilai default. | Lima koneksi ke port yang sama muncul pada linimasa. DET-002 menghasilkan nol temuan. |
| UI-04 | Pilih **Aktivitas mencurigakan** dengan jendela 60 detik, ambang SSH 4, dan ambang port unik 5. | Dua temuan muncul. DET-001 menunjukkan empat kegagalan SSH. DET-002 menunjukkan lima port tujuan berbeda. ID bukti cocok dengan linimasa. |
| UI-05 | Ubah jendela menjadi 15 detik pada skenario aktivitas mencurigakan. | Kedua temuan hilang dan linimasa tetap menunjukkan event yang sama. Kembalikan ke 60 detik untuk mengulang hasil awal. |
| UI-06 | Coba lebar layar 360 px dan navigasi keyboard. | Kontrol, panel, dan bukti dapat dibaca tanpa scroll horizontal. Urutan fokus mengikuti tata letak, fokus terlihat, dan bukti dapat dibuka serta ditutup dengan keyboard. |
| UI-07 | Buka link submission di sesi browser baru tanpa akun tim. | Prototipe terbuka dan skenario bisa dijalankan tanpa login atau setup. Status saat PRD dibuat: akses URL Vercel untuk penilai eksternal masih perlu diselesaikan. |

## 6. Desain visual dan aksesibilitas

- Pertahankan nuansa dashboard gelap dengan latar `#0A1119`, panel `#101C28`, aksen hijau `#63E6BF`, dan amber `#FFCA76`. Gunakan Inter dengan fallback system UI. Gunakan monospace untuk timestamp dan ID event.
- Pakai teks pada setiap status agar artinya tetap terbaca tanpa mengandalkan warna. Beri label yang terlihat pada semua kontrol dan bedakan pilihan aktif dengan indikator visual serta state programatis.
- Gunakan `aria-live` untuk pembaruan ringkasan dan hasil secara ringkas. Pertahankan fokus saat skenario atau ambang berubah. Untuk detail M4, kembalikan fokus ke pemicu setelah panel ditutup.
- Letakkan satuan di dekat angka. Gunakan detik untuk jendela, milidetik untuk latency, persen untuk memori, dan label UTC untuk timestamp.

## 7. Usulan UI M4

Saat backend menyimpan alert dari temuan yang cocok berdasarkan IP sumber, aset, dan jendela korelasi, tampilkan satu alert dengan alasan dan kedua kelompok bukti. Saat syarat korelasi gagal, temuan individu tetap terlihat di panel evaluasi. Gunakan judul **Indikasi aktivitas jaringan terkait kegagalan SSH** dan uraikan kecocokan yang diamati.

| State | Label UI | Usulan tindakan |
|---|---|---|
| `new` | Baru | Tandai diketahui |
| `acknowledged` | Diketahui | Mulai investigasi |
| `investigating` | Dalam investigasi | Selesaikan atau tandai false positive |
| `resolved` | Selesai | Tampilkan hasil tindak lanjut |
| `false_positive` | False positive | Tampilkan alasan penutupan |

Detail alert menampilkan **Alasan**, **Event pendukung**, dan **Langkah pemeriksaan**. Saat perubahan status disimpan, UI memperbarui detail dan daftar dari respons backend. Jika penyimpanan gagal, status sebelumnya tetap terlihat dan operator dapat mencoba ulang. Uji M4 dengan pasangan event yang cocok, aset yang berbeda, dan waktu di luar jendela.

## 8. Checklist review tim

- [ ] Jalankan UI-01 sampai UI-07 dan catat hasil aktual per perangkat.
- [ ] Minta satu anggota tim menjalankan skenario keamanan tanpa panduan dan menjelaskan alasan kedua temuan.
- [ ] Pastikan bukti yang ditampilkan dapat dicocokkan dengan ID pada linimasa.
- [ ] Siapkan alur rekaman demo dari operasi normal ke gangguan collector, trafik berulang, lalu aktivitas mencurigakan.
- [ ] Verifikasi akses link di luar akun pemilik sebelum submission.

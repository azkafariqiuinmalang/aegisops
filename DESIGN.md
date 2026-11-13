# DESIGN.md — Dashboard AEGISOPS

## 1. Arah visual

Gunakan dashboard admin Nexora pada gambar referensi sebagai acuan komposisi. Ciri utamanya adalah sidebar terang, topbar tipis, kartu ringkasan dengan ikon berwarna, grafik di bagian tengah, dan tabel serta aktivitas di bagian bawah. Terapkan hierarki tersebut pada pekerjaan operator AEGISOPS. Saat halaman dibuka, pengguna melihat kondisi aset, status pengumpulan data, lalu bukti yang perlu ditinjau.

Tema **light** pada dokumen ini menjadi acuan visual untuk desain ulang. `PRD.md` tetap menjadi acuan perilaku produk, skenario demo, dan kriteria penerimaan. Gunakan UI berbahasa Indonesia dengan istilah teknis yang dipakai AEGISOPS, seperti collector, event, dan alert.

## 2. Pemetaan referensi ke AEGISOPS

| Elemen referensi | Padanan AEGISOPS | Isi dan fungsi |
|---|---|---|
| Sidebar dengan item aktif biru | Navigasi dashboard | **Ringkasan**, **Kesehatan Aset**, **Linimasa Event**, dan **Hasil Evaluasi**. Pada M3, tautan menuju bagian dalam halaman yang sama. |
| Topbar dengan kontrol global | Header operasional | Nama dashboard dan label **Data simulasi**. Filter rentang waktu untuk data API dapat ditambahkan ketika sumber mendukungnya. |
| Empat kartu statistik | Kartu ringkasan | **Aset terpantau**, **Aset Up**, **Collector bermasalah**, dan **Temuan skenario**. Hitung dari skenario aktif. |
| Revenue Overview | Aktivitas event | Grafik batang jumlah event per interval. Pada fixture M3, kelompokkan per 10 detik UTC. Sumbu Y menggunakan hitungan bulat. |
| Orders by Status | Kesehatan aset | Tampilkan jumlah aset per status atau daftar ringkas dengan nama, status, dan sumber. Pada fixture dua aset, prioritaskan daftar agar nama dan penyebab status terlihat. |
| Traffic by Source | Event menurut sumber | Donat berdasarkan sumber event jika distribusi membantu pembacaan. Legenda mencantumkan sumber dan jumlah. Sediakan daftar angka yang sama untuk pembaca layar. |
| Recent Orders | Linimasa event | Tabel berisi waktu UTC, ID, event, aset, dan sumber. Urutkan dari waktu terbaru. |
| Activity Feed | Hasil evaluasi | Temuan aturan dan gangguan collector. Buka item untuk melihat bukti dan langkah pemeriksaan. |

Gunakan grafik yang bisa dihitung dari event pada skenario aktif. Tampilkan memori, load satu menit, dan latency sebagai nilai observasi pada kartu aset. Grafik tren metrik membutuhkan beberapa observasi bertimestamp dari sumber yang sama.

## 3. Tata letak responsif

| Lebar viewport | Shell | Susunan konten |
|---|---|---|
| ≥ 1280 px | Sidebar 208 px, topbar 60 px, padding konten 24 px | Grid 12 kolom. Empat kartu KPI masing-masing 3 kolom. Baris analitik terbagi 6/3/3. Bagian bawah memakai 8 kolom untuk linimasa dan 4 untuk evaluasi. |
| 1024–1279 px | Sidebar ringkas 64 px dengan nama tautan yang dapat diakses | Pertahankan empat KPI jika label muat. Grafik event memakai lebar penuh. Panel kesehatan dan sumber berbagi satu baris. |
| 768–1023 px | Navigasi melalui tombol menu | KPI 2 × 2. Panel analitik dan tabel menggunakan lebar yang tersedia. |
| 360–767 px | Topbar ringkas dengan tombol menu dan label simulasi | KPI 2 × 2 dengan label yang bisa membungkus. Setelah itu tampilkan kesehatan aset, aktivitas event, linimasa, lalu evaluasi. Tampilkan baris linimasa sebagai kartu vertikal. |

Urutan desktop adalah judul → pemilih skenario dan konfigurasi → KPI → panel analitik → linimasa dan evaluasi. Gunakan jarak antarpanel 16 px. Header tetap dapat dijangkau saat scroll. Pastikan tautan sidebar menggeser konten ke posisi yang tidak tertutup topbar.

## 4. Token desain

Nilai berikut merupakan palet implementasi yang disarankan dari referensi.

| Token | Nilai | Penggunaan |
|---|---|---|
| `canvas` | `#F7F9FC` | Latar workspace |
| `surface` | `#FFFFFF` | Sidebar, topbar, kartu, tabel |
| `border` | `#E2E8F0` | Pembatas panel, baris, dan kontrol |
| `text-primary` | `#172033` | Judul, angka KPI, label |
| `text-secondary` | `#475569` | Sumber, timestamp, deskripsi |
| `primary` / `primary-soft` | `#1D4ED8` / `#EAF2FF` | Aksi utama, navigasi aktif, grafik utama |
| `success` / `success-soft` | `#166534` / `#DCFCE7` | Aset Up dan collector Sehat |
| `warning` / `warning-soft` | `#92400E` / `#FEF3C7` | Data simulasi dan kondisi perlu ditinjau |
| `error` / `error-soft` | `#B91C1C` / `#FEE2E2` | Collector Error |
| `neutral` / `neutral-soft` | `#475569` / `#F1F5F9` | Status Unknown dan nilai belum tersedia |
| `chart-series` | `#2563EB`, `#0D9488`, `#7C3AED`, `#B45309`, `#BE185D` | Seri grafik dan legenda. Gunakan label atau pola bila seri berdekatan. |

- **Tipografi:** Inter dengan fallback system UI. Judul halaman 28/36 px, judul panel 16/24 px, isi 14/20 px, metadata 12/18 px, angka KPI 26/32 px. Gunakan angka tabular pada nilai dan monospace pada ID.
- **Jarak:** gunakan skala 4, 8, 12, 16, 24, dan 32 px. Padding kartu 16 px. Gunakan radius 12 px pada kartu dan 8 px pada kontrol.
- **Elevasi:** gunakan border tipis dan bayangan halus pada kartu. Gunakan bayangan lebih tegas pada menu yang terbuka atau panel detail.
- **Ikon:** gunakan ikon garis 18–20 px dengan ukuran konsisten. Ikon KPI boleh memakai latar biru, teal, amber, atau ungu. Warna status tetap mengikuti token semantik.

## 5. Komponen dan perilaku

| Komponen | Spesifikasi |
|---|---|
| Pemilih skenario | Empat tombol dengan satu pilihan aktif. Default **Operasi normal**. Tombol dapat membungkus di layar kecil. |
| Konfigurasi deteksi | Label **Jendela**, **Ambang SSH**, dan **Ambang port unik** terlihat di dekat kontrol. Default 60 detik, 4 kegagalan SSH, dan 5 port unik. Perubahan langsung mengevaluasi ulang tanpa mengubah isi linimasa. |
| Kartu KPI | Ikon, label singkat, dan angka. Satuan atau konteks diletakkan dekat angka. Gunakan persentase perubahan hanya jika tersedia dua periode yang sebanding. |
| Kartu aset | Nama, tipe aset, status, collector, waktu pengamatan, dan nilai dengan satuan. Pada gangguan collector, tampilkan **Collector Error** dan aset **Unknown**, dengan alasan kegagalan di bawahnya. Observasi lama diberi timestamp dan label **Observasi terakhir** bila ditampilkan. |
| Grafik event | Judul dan satuan terlihat. Tooltip menampilkan interval UTC dan jumlah event. Pembaruan mengikuti skenario. Jika kosong, tampilkan pesan **Belum ada event pada skenario ini**. |
| Linimasa | ID event dapat dituju dari bukti temuan. Saat dipilih, pindahkan fokus ke event yang sesuai dan beri penanda visual. Tampilkan sumber dan aset pada baris yang sama jika ruang cukup. |
| Temuan M3 | Tampilkan judul, ID aturan, hitungan, ambang, jendela, bukti, dan langkah pemeriksaan. Gunakan panel yang dapat diperluas. Jika kosong, tampilkan **Ambang deteksi belum terpenuhi pada skenario ini**. |
| Detail alert M4 | Panel samping di desktop dan tampilan penuh di ponsel. Tampilkan status, prioritas, alasan korelasi, dan event pendukung. Aksi perubahan status mengikuti state dan kontrak backend yang tersedia. |

Pada demo M3, grafik dan panel dihitung dari fixture lokal. Saat koneksi API tersedia, tampilkan skeleton hanya pada panel yang sedang dimuat. Jika satu panel gagal, tampilkan pesan di panel tersebut dan aksi **Coba lagi**.

## 6. Aksesibilitas dan pemeriksaan desain

- Beri setiap status label teks. Gunakan fokus keyboard yang jelas pada tautan, tombol, kontrol, dan pemicu detail. Gunakan `aria-pressed` pada tombol skenario.
- Targetkan kontras minimal 4,5:1 untuk teks normal dan area sentuh 44 × 44 px pada kontrol utama. Pertahankan urutan fokus yang mengikuti alur baca.
- Saat evaluasi diperbarui, umumkan jumlah temuan melalui satu area `aria-live`. Saat detail alert ditutup, kembalikan fokus ke pemicunya.
- Uji pada lebar 360, 768, 1024, dan 1440 px. Periksa label, angka, bukti, dan legenda tanpa scroll horizontal halaman.
- Uji empat skenario PRD. Kondisi normal menampilkan nol temuan. Gangguan collector menampilkan **Unknown** pada server. Trafik berulang ke port yang sama menghasilkan nol temuan DET-002. Aktivitas mencurigakan menghasilkan dua temuan pada default demo dan nol saat jendela diubah menjadi 15 detik.
- Pastikan angka KPI, grafik, tabel, dan bukti menggunakan skenario aktif yang sama serta label **Data simulasi** tetap terlihat.

## 7. Urutan implementasi UI

1. Terapkan token light, sidebar, topbar, dan grid responsif pada halaman prototipe.
2. Pindahkan kontrol skenario, kartu kesehatan, dan linimasa ke layout baru. Sambungkan KPI ke data skenario.
3. Tambahkan grafik yang dihitung dari fixture dan tautan dari bukti ke event. Verifikasi empat skenario serta navigasi keyboard.
4. Tambahkan detail alert dan aksi tindak lanjut ketika kontrak M4 tersedia.

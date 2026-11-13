# AEGISOPS --- Security, Privacy & Authorized Use

## 1. Otorisasi

AEGISOPS hanya boleh memantau jaringan, server, dan perangkat yang
dimiliki organisasi atau secara eksplisit diizinkan untuk dipantau.
Setiap deployment harus memiliki daftar aset dan ruang lingkup yang
disetujui.

## 2. Mode operasi MVP

-   Passive monitoring sebagai default.
-   SNMP menggunakan read-only credentials.
-   Packet capture hanya pada lab atau feed SPAN/TAP yang disetujui.
-   Tidak ada pemblokiran otomatis.
-   Tidak ada perubahan konfigurasi perangkat.
-   Tidak ada exploit, brute force, credential guessing, atau
    denial-of-service test.

## 3. Penanganan kredensial

-   Jangan commit `.env`, private key, token, password, atau SNMP
    community string.
-   Gunakan environment variable/secret store.
-   Buat akun layanan dengan hak minimum.
-   Rotasi credential jika terpapar.
-   Redact secret dari log, exception, dan laporan.

## 4. Privasi dan data

-   Kumpulkan metadata minimum yang dibutuhkan.
-   Hindari menyimpan payload aplikasi jika metadata cukup.
-   Tentukan retensi log/event sebelum deployment.
-   Batasi akses dashboard dan API berdasarkan peran.
-   Jangan tampilkan username/IP sensitif kepada pengguna yang tidak
    berwenang.
-   Dokumentasikan sumber, tujuan, dan alasan pengumpulan data.

## 5. Keamanan aplikasi

-   Autentikasi untuk endpoint non-public.
-   Otorisasi per resource/role.
-   Validasi input dan batasi ukuran payload.
-   Rate limit endpoint ingestion yang terekspos.
-   TLS untuk komunikasi lintas host.
-   Audit akses dan perubahan konfigurasi.
-   Dependency scanning dan update rutin.
-   Bind port development ke localhost kecuali ada alasan dan aturan
    firewall yang jelas.

## 6. Pelaporan

Setiap laporan insiden harus membedakan: - fakta yang diamati; - hasil
rule/deteksi; - interpretasi atau hipotesis; - rekomendasi; - data yang
belum tersedia.

Jangan menyatakan "serangan berhasil", "perangkat terkompromi", atau
"data bocor" tanpa bukti yang cukup dan validasi manusia.

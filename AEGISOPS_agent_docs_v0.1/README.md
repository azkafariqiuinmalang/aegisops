# AEGISOPS --- Agent Documentation Pack

**Versi:** 0.1\
**Fase:** Pengembangan pertama / MVP\
**Fokus:** Network Infrastructure Security & Health Monitoring

Paket ini menjadi sumber konteks dan aturan kerja bagi AI coding agent
maupun anggota tim saat membangun AEGISOPS. Baca `PROJECT_CONTEXT.md`
dan `AGENT_GUIDE.md` sebelum mengubah kode.

## Daftar dokumen

  -----------------------------------------------------------------------
  File                                Kegunaan
  ----------------------------------- -----------------------------------
  `PROJECT_CONTEXT.md`                Visi, masalah, tujuan, ruang
                                      lingkup MVP, dan batasan proyek

  `AGENT_GUIDE.md`                    Instruksi kerja utama untuk AI
                                      coding agent

  `ARCHITECTURE.md`                   Arsitektur logis dan aliran data

  `EVENT_SCHEMA.md`                   Format event normalisasi untuk
                                      korelasi

  `DETECTION_AND_RESPONSE.md`         Use case deteksi, tingkat
                                      prioritas, dan rekomendasi respons

  `SECURITY_AND_ETHICS.md`            Batas keamanan, privasi, dan
                                      otorisasi

  `MVP_ROADMAP.md`                    Urutan implementasi dan definisi
                                      selesai

  `DECISIONS.md`                      Keputusan teknis awal dan hal yang
                                      belum boleh diasumsikan
  -----------------------------------------------------------------------

## Cara menggunakan dengan agent

1.  Letakkan folder ini di root repository sebagai `docs/agent/` atau
    salin file `AGENT_GUIDE.md` ke root sebagai `AGENTS.md`.
2.  Berikan instruksi kepada agent:\
    `Baca README.md dan seluruh dokumen di docs/agent. Implementasikan hanya milestone aktif pada MVP_ROADMAP.md. Jangan mengubah scope tanpa persetujuan.`
3.  Minta agent memeriksa repository dan melaporkan struktur serta
    kondisi aktual sebelum membuat perubahan.
4.  Kerjakan per milestone kecil. Setiap fitur harus memiliki test,
    contoh konfigurasi, dan dokumentasi.

## Prinsip penting

-   AEGISOPS adalah platform pemantauan dan intelijen kondisi
    infrastruktur, bukan perangkat inline untuk meneruskan atau
    memblokir trafik.
-   Mulai dari observability dan deteksi pasif. Jangan mengaktifkan
    tindakan otomatis yang mengubah jaringan.
-   Jangan menganggap ESP32-S3 sebagai packet capture sensor atau
    pengganti Linux network sensor.
-   Jangan mengarang hasil deteksi. Pisahkan data teramati, inferensi,
    dan rekomendasi.

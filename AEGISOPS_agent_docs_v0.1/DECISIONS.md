# AEGISOPS --- Initial Technical Decisions

Dokumen ini mencatat keputusan awal agar agent tidak mengarang
arsitektur atau memperluas scope.

## Keputusan yang sudah ditetapkan

  -----------------------------------------------------------------------
  Area                                Keputusan
  ----------------------------------- -----------------------------------
  Produk                              Infrastructure Security & Health
                                      Intelligence

  Fokus awal                          Linux Server & Network
                                      Infrastructure

  Mode operasi                        Passive monitoring

  Lokasi prototipe                    Linux/Ubuntu VM atau host lab

  Network visibility                  SPAN/port mirroring/TAP atau
                                      virtual lab; bukan inline

  ESP32-S3                            Opsional untuk
                                      heartbeat/telemetry/tamper; bukan
                                      packet capture/IDS utama

  Network detection                   Sensor Linux seperti Zeek atau
                                      Suricata

  Host security                       Wazuh atau sumber log autentikasi
                                      host

  Server health                       Prometheus Node Exporter atau
                                      exporter setara

  Device health                       ICMP dan SNMP read-only bila
                                      tersedia

  Correlation                         Rule-based, explainable, mengacu ke
                                      event sumber

  Response                            Alert dan rekomendasi manual; tidak
                                      auto-block

  Predictive maintenance              Pengembangan lanjutan, bukan inti
                                      MVP
  -----------------------------------------------------------------------

## Keputusan yang belum ditetapkan

Agent wajib memeriksa repository atau meminta keputusan sebelum
memilih: - Bahasa pemrograman backend. - Framework API dan frontend. -
Database dan message broker. - Sistem autentikasi/SSO. - Format
deployment final (Docker Compose, native service, atau lainnya). -
Retensi event dan raw log. - SNMP version dan perangkat yang benar-benar
tersedia. - Pilihan final Zeek atau Suricata berdasarkan kebutuhan dan
resource. - Topologi lab, interface capture, dan daftar aset yang
diotorisasi.

## Aturan pemilihan teknologi

1.  Utamakan stack yang sudah ada di repository.
2.  Jika belum ada, ajukan opsi sederhana dengan konsekuensi resource
    dan maintenance.
3.  Jangan memasang seluruh komponen sekaligus.
4.  Untuk laptop dengan resource terbatas, mulai dari satu atau dua
    integrasi yang dapat diuji; jangan menjalankan semua sensor berat
    secara bersamaan.
5.  Jangan menjadikan ESP32 sebagai jalan pintas untuk fungsi yang
    membutuhkan Linux, NIC, dan packet processing.

## Catatan risiko

-   SNMP tidak tersedia pada semua perangkat atau mungkin dinonaktifkan.
-   ICMP dapat diblokir sehingga status `down` tidak selalu berarti
    perangkat mati.
-   Zeek/Suricata membutuhkan trafik yang terlihat oleh interface
    sensor.
-   Wazuh dan Prometheus memiliki tujuan berbeda; jangan menyamakan
    security event dengan performance metrics.
-   Korelasi lintas sumber membutuhkan sinkronisasi waktu.
-   Data simulasi tidak boleh ditampilkan sebagai telemetry real.

# AEGISOPS --- Normalized Event Schema

## 1. Tujuan

Skema ini menjadi kontrak internal agar event dari Wazuh, Prometheus,
SNMP, syslog, Zeek, dan Suricata dapat diproses secara konsisten. Skema
ini adalah rancangan awal; sesuaikan dengan stack repository tanpa
menghilangkan makna field penting.

## 2. Bentuk event

Contoh JSON:

``` json
{
  "event_id": "generated-uuid",
  "schema_version": "0.1",
  "timestamp": "2026-11-12T10:15:30Z",
  "ingested_at": "2026-11-12T10:15:32Z",
  "source": {
    "type": "wazuh",
    "name": "wazuh-manager-lab",
    "event_id": "source-native-id"
  },
  "category": "authentication",
  "event_type": "ssh_login_failed",
  "severity": "low",
  "status": "observed",
  "asset": {
    "asset_id": "server-01",
    "hostname": "lab-server",
    "ip": ["192.0.2.10"],
    "role": "linux-server"
  },
  "network": {
    "src_ip": "198.51.100.25",
    "src_port": 53000,
    "dst_ip": "192.0.2.10",
    "dst_port": 22,
    "protocol": "tcp"
  },
  "details": {
    "username": "test-user",
    "message": "Authentication failure"
  },
  "labels": ["lab", "authentication"],
  "raw_reference": "optional-reference-to-raw-event",
  "simulation": false
}
```

Alamat pada contoh menggunakan blok dokumentasi; jangan menggunakannya
sebagai alamat target nyata.

## 3. Field wajib

  -----------------------------------------------------------------------
  Field                   Tipe                    Keterangan
  ----------------------- ----------------------- -----------------------
  `event_id`              string                  ID internal unik

  `schema_version`        string                  Versi skema

  `timestamp`             ISO-8601 UTC            Waktu kejadian dari
                                                  sumber

  `ingested_at`           ISO-8601 UTC            Waktu diterima AEGISOPS

  `source.type`           string                  Jenis adapter/sumber

  `source.name`           string                  Nama sumber yang
                                                  dikonfigurasi

  `category`              string                  Kategori event

  `event_type`            string                  Jenis event yang
                                                  spesifik

  `status`                string                  observed, normalized,
                                                  simulated, atau error
                                                  sesuai konteks
  -----------------------------------------------------------------------

Field lain wajib bila tersedia dan relevan. Jangan mengisi nilai yang
tidak diketahui dengan tebakan.

## 4. Kategori yang disarankan

-   `availability`
-   `performance`
-   `network`
-   `authentication`
-   `system`
-   `configuration`
-   `security`
-   `collector`

## 5. Severity

Gunakan skala internal konsisten: - `info` - `low` - `medium` - `high` -
`critical` - `unknown`

Severity event sumber tidak selalu sama dengan severity alert AEGISOPS.
Simpan severity asli jika diperlukan dan dokumentasikan mapping.

## 6. Status dan kualitas data

Nilai status yang disarankan: - `observed`: event benar-benar diterima
dari sumber. - `simulated`: event berasal dari fixture/demo. -
`normalized`: event sudah melewati normalisasi. - `collector_error`:
collector gagal mengambil data. - `unknown`: kondisi tidak dapat
dipastikan.

Jangan menyamakan `collector_error` dengan perangkat down.

## 7. Contoh event perangkat

``` json
{
  "event_id": "example-device-event",
  "schema_version": "0.1",
  "timestamp": "2026-11-12T10:20:00Z",
  "ingested_at": "2026-11-12T10:20:01Z",
  "source": {"type": "snmp", "name": "switch-lab", "event_id": null},
  "category": "availability",
  "event_type": "interface_oper_status",
  "severity": "medium",
  "status": "observed",
  "asset": {"asset_id": "switch-01", "hostname": "switch-lab", "ip": ["192.0.2.2"], "role": "switch"},
  "details": {"interface": "ifIndex-2", "oper_status": "down"},
  "labels": ["network-device"],
  "simulation": true
}
```

Contoh ini hanya ilustrasi format. `simulation: true` menandakan
fixture, bukan data perangkat aktual.

## 8. Aturan normalisasi

-   Simpan timestamp dalam UTC.
-   Validasi IP, port, protocol, dan tipe data.
-   Pertahankan ID event asli dari sumber.
-   Jangan menaruh credential atau token di `details`.
-   Batasi panjang string dan ukuran raw payload.
-   Simpan nilai yang tidak dikenal sebagai `null`/absent, bukan nilai
    buatan.
-   Dokumentasikan mapping setiap adapter dan uji dengan fixture.

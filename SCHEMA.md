# SISLIDERE DAVA DOSYASI - GUN VERI SEMASI (SCHEMA)

Bu dosya, oyuna yeni bir gün eklenirken kullanılacak JSON formatını tanımlar.

## JSON Yapısı
```json
{
  "day": 3,
  "initialFlags": {
    "day3_basladi": true
  },
  "dialogs": {
    "karakter_id_veya_oda_id": [
      { 
        "speaker": "Konuşan Kişi", 
        "text": "Söylenen söz",
        "emotion": "normal"
      }
    ]
  },
  "roomOverrides": {
    "oda_id": {
      "closed": true,
      "closedImage": "assets/odalar/kapi.webp"
    }
  }
}
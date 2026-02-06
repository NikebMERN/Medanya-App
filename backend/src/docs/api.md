## Jobs API

Base: `/api/jobs`

### POST /jobs (JWT required)

Create a job posting.

Headers:

- Authorization: Bearer <JWT>
- Content-Type: application/json

Body:

```json
{
  "title": "Housemaid Needed",
  "category": "housemaid",
  "salary": "8000 ETB",
  "location": "Addis Ababa",
  "contact_phone": "+2519xxxxxxx",
  "image_url": "https://example.com/img.jpg"
}
```

## Reports & Blacklist API

### POST /reports (JWT required)

Create a report (evidence URLs only).

Body:

```json
{
  "phoneNumber": "+251900000000",
  "employerName": "John",
  "locationText": "Addis Ababa",
  "gps": { "lat": 9.02, "lng": 38.76 },
  "reason": "fraud_scam",
  "description": "He took money and disappeared.",
  "evidence": {
    "photos": ["https://.../1.jpg"],
    "videos": ["https://.../1.mp4"]
  }
}
```

## Missing Persons API

### POST /missing-persons (JWT required)

Body:

```json
{
  "photoUrl": "https://example.com/photo.jpg",
  "fullName": "Abel Tesfaye",
  "contactPhone": "+251900000000",
  "voiceUrl": "https://example.com/voice.m4a",
  "lastKnownLocationText": "Addis Ababa - Bole",
  "gps": { "lat": 9.02, "lng": 38.76 },
  "description": "Missing since yesterday. Wearing a blue jacket."
}
```

## Marketplace API

### POST /marketplace/items (JWT required)

```json
{
  "title": "iPhone 12",
  "description": "Clean condition, 128GB",
  "price": 45000,
  "category": "electronics",
  "location": "Addis Ababa",
  "image_urls": ["https://res.cloudinary.com/.../img.jpg"]
}
```

## Community Feed

### GET /feed

Query:

- cursor (base64 string from previous response)
- limit (max 50)
- types (optional comma list): job,report,missing_person,marketplace

Example:
GET /feed?limit=20&types=job,missing_person

Response:

```json
{
  "success": true,
  "items": [
    {
      "type": "job",
      "id": 12,
      "title": "Driver Needed",
      "summary": "driver • 12000 ETB",
      "location": "Addis Ababa",
      "createdAt": "2026-02-05T12:00:00.000Z",
      "preview": { "category": "driver", "salary": "12000 ETB", "imageUrl": "" }
    }
  ],
  "nextCursor": "BASE64..."
}
```

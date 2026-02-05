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

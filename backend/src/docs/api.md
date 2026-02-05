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

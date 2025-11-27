# Word List Assessment - API examples

This file contains quick curl examples for the Word List assessment endpoints.

1) Start a test

```bash
curl -X POST "http://localhost:5000/api/tests/start" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "words": ["apple","chair","table","penny","dog","window","river","book","shoe","garden"],
    "trial_count": 3
  }'
```

Response: `201` with JSON `{ test_id, trial_order, start_ts }`

2) Upload an artifact (audio or typed)

```bash
curl -X POST "http://localhost:5000/api/tests/<TEST_ID>/artifact" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/path/to/recording.webm" \
  -F "artifactType=audio" \
  -F "trial_number=1" \
  -F "transcript=the quick brown fox"
```

For typed responses, you can omit the file and send `response_text` JSON string:

```bash
curl -X POST "http://localhost:5000/api/tests/<TEST_ID>/artifact" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "artifactType=typed" \
  -F "trial_number=1" \
  -F "response_text=\"apple, chair, table\""
```

3) Complete the test (enqueue processing)

```bash
curl -X POST "http://localhost:5000/api/tests/<TEST_ID>/complete" \
  -H "Authorization: Bearer <TOKEN>"
```

4) Schedule delayed recall (server-side)

```bash
curl -X POST "http://localhost:5000/api/tests/<TEST_ID>/schedule-delayed" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "delay_minutes": 30 }'
```

5) Get results

```bash
curl -X GET "http://localhost:5000/api/tests/<TEST_ID>/results" \
  -H "Authorization: Bearer <TOKEN>"
```

Notes:
- All endpoints require a Bearer token in the `Authorization` header when auth middleware is enabled.
- Use the `api` axios instance in the frontend which is configured with `baseURL: http://localhost:5000/api`.
- The worker will upload artifacts to the ML microservice and persist metrics to the `Score` collection.

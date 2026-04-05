# SmartSite AI service (YOLO)

## Setup

1. Python 3.10+ virtual environment.
2. `pip install -r requirements.txt`
3. Place Ultralytics weights as `weights/detect.pt` (or set `YOLO_MODEL_PATH`).
4. Run:

```bash
set YOLO_MODEL_PATH=weights\detect.pt
uvicorn main:app --host 0.0.0.0 --port 8001
```

## NestJS

```bash
AI_ANALYSIS_URL=http://127.0.0.1:8001/analyze-image
```

`POST /jobs/:id/progress/photo` forwards the file here and stores `aiAnalysis` (including `safetyStatus`) on the step.

## API

`POST /analyze-image` — multipart field `file`.

Response (construction safety: helmet, vest, person):

```json
{
  "dangerLevel": "LOW | MEDIUM | HIGH | CRITICAL",
  "detectedObjects": ["person", "helmet"],
  "safetyStatus": { "helmet": true, "vest": false },
  "message": "Worker missing safety vest"
}
```

Rules when a **person** is detected: no helmet → **HIGH**; no vest → **MEDIUM**; both missing → **CRITICAL**; both present → **LOW**.

`GET /health` — model load status.

If the model file is missing, detections are empty and the service still returns a structured **LOW** response with an appropriate message.

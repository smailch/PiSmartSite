"""
SmartSite AI — YOLO (detect.pt) + construction safety (helmet / vest / person)
Run:
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001
"""

from __future__ import annotations
import os
import tempfile
from typing import Any, List

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None

MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "weights/best.pt").strip()
CONF_THRESHOLD = 0.4

_model = None


# =========================
# LOAD MODEL
# =========================
def get_model():
    global _model
    if _model is not None:
        return _model

    if YOLO is None or not os.path.isfile(MODEL_PATH):
        return None

    try:
        _model = YOLO(MODEL_PATH)
    except Exception as e:
        print("Model loading error:", e)
        _model = None

    return _model


# =========================
# APP
# =========================
app = FastAPI(title="SmartSite AI", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# LABELS
# =========================
PERSON_KEYS = ("person", "worker")
HELMET_KEYS = ("helmet", "hardhat", "casque")
VEST_KEYS = ("vest", "gilet", "reflective")


def match(label: str, keys: tuple[str, ...]) -> bool:
    label = label.lower()
    return any(k in label for k in keys)


# =========================
# ANALYSIS LOGIC
# =========================
def analyze_objects(labels: List[str]) -> dict[str, Any]:
    has_person = any(match(l, PERSON_KEYS) for l in labels)
    has_helmet = any(match(l, HELMET_KEYS) for l in labels)
    has_vest = any(match(l, VEST_KEYS) for l in labels)

    safety_status = {
        "helmet": has_helmet,
        "vest": has_vest
    }

    # 🔥 LOGIQUE AMÉLIORÉE
    if not has_person:
        return {
            "dangerLevel": "LOW",
            "detectedObjects": labels,
            "safetyStatus": safety_status,
            "message": "No worker detected"
        }

    if not has_helmet and not has_vest:
        return {
            "dangerLevel": "CRITICAL",
            "detectedObjects": labels,
            "safetyStatus": safety_status,
            "message": "Worker missing helmet and vest"
        }

    if not has_helmet:
        return {
            "dangerLevel": "HIGH",
            "detectedObjects": labels,
            "safetyStatus": safety_status,
            "message": "Worker without helmet"
        }

    if not has_vest:
        return {
            "dangerLevel": "MEDIUM",
            "detectedObjects": labels,
            "safetyStatus": safety_status,
            "message": "Worker without safety vest"
        }

    return {
        "dangerLevel": "LOW",
        "detectedObjects": labels,
        "safetyStatus": safety_status,
        "message": "Safe worker detected"
    }


# =========================
# ROUTES
# =========================
@app.get("/health")
def health():
    return {"ok": True, "model_loaded": get_model() is not None}


@app.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    raw = await file.read()

    if not raw:
        raise HTTPException(400, "Empty file")

    model = get_model()
    labels: List[str] = []
    tmp_path = None

    if model is None:
        return {
            "dangerLevel": "LOW",
            "detectedObjects": [],
            "safetyStatus": {"helmet": False, "vest": False},
            "message": "Model not loaded"
        }

    try:
        suffix = os.path.splitext(file.filename or "")[1] or ".jpg"

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(raw)
            tmp_path = tmp.name

        results = model.predict(tmp_path, conf=CONF_THRESHOLD, verbose=False)

        for r in results:
            if r.boxes is None:
                continue

            cls_ids = r.boxes.cls.int().tolist()
            names = r.names

            for cid in cls_ids:
                label = names.get(int(cid), str(cid))
                labels.append(label)

    except Exception as e:
        print("Prediction error:", e)
        labels = []

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

    return analyze_objects(labels)
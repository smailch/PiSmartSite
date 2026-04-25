# check_model.py
import os
import sys

print("=== DIAGNOSTIC MODÈLE YOLO ===\n")

# 1. Vérifier installation ultralytics
try:
    from ultralytics import YOLO
    print("✅ Ultralytics installé")
except ImportError:
    print("❌ Ultralytics non installé")
    print("   Solution: pip install ultralytics")
    sys.exit(1)

# 2. Vérifier les chemins possibles
paths = [
    "weights/best.pt",
    "weights/detect.pt", 
    "best.pt",
    "yolov8n.pt",
]

print("\n🔍 Recherche de modèles:")
found = False
for path in paths:
    if os.path.exists(path):
        print(f"  ✅ Trouvé: {path}")
        found = True
    else:
        print(f"  ❌ Non trouvé: {path}")

# 3. Télécharger si nécessaire
if not found:
    print("\n📥 Aucun modèle trouvé, téléchargement de yolov8n.pt...")
    try:
        model = YOLO("yolov8n.pt")
        print("✅ Modèle téléchargé avec succès!")
        found = True
    except Exception as e:
        print(f"❌ Erreur: {e}")

# 4. Tester le modèle
if found:
    print("\n🧪 Test du modèle...")
    try:
        model = YOLO("yolov8n.pt" if not os.path.exists("weights/best.pt") else "weights/best.pt")
        results = model("https://ultralytics.com/images/bus.jpg")
        print("✅ Modèle fonctionne correctement!")
        print(f"   Classes disponibles: {model.names}")
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
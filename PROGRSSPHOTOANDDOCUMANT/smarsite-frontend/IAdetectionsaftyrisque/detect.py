from ultralytics import YOLO
from PIL import Image
import os

# Charger le modèle YOLOv8
model = YOLO(r"C:\Users\MSI\Desktop\weights\best.pt")
# Chemin de ton image
image_path = r"C:\Users\MSI\Desktop\casque-de-chantier-blanc-en-abs-serrage-cremaillere-4-points-de-fixation.jpg"

# Détection
results = model.predict(
    source=image_path,
    conf=0.5,   # seuil de confiance
    save=True   # sauvegarder le résultat
)

# Dossier où l'image annotée est sauvegardée
save_folder = r"C:\Users\MSI\Desktop\runs\detect\predict"
annotated_image = os.path.join(save_folder, os.path.basename(image_path))

# Analyse des résultats pour alerte de danger
danger_score = 0
alerts = []

for result in results:
    boxes = result.boxes
    class_ids = boxes.cls.tolist()
    class_names = [model.names[int(c)] for c in class_ids]
    
    # Vérifier les classes détectées
    if "NO-Hardhat" in class_names:
        alerts.append("⚠️ Casque manquant !")
        danger_score += 50
    if "NO-Safety Vest" in class_names:
        alerts.append("⚠️ Gilet manquant !")
        danger_score += 30
    if "NO-Mask" in class_names:
        alerts.append("⚠️ Masque manquant !")
        danger_score += 20

# Déterminer le niveau de risque
if danger_score >= 70:
    risk_level = "🔥 RISQUE ÉLEVÉ"
elif danger_score >= 30:
    risk_level = "⚠️ RISQUE MODÉRÉ"
else:
    risk_level = "✅ Risque faible"

# Affichage
print("\n=== ALERTES DE SÉCURITÉ ===")
for alert in alerts:
    print(alert)
print(f"Niveau de risque : {risk_level}")


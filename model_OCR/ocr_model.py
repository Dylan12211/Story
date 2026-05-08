import os
import re

import cv2
import easyocr
from ultralytics import YOLO


reader = easyocr.Reader(["vi", "en"], gpu=False)

model_path = "runs/detect/train-4/weights/best.pt"
if os.path.exists(model_path):
    model = YOLO(model_path)
    print(f"Loaded custom model: {model_path}")
else:
    raise FileNotFoundError(f"Model not found at {model_path}. Please ensure the trained model exists.")

class_names = {
    0: "id_number",
    1: "name",
    2: "dob",
    3: "gender",
    4: "nationality",
    5: "place_of_origin",
    6: "place_of_residence",
    7: "date_of_expiry",
}


def extract_text_from_region(image, box):
    """Extract text from a detected region using EasyOCR."""
    x1, y1, x2, y2 = map(int, box)

    padding = 10
    h, w = image.shape[:2]
    x1 = max(0, x1 - padding)
    y1 = max(0, y1 - padding)
    x2 = min(w, x2 + padding)
    y2 = min(h, y2 + padding)

    region = image[y1:y2, x1:x2]

    if region.size == 0:
        return ""

    try:
        result = reader.readtext(region, detail=0)
        text = " ".join(result)
        return text.strip()
    except Exception:
        return ""

def clean_name(text):
    text = clean_place_label(text, [
        r"^h[oọ]\s*v[aà]\s*t[eê]n\s*:?\s*",
        r"^ho\s*va\s*ten\s*:?\s*",
        r"^ho\s*va\s*len\s*:?\s*",
        r"^full\s*name\s*:?\s*",
    ])
    return re.sub(r"\b(Coc|C[oó]c)\b$", "", text, flags=re.IGNORECASE).strip()

def clean_place_label(text, label_patterns):
    if not text:
        return text

    cleaned = re.sub(r"\s+", " ", text).strip()
    for pattern in label_patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE).strip()

    return cleaned.lstrip(":/- ").strip()


def clean_place_of_origin(text):
    return clean_place_label(
        text,
        [
            r"^.*?place\s*of\s*origin\s*:?\s*",
            r"^qu[eê]\s*qu[aã]n\s*/?\s*",
            r"^place\s*of\s*origin\s*:?\s*",
            r"^origin\s*:?\s*",
            r"s*:",
        ],
    )


def clean_place_of_residence(text):
    return clean_place_label(
        text,
        [
            r"^.*?place\s*of\s*residence\s*:?\s*",
            r"^n[oơ0]i\s*th[uư]?[oơ]ng\s*tr[uú]?\s*/?\s*",
            r"^noi\s*th[uư]?[oơ]ng\s*tr[uú]?\s*/?\s*",
            r"^noithurung\s*trui\s*/?\s*",
            r"^place\s*of\s*residence\s*:?\s*",
            r"^residence\s*:?\s*",
        ],
    )


def process_id_card(image, confidence_threshold=0.5):
    if isinstance(image, str):
        image = cv2.imread(image)
        if image is None:
            return {"error": "Could not read image"}

    results = model(image, conf=confidence_threshold)
    extracted_data = {}

    for result in results:
        boxes = result.boxes
        for box in boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            field_name = class_names.get(class_id, f"class_{class_id}")
            text = extract_text_from_region(image, [x1, y1, x2, y2])
            if field_name == "name":
                text = clean_name(text)
            elif field_name == "place_of_origin":
                text = clean_place_of_origin(text)
            elif field_name == "place_of_residence":
                text = clean_place_of_residence(text)

            extracted_data[field_name] = {
                "text": text,
                "confidence": round(confidence, 2),
                "bbox": [round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)],
            }

    for _, field_name in class_names.items():
        if field_name not in extracted_data:
            extracted_data[field_name] = {"text": "", "confidence": 0.0, "bbox": []}

    return extracted_data

"""
YOLOv8 detector for CCCD card and field detection.
"""

import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from ultralytics import YOLO
import logging

logger = logging.getLogger(__name__)

# Class names from dataset.yaml
CLASS_NAMES = {
    0: "id_number",
    1: "full_name",
    2: "date_of_birth",
    3: "sex",
    4: "nationality",
    5: "place_of_origin",
    6: "place_of_residence",
    7: "date_of_expiry",
}


class CCCDDetector:
    """YOLOv8 detector for CCCD cards."""
    
    def __init__(self, model_path: str, device: Optional[str] = None):
        """
        Initialize detector.
        
        Args:
            model_path: Path to YOLO model weights
            device: Device to run on ('cuda:0', 'cpu', or None for auto)
        """
        self.model_path = Path(model_path)
        self.device = device
        self.model = None
        
        self._load_model()
    
    def _load_model(self):
        """Load YOLO model."""
        try:
            if not self.model_path.exists():
                # Fallback to yolov8n if trained model not found
                logger.warning(f"Model not found at {self.model_path}, using yolov8n.pt")
                self.model = YOLO("yolov8n.pt")
            else:
                self.model = YOLO(str(self.model_path))
            
            logger.info(f"✓ YOLO model loaded: {self.model_path}")
            
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            raise
    
    def detect_card(self, image: np.ndarray, conf_threshold: float = 0.5) -> Optional[Dict[str, Any]]:
        """
        Detect CCCD card in image (get largest bounding box).
        
        Args:
            image: Input image
            conf_threshold: Confidence threshold
        
        Returns:
            Detection dict with bbox or None
        """
        results = self.model(image, conf=conf_threshold, verbose=False)
        
        if not results or len(results[0].boxes) == 0:
            return None
        
        boxes = results[0].boxes.xyxy.cpu().numpy()
        confs = results[0].boxes.conf.cpu().numpy()
        
        # Get largest box (card should be largest object)
        areas = [(b[2] - b[0]) * (b[3] - b[1]) for b in boxes]
        largest_idx = np.argmax(areas)
        
        return {
            "bbox": boxes[largest_idx].tolist(),
            "confidence": float(confs[largest_idx])
        }
    
    def detect_fields(self, image: np.ndarray, conf_threshold: float = 0.5,
                     iou_threshold: float = 0.5) -> List[Dict[str, Any]]:
        """
        Detect all CCCD fields in image.
        
        Args:
            image: Input image
            conf_threshold: Confidence threshold
            iou_threshold: NMS IoU threshold
        
        Returns:
            List of detection dicts
        """
        results = self.model(image, conf=conf_threshold, iou=iou_threshold, verbose=False)
        
        detections = []
        
        for result in results:
            boxes = result.boxes
            
            for box in boxes:
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                bbox = box.xyxy[0].tolist()
                
                field_name = CLASS_NAMES.get(class_id, f"class_{class_id}")
                
                detections.append({
                    "field_name": field_name,
                    "class_id": class_id,
                    "confidence": round(confidence, 3),
                    "bbox": [round(v, 2) for v in bbox]
                })
        
        # Sort by confidence (descending)
        detections.sort(key=lambda x: x["confidence"], reverse=True)
        
        return detections
    
    def detect_unique_fields(self, image: np.ndarray, conf_threshold: float = 0.5) -> Dict[str, Dict[str, Any]]:
        """
        Detect fields keeping only highest confidence for each field type.
        
        Args:
            image: Input image
            conf_threshold: Confidence threshold
        
        Returns:
            Dict mapping field_name to detection info
        """
        all_detections = self.detect_fields(image, conf_threshold)
        
        # Keep only highest confidence for each field
        unique_fields = {}
        
        for det in all_detections:
            field_name = det["field_name"]
            if field_name not in unique_fields:
                unique_fields[field_name] = det
        
        # Ensure all field types exist (with empty values if not detected)
        for class_id, field_name in CLASS_NAMES.items():
            if field_name not in unique_fields:
                unique_fields[field_name] = {
                    "field_name": field_name,
                    "class_id": class_id,
                    "confidence": 0.0,
                    "bbox": []
                }
        
        return unique_fields
    
    def get_annotated_image(self, image: np.ndarray, detections: List[Dict], 
                           conf_threshold: float = 0.5) -> np.ndarray:
        """
        Get image with detection annotations.
        
        Args:
            image: Input image
            detections: List of detections
            conf_threshold: Minimum confidence to show
        
        Returns:
            Annotated image
        """
        # Run prediction with plot
        results = self.model(image, conf=conf_threshold, verbose=False)
        
        if results:
            return results[0].plot()
        
        return image.copy()


def get_default_model_path() -> str:
    """Get default YOLO model path."""
    possible_paths = [
        "runs/detect/train-4/weights/best.pt",
        "runs/detect/train-3/weights/best.pt",
        "runs/detect/train-2/weights/best.pt",
        "runs/detect/train/weights/best.pt",
    ]
    
    for path in possible_paths:
        if Path(path).exists():
            return path
    
    # Fallback
    return "yolov8n.pt"

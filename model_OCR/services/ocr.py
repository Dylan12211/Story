"""
OCR service using VietOCR for Vietnamese text recognition.
"""

import re
import cv2
import numpy as np
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
from PIL import Image
import logging

logger = logging.getLogger(__name__)

# Try to import vietocr
try:
    from vietocr.tool.predictor import Predictor
    from vietocr.tool.config import Cfg
    VIETOCR_AVAILABLE = True
except ImportError:
    VIETOCR_AVAILABLE = False
    logger.warning("VietOCR not available. OCR will not function.")

# Vocabulary for VietOCR vgg_transformer (233 chars)
VIETOCR_VOCAB = (
    'aAàÀảẢãÃáÁạẠăĂằẰẳẲẵẴắẮặẶâÂầẦẩẨẫẪấẤậẬ'
    'bBcCdDđĐeEèÈẻẺẽẼéÉẹẸêÊềỀểỂễỄếẾệỆ'
    'fFgGhHiIìÌỉỈĩĨíÍịỊjJkKlLmMnNoOòÒỏỎõÕóÓọỌ'
    'ôÔồỒổỔỗỖốỐộỘơƠờỜởỞỡỠớỚợỢ'
    'pPqQrRsStTuUùÙủỦũŨúÚụỤưƯừỪửỬữỮứỨựỰ'
    'vVwWxXyYỳỲỷỶỹỸýÝỵỴzZ'
    '0123456789!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~ '
)

# Field prefixes to strip
FIELD_PREFIXES = {
    "full_name": ["Ho va ten / Full name", "Ho va ten", "Full name"],
    "date_of_birth": ["Ngay sinh / Date of birth", "Ngay sinh", "Date of birth"],
    "sex": ["Gioi tinh / Sex", "Gioi tinh", "Sex"],
    "nationality": ["Quoc tich / Nationality", "Quoc tich", "Nationality"],
    "place_of_origin": [
        "Que quan / Place of origin", "Que quan", "Place of origin",
        "Place oforigin"
    ],
    "place_of_residence": [
        "Noi thuong tru / Place of residence", "Noi thuong tru",
        "Place of residence", "Noi thuong tru Place of residence",
        "Noi thuong tru/Place of residence"
    ],
    "date_of_expiry": [
        "Co gia tri den / Date of expiry", "Co gia tri den",
        "Date of expiry"
    ],
}


class VietOCREngine:
    """VietOCR text recognition engine."""
    
    def __init__(self, weights_path: str, device: Optional[str] = None):
        """
        Initialize VietOCR.
        
        Args:
            weights_path: Path to vgg_transformer.pth
            device: Device ('cuda:0', 'cpu', or None for auto)
        """
        if not VIETOCR_AVAILABLE:
            raise ImportError("VietOCR is not installed. Run: pip install vietocr")
        
        self.weights_path = Path(weights_path)
        self.device = device
        self.predictor = None
        
        self._load_model()
    
    def _load_model(self):
        """Load VietOCR model."""
        try:
            if not self.weights_path.exists():
                raise FileNotFoundError(
                    f"VietOCR weights not found: {self.weights_path}\n"
                    "Download from: https://vocr.vn/data/vietocr/vgg_transformer.pth"
                )
            
            # Auto-detect device
            if self.device is None:
                import torch
                self.device = "cuda:0" if torch.cuda.is_available() else "cpu"
            
            # Build config
            config = Cfg({
                "weights": str(self.weights_path),
                "backbone": "vgg19_bn",
                "cnn": {
                    "pretrained": True,
                    "ss": [[2, 2], [2, 2], [2, 1], [2, 1], [1, 1]],
                    "ks": [[2, 2], [2, 2], [2, 1], [2, 1], [1, 1]],
                    "hidden": 256,
                },
                "seq_modeling": "transformer",
                "transformer": {
                    "d_model": 256,
                    "nhead": 8,
                    "num_encoder_layers": 6,
                    "num_decoder_layers": 6,
                    "dim_feedforward": 2048,
                    "max_seq_length": 1024,
                    "pos_dropout": 0.1,
                    "trans_dropout": 0.1,
                },
                "dataset": {
                    "image_height": 32,
                    "image_min_width": 32,
                    "image_max_width": 768,
                },
                "predictor": {"beamsearch": False},
                "device": self.device,
                "vocab": VIETOCR_VOCAB,
            })
            
            self.predictor = Predictor(config)
            logger.info(f"✓ VietOCR loaded on {self.device}")
            
        except Exception as e:
            logger.error(f"Failed to load VietOCR: {e}")
            raise
    
    def recognize(self, image: np.ndarray, return_prob: bool = False) -> Tuple[str, Optional[float]]:
        """
        Recognize text in image.
        
        Args:
            image: Input image (BGR numpy array)
            return_prob: Whether to return confidence score
        
        Returns:
            Tuple of (text, confidence) or (text, None)
        """
        try:
            # Convert BGR to RGB PIL
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(rgb)
            
            if return_prob:
                text, prob = self.predictor.predict(pil_image, return_prob=True)
                return text.strip(), float(prob)
            
            text = self.predictor.predict(pil_image)
            return text.strip(), None
            
        except Exception as e:
            logger.error(f"OCR recognition failed: {e}")
            return "", None


class TextCleaner:
    """Clean and normalize OCR text by field type."""
    
    @staticmethod
    def remove_vietnamese_accents(text: str) -> str:
        """Remove Vietnamese diacritics for comparison."""
        import unicodedata
        text = text.replace("Đ", "D").replace("đ", "d")
        return "".join(
            ch for ch in unicodedata.normalize("NFD", text)
            if unicodedata.category(ch) != "Mn"
        )
    
    @staticmethod
    def strip_prefix(text: str, field_name: str) -> str:
        """Remove known prefixes from field text."""
        normalized = text.strip()
        no_accent = TextCleaner.remove_vietnamese_accents(normalized)
        
        for prefix in FIELD_PREFIXES.get(field_name, []):
            if no_accent.lower().startswith(prefix.lower()):
                normalized = normalized[len(prefix):].strip()
                break
        
        return normalized
    
    @classmethod
    def clean(cls, text: str, field_name: str) -> str:
        """
        Clean text based on field type.
        
        Args:
            text: Raw OCR text
            field_name: Field type
        
        Returns:
            Cleaned text
        """
        if not text:
            return ""
        
        # Normalize whitespace
        text = re.sub(r"\s+", " ", text).strip()
        
        # Strip known prefixes
        text = cls.strip_prefix(text, field_name)
        
        # Strip leading special chars
        text = text.lstrip(':;.,-<>[]{}|/\\ @#$%^&*').strip()
        
        # Field-specific cleaning
        if field_name == "id_number":
            # Extract 9-12 digit number
            digits = re.findall(r"\d{9,12}", text.replace(" ", ""))
            if digits:
                return digits[0]
            # Fallback: remove all non-digits
            return re.sub(r"\D", "", text)
        
        if field_name in {"date_of_birth", "date_of_expiry"}:
            # Extract date format DD/MM/YYYY
            match = re.search(r"\d{1,2}[/-]\d{1,2}[/-]\d{4}", text)
            if match:
                return match.group(0).replace("-", "/")
            return text
        
        if field_name == "sex":
            lower = cls.remove_vietnamese_accents(text).lower()
            if "nam" in lower:
                return "Nam"
            if "nu" in lower:
                return "Nữ"
            return text
        
        return text.strip(" :;.,-")


class CCCDTextExtractor:
    """Complete text extraction pipeline for CCCD."""
    
    def __init__(self, ocr_engine: VietOCREngine, image_processor: Any):
        """
        Initialize extractor.
        
        Args:
            ocr_engine: VietOCR engine instance
            image_processor: Image processing module
        """
        self.ocr = ocr_engine
        self.img_proc = image_processor
        self.cleaner = TextCleaner()
    
    def extract_field(self, image: np.ndarray, bbox: list, 
                     field_name: str, return_prob: bool = True) -> Dict[str, Any]:
        """
        Extract text from a single field region.
        
        Args:
            image: Full card image
            bbox: Bounding box [x1, y1, x2, y2]
            field_name: Field type
            return_prob: Whether to return OCR confidence
        
        Returns:
            Dict with extracted info
        """
        # Crop region
        crop = self.img_proc.crop_with_padding(image, bbox)
        
        # Preprocess for OCR
        crop = self.img_proc.preprocess_for_ocr(crop, field_name)
        
        if crop is None or crop.size == 0:
            return {
                "text": "",
                "raw_text": "",
                "ocr_confidence": None
            }
        
        # Run OCR
        raw_text, ocr_prob = self.ocr.recognize(crop, return_prob=return_prob)
        
        # Clean text
        cleaned_text = self.cleaner.clean(raw_text, field_name)
        
        return {
            "text": cleaned_text,
            "raw_text": raw_text,
            "ocr_confidence": round(ocr_prob, 4) if ocr_prob else None,
            "crop_shape": crop.shape[:2]
        }
    
    def extract_all_fields(self, image: np.ndarray, 
                          detections: Dict[str, Dict]) -> Dict[str, Dict[str, Any]]:
        """
        Extract text from all detected fields.
        
        Args:
            image: Card image
            detections: Field detections from detector
        
        Returns:
            Dict mapping field_name to extracted data
        """
        results = {}
        
        for field_name, det in detections.items():
            bbox = det.get("bbox", [])
            yolo_conf = det.get("confidence", 0.0)
            
            if not bbox:
                results[field_name] = {
                    "text": "",
                    "raw_text": "",
                    "yolo_confidence": yolo_conf,
                    "ocr_confidence": None,
                    "bbox": []
                }
                continue
            
            # Extract text
            extracted = self.extract_field(image, bbox, field_name)
            
            results[field_name] = {
                "text": extracted["text"],
                "raw_text": extracted["raw_text"],
                "yolo_confidence": yolo_conf,
                "ocr_confidence": extracted["ocr_confidence"],
                "bbox": [round(v, 2) for v in bbox]
            }
        
        return results


def get_default_ocr_path() -> str:
    """Get default VietOCR weights path."""
    default_path = "model_OCR/vgg_transformer.pth"
    
    if Path(default_path).exists():
        return default_path
    
    # Try to find in model_OCR folder
    model_dir = Path("model_OCR")
    if model_dir.exists():
        pth_files = list(model_dir.glob("*.pth"))
        if pth_files:
            return str(pth_files[0])
    
    return default_path

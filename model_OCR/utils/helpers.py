"""
Utility helper functions for CCCD OCR API.
"""

import cv2
import base64
import numpy as np
from typing import Tuple, Optional
from pathlib import Path


def load_image_from_path(image_path: str) -> np.ndarray:
    """Load image from file path."""
    image = cv2.imread(str(image_path))
    if image is None:
        raise FileNotFoundError(f"Could not load image: {image_path}")
    return image


def save_image(image: np.ndarray, output_path: str, quality: int = 95):
    """Save image to file."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    if output_path.suffix.lower() in ['.jpg', '.jpeg']:
        cv2.imwrite(str(output_path), image, [cv2.IMWRITE_JPEG_QUALITY, quality])
    else:
        cv2.imwrite(str(output_path), image)


def decode_base64_image(base64_string: str) -> np.ndarray:
    """Decode base64 string to OpenCV image."""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        buffer = base64.b64decode(base64_string)
        nparr = np.frombuffer(buffer, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Failed to decode image")
        
        return image
    except Exception as e:
        raise ValueError(f"Base64 decode error: {e}")


def encode_image_to_base64(image: np.ndarray, format: str = '.jpg') -> str:
    """Encode OpenCV image to base64 string."""
    success, buffer = cv2.imencode(format, image)
    if not success:
        raise ValueError("Failed to encode image")
    return base64.b64encode(buffer).decode('utf-8')


def get_image_dimensions(image: np.ndarray) -> Tuple[int, int]:
    """Get image dimensions (width, height)."""
    h, w = image.shape[:2]
    return w, h


def ensure_rgb(image: np.ndarray) -> np.ndarray:
    """Ensure image is RGB format."""
    if len(image.shape) == 2:
        return cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
    elif image.shape[2] == 3:
        return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    return image


def ensure_bgr(image: np.ndarray) -> np.ndarray:
    """Ensure image is BGR format (OpenCV default)."""
    if len(image.shape) == 2:
        return cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    elif image.shape[2] == 3:
        return cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    return image

"""
Image processing utilities for CCCD detection and alignment.
Includes: crop, rotate, perspective transform, deskew, preprocessing.
"""

import cv2
import numpy as np
from typing import Tuple, Optional, List
import logging

logger = logging.getLogger(__name__)


def crop_with_padding(image: np.ndarray, box: List[float], 
                      pad_ratio: float = 0.035, min_pad: int = 3) -> np.ndarray:
    """
    Crop image region with padding.
    
    Args:
        image: Input image (H, W, C)
        box: Bounding box [x1, y1, x2, y2]
        pad_ratio: Padding ratio relative to box size
        min_pad: Minimum padding in pixels
    
    Returns:
        Cropped image region
    """
    x1, y1, x2, y2 = map(float, box)
    h, w = image.shape[:2]
    
    bw, bh = x2 - x1, y2 - y1
    pad_x = max(min_pad, int(bw * pad_ratio))
    pad_y = max(min_pad, int(bh * pad_ratio))
    
    x1 = max(0, int(round(x1 - pad_x)))
    y1 = max(0, int(round(y1 - pad_y)))
    x2 = min(w, int(round(x2 + pad_x)))
    y2 = min(h, int(round(y2 + pad_y)))
    
    return image[y1:y2, x1:x2]


def detect_card_corners(image: np.ndarray) -> Optional[np.ndarray]:
    """
    Detect card corners using contour detection.
    
    Args:
        image: Input image (assumed to be cropped card region)
    
    Returns:
        4 corner points [tl, tr, br, bl] or None if detection fails
    """
    try:
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        # Enhance contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
        
        # Blur
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Adaptive threshold
        thresh = cv2.adaptiveThreshold(
            blur, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            11, 2
        )
        
        # Morphology to close gaps
        kernel = np.ones((5, 5), np.uint8)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            logger.warning("No contours found")
            return None
        
        # Get largest contour
        cnt = max(contours, key=cv2.contourArea)
        
        # Approximate polygon
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
        
        if len(approx) == 4:
            pts = approx.reshape(4, 2)
        else:
            # Fallback to minAreaRect
            rect = cv2.minAreaRect(cnt)
            box = cv2.boxPoints(rect)
            pts = np.int0(box)
        
        # Sort points to [tl, tr, br, bl]
        return sort_corners(pts)
        
    except Exception as e:
        logger.error(f"Corner detection failed: {e}")
        return None


def sort_corners(pts: np.ndarray) -> np.ndarray:
    """
    Sort 4 points to [top-left, top-right, bottom-right, bottom-left].
    
    Args:
        pts: 4 points array (4, 2)
    
    Returns:
        Sorted points (4, 2)
    """
    rect = np.zeros((4, 2), dtype="float32")
    
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]  # Top-left (smallest sum)
    rect[2] = pts[np.argmax(s)]  # Bottom-right (largest sum)
    
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # Top-right (smallest diff)
    rect[3] = pts[np.argmax(diff)]  # Bottom-left (largest diff)
    
    return rect


def perspective_transform(image: np.ndarray, pts: np.ndarray) -> np.ndarray:
    """
    Apply perspective transform to get bird's eye view.
    
    Args:
        image: Input image
        pts: 4 corner points [tl, tr, br, bl]
    
    Returns:
        Warped/aligned image
    """
    (tl, tr, br, bl) = pts
    
    # Compute output size
    width_a = np.linalg.norm(br - bl)
    width_b = np.linalg.norm(tr - tl)
    max_w = int(max(width_a, width_b))
    
    height_a = np.linalg.norm(tr - br)
    height_b = np.linalg.norm(tl - bl)
    max_h = int(max(height_a, height_b))
    
    # Destination points
    dst = np.array([
        [0, 0],
        [max_w - 1, 0],
        [max_w - 1, max_h - 1],
        [0, max_h - 1]
    ], dtype="float32")
    
    # Perspective transform
    M = cv2.getPerspectiveTransform(pts, dst)
    warped = cv2.warpPerspective(image, M, (max_w, max_h))
    
    return warped


def auto_align_card(image: np.ndarray) -> Tuple[np.ndarray, bool]:
    """
    Auto-align card image using corner detection and perspective transform.
    
    Args:
        image: Input card image
    
    Returns:
        Tuple of (aligned_image, success_flag)
    """
    corners = detect_card_corners(image)
    
    if corners is None:
        logger.warning("Auto-align failed, returning original image")
        return image, False
    
    aligned = perspective_transform(image, corners)
    return aligned, True


def preprocess_for_ocr(image: np.ndarray, field_name: Optional[str] = None) -> np.ndarray:
    """
    Preprocess image for OCR based on field type.
    
    Args:
        image: Input image (BGR)
        field_name: Field name for specific preprocessing
    
    Returns:
        Preprocessed image
    """
    if image is None or image.size == 0:
        return image
    
    h, w = image.shape[:2]
    
    # Upscale small images
    scale = 2 if min(h, w) < 80 else 1
    if scale > 1:
        image = cv2.resize(image, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC)
    
    # Special preprocessing for specific fields
    if field_name in {"id_number", "date_of_birth", "date_of_expiry"}:
        # Enhance contrast for text/number fields
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        image = cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)
    
    return image


def resize_with_aspect(image: np.ndarray, max_size: int = 1280) -> np.ndarray:
    """
    Resize image keeping aspect ratio.
    
    Args:
        image: Input image
        max_size: Maximum dimension
    
    Returns:
        Resized image
    """
    h, w = image.shape[:2]
    
    if max(h, w) <= max_size:
        return image
    
    scale = max_size / max(h, w)
    new_w = int(w * scale)
    new_h = int(h * scale)
    
    return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)


def encode_image_to_base64(image: np.ndarray, format: str = '.jpg') -> str:
    """
    Encode image to base64 string.
    
    Args:
        image: Input image (BGR)
        format: Image format
    
    Returns:
        Base64 encoded string
    """
    import base64
    
    success, buffer = cv2.imencode(format, image)
    if not success:
        raise ValueError("Failed to encode image")
    
    return base64.b64encode(buffer).decode('utf-8')


def decode_base64_to_image(base64_string: str) -> np.ndarray:
    """
    Decode base64 string to image.
    
    Args:
        base64_string: Base64 encoded image
    
    Returns:
        Decoded image (BGR)
    """
    import base64
    
    buffer = base64.b64decode(base64_string)
    nparr = np.frombuffer(buffer, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    return image

"""
Services module for CCCD OCR API.
"""

from .detector import CCCDDetector, get_default_model_path
from .image_processing import (
    crop_with_padding,
    detect_card_corners,
    perspective_transform,
    auto_align_card,
    preprocess_for_ocr,
    encode_image_to_base64,
    decode_base64_to_image,
    resize_with_aspect,
    sort_corners
)
from .ocr import (
    VietOCREngine,
    TextCleaner,
    CCCDTextExtractor,
    get_default_ocr_path
)

__all__ = [
    # Detector
    'CCCDDetector',
    'get_default_model_path',
    # Image Processing
    'crop_with_padding',
    'detect_card_corners',
    'perspective_transform',
    'auto_align_card',
    'preprocess_for_ocr',
    'encode_image_to_base64',
    'decode_base64_to_image',
    'resize_with_aspect',
    'sort_corners',
    # OCR
    'VietOCREngine',
    'TextCleaner',
    'CCCDTextExtractor',
    'get_default_ocr_path',
]

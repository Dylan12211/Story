"""
Utils module for CCCD OCR API.
"""

from .helpers import (
    load_image_from_path,
    save_image,
    decode_base64_image,
    encode_image_to_base64,
    get_image_dimensions,
    ensure_rgb,
    ensure_bgr
)
from .session_manager import (
    SessionManager,
    CCCDSession,
    get_session_manager
)

__all__ = [
    # Helpers
    'load_image_from_path',
    'save_image',
    'decode_base64_image',
    'encode_image_to_base64',
    'get_image_dimensions',
    'ensure_rgb',
    'ensure_bgr',
    # Session Manager
    'SessionManager',
    'CCCDSession',
    'get_session_manager',
]

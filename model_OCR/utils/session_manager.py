"""
Session manager for CCCD multi-step processing.
Lưu trữ dữ liệu tạm giữa các bước: upload → detect → adjust → OCR
"""

import os
import cv2
import uuid
import time
import numpy as np
from typing import Dict, Optional, Any, Tuple
from pathlib import Path
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import threading


@dataclass
class CCCDSession:
    """Session data cho quá trình xử lý CCCD"""
    session_id: str
    created_at: datetime
    original_image: Optional[np.ndarray] = None
    detected_bbox: Optional[list] = None
    detected_polygon: Optional[list] = None
    detection_confidence: float = 0.0
    adjusted_bbox: Optional[list] = None
    aligned_image: Optional[np.ndarray] = None
    ocr_result: Optional[Dict] = None
    status: str = "created"  # created → uploaded → detected → adjusted → ocr_completed
    temp_dir: str = field(default="")


class SessionManager:
    """Quản lý session cho CCCD processing pipeline"""

    def __init__(self, temp_dir: str = "temp_sessions", session_timeout: int = 3600):
        """
        Args:
            temp_dir: Thư mục lưu ảnh tạm
            session_timeout: Thời gian timeout session (giây)
        """
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.sessions: Dict[str, CCCDSession] = {}
        self.session_timeout = session_timeout
        self.lock = threading.Lock()

        # Bắt đầu cleanup thread
        self._start_cleanup_thread()

    def _start_cleanup_thread(self):
        """Khởi động thread dọn dẹp session cũ"""
        def cleanup():
            while True:
                time.sleep(300)  # Mỗi 5 phút
                self._cleanup_expired_sessions()

        thread = threading.Thread(target=cleanup, daemon=True)
        thread.start()

    def _cleanup_expired_sessions(self):
        """Xóa các session đã hết hạn"""
        expired = []
        cutoff = datetime.now() - timedelta(seconds=self.session_timeout)

        with self.lock:
            for session_id, session in self.sessions.items():
                if session.created_at < cutoff:
                    expired.append(session_id)

        for session_id in expired:
            self.delete_session(session_id)

    def create_session(self) -> str:
        """Tạo session mới, trả về session_id"""
        session_id = str(uuid.uuid4())[:8]  # Short UUID
        session_dir = self.temp_dir / session_id
        session_dir.mkdir(parents=True, exist_ok=True)

        session = CCCDSession(
            session_id=session_id,
            created_at=datetime.now(),
            temp_dir=str(session_dir)
        )

        with self.lock:
            self.sessions[session_id] = session

        return session_id

    def get_session(self, session_id: str) -> Optional[CCCDSession]:
        """Lấy session theo ID"""
        with self.lock:
            return self.sessions.get(session_id)

    def delete_session(self, session_id: str):
        """Xóa session và dữ liệu tạm"""
        with self.lock:
            session = self.sessions.pop(session_id, None)

        if session and session.temp_dir:
            # Xóa thư mục tạm
            import shutil
            try:
                shutil.rmtree(session.temp_dir, ignore_errors=True)
            except Exception:
                pass

    def save_uploaded_image(self, session_id: str, image: np.ndarray) -> bool:
        """Lưu ảnh gốc vào session"""
        session = self.get_session(session_id)
        if not session:
            return False

        session.original_image = image
        session.status = "uploaded"

        # Lưu file tạm
        temp_path = Path(session.temp_dir) / "original.jpg"
        cv2.imwrite(str(temp_path), image)

        return True

    def save_detection_result(self, session_id: str, bbox: list,
                           polygon: Optional[list], confidence: float) -> bool:
        """Lưu kết quả detect vào session"""
        session = self.get_session(session_id)
        if not session:
            return False

        session.detected_bbox = bbox
        session.detected_polygon = polygon
        session.detection_confidence = confidence
        session.status = "detected"

        return True

    def save_adjusted_bbox(self, session_id: str, adjusted_bbox: list) -> bool:
        """Lưu bbox đã được user điều chỉnh"""
        session = self.get_session(session_id)
        if not session:
            return False

        session.adjusted_bbox = adjusted_bbox
        session.status = "adjusted"

        return True

    def save_aligned_image(self, session_id: str, aligned_image: np.ndarray) -> bool:
        """Lưu ảnh đã căn chỉnh vào session"""
        session = self.get_session(session_id)
        if not session:
            return False

        session.aligned_image = aligned_image

        # Lưu file tạm
        temp_path = Path(session.temp_dir) / "aligned.jpg"
        cv2.imwrite(str(temp_path), aligned_image)

        return True

    def save_ocr_result(self, session_id: str, ocr_result: Dict) -> bool:
        """Lưu kết quả OCR vào session"""
        session = self.get_session(session_id)
        if not session:
            return False

        session.ocr_result = ocr_result
        session.status = "ocr_completed"

        return True

    def get_preview_with_bbox(self, session_id: str,
                              bbox: Optional[list] = None) -> Optional[np.ndarray]:
        """Tạo ảnh preview với bounding box"""
        session = self.get_session(session_id)
        if not session or session.original_image is None:
            return None

        image = session.original_image.copy()
        target_bbox = bbox or session.detected_bbox

        if target_bbox:
            x1, y1, x2, y2 = map(int, target_bbox)
            # Vẽ rectangle màu xanh lá
            cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 3)
            # Vẽ corner points
            corners = [(x1, y1), (x2, y1), (x2, y2), (x1, y2)]
            for i, (cx, cy) in enumerate(corners):
                color = [(0, 0, 255), (0, 255, 255), (255, 0, 0), (255, 255, 0)][i]
                cv2.circle(image, (cx, cy), 8, color, -1)
                cv2.circle(image, (cx, cy), 10, (255, 255, 255), 2)

        return image

    def crop_image_with_bbox(self, session_id: str, bbox: list) -> Optional[np.ndarray]:
        """Cắt ảnh theo bounding box"""
        session = self.get_session(session_id)
        if not session or session.original_image is None:
            return None

        x1, y1, x2, y2 = map(int, bbox)
        h, w = session.original_image.shape[:2]

        # Giới hạn trong kích thước ảnh
        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(w, x2)
        y2 = min(h, y2)

        if x1 >= x2 or y1 >= y2:
            return None

        return session.original_image[y1:y2, x1:x2]

    def get_session_info(self, session_id: str) -> Dict[str, Any]:
        """Lấy thông tin session"""
        session = self.get_session(session_id)
        if not session:
            return {"error": "Session not found"}

        return {
            "session_id": session.session_id,
            "status": session.status,
            "created_at": session.created_at.isoformat(),
            "has_original_image": session.original_image is not None,
            "has_detection": session.detected_bbox is not None,
            "has_aligned_image": session.aligned_image is not None,
            "has_ocr_result": session.ocr_result is not None,
            "detection_confidence": session.detection_confidence,
            "detected_bbox": session.detected_bbox,
            "adjusted_bbox": session.adjusted_bbox,
        }


# Singleton instance
_session_manager: Optional[SessionManager] = None


def get_session_manager() -> SessionManager:
    """Get or create singleton session manager"""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager

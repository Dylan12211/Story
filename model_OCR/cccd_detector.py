"""
CCCD Card Detection and Alignment Module
Uses YOLOv8 to detect CCCD card and OpenCV for perspective transform alignment
"""

import os
import cv2
import numpy as np
from ultralytics import YOLO
from typing import Dict, List, Tuple, Optional, Union
import math

# Model path - sử dụng model YOLOv8 của user
# Có thể thay đổi đường dẫn này theo vị trí thực tế của model
DEFAULT_MODEL_PATH = r"C:\Users\Admin\Desktop\Cuong\IDcard.v1i.yolov8\weights\best.pt"

# Alternative: sử dụng model trong thư mục project
PROJECT_MODEL_PATH = "runs/detect/train/weights/best.pt"


class CCCDDetector:
    """Detector for CCCD cards using YOLOv8"""

    def __init__(self, model_path: Optional[str] = None):
        """Initialize detector with YOLOv8 model"""
        self.model = None
        self.model_path = model_path or self._find_model_path()
        self._load_model()

    def _find_model_path(self) -> str:
        """Find available model path"""
        # Thử các đường dẫn có thể có
        paths_to_try = [
            DEFAULT_MODEL_PATH,
            PROJECT_MODEL_PATH,
            "yolov8n.pt",  # Default YOLOv8 nano model
        ]

        for path in paths_to_try:
            if os.path.exists(path):
                print(f"Found model at: {path}")
                return path

        # Nếu không tìm thấy, trả về đường dẫn mặc định và báo lỗi sau
        print(f"Warning: Model not found at any known paths. Using: {DEFAULT_MODEL_PATH}")
        return DEFAULT_MODEL_PATH

    def _load_model(self):
        """Load YOLOv8 model"""
        try:
            if os.path.exists(self.model_path):
                self.model = YOLO(self.model_path)
                print(f"✅ Loaded YOLOv8 model from: {self.model_path}")
            else:
                # Fallback: use default YOLOv8n model
                print(f"⚠️ Model not found at {self.model_path}, using default YOLOv8n")
                self.model = YOLO("yolov8n.pt")
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            raise

    def detect(self, image: np.ndarray, conf_threshold: float = 0.5) -> Optional[Dict]:
        """
        Detect CCCD card in image

        Args:
            image: OpenCV BGR image
            conf_threshold: Confidence threshold

        Returns:
            Dictionary with detection results or None if no detection
        """
        if self.model is None:
            raise RuntimeError("Model not loaded")

        try:
            results = self.model(image, conf=conf_threshold, verbose=False)
        except Exception as e:
            print(f"Model inference error: {e}")
            return None

        best_detection = None
        best_confidence = 0

        for result in results:
            if result.boxes is None or len(result.boxes) == 0:
                continue

            boxes = result.boxes
            for box in boxes:
                try:
                    confidence = float(box.conf[0])
                    if confidence > best_confidence and confidence >= conf_threshold:
                        best_confidence = confidence
                        cls = int(box.cls[0]) if box.cls is not None else 0

                        # Lấy bounding box
                        xyxy = box.xyxy
                        if xyxy is not None and len(xyxy) > 0:
                            coords = xyxy[0].cpu().numpy() if hasattr(xyxy[0], 'cpu') else xyxy[0]
                            x1, y1, x2, y2 = float(coords[0]), float(coords[1]), float(coords[2]), float(coords[3])

                            # Validate coordinates
                            if x1 < x2 and y1 < y2 and (x2 - x1) > 10 and (y2 - y1) > 10:
                                best_detection = {
                                    'bbox': [x1, y1, x2, y2],
                                    'confidence': confidence,
                                    'class_id': cls,
                                    'class_name': result.names.get(cls, 'unknown') if hasattr(result, 'names') and result.names else 'unknown'
                                }
                except Exception as e:
                    print(f"Error processing box: {e}")
                    continue

        return best_detection

    def detect_polygon(self, image: np.ndarray, conf_threshold: float = 0.5) -> Optional[Dict]:
        """
        Detect CCCD with polygon points (4 corners) if model supports it
        Fallback to bbox if polygon not available
        """
        detection = self.detect(image, conf_threshold)

        if detection is None:
            return None

        bbox = detection['bbox']
        x1, y1, x2, y2 = bbox

        # Tạo polygon từ bbox (4 điểm)
        polygon = [
            [x1, y1],  # Top-left
            [x2, y1],  # Top-right
            [x2, y2],  # Bottom-right
            [x1, y2]   # Bottom-left
        ]

        detection['polygon'] = polygon
        return detection


class CCCDAligner:
    """Align CCCD card using perspective transform"""

    # Kích thước chuẩn CCCD (cm)
    CCCD_WIDTH_CM = 8.56  # Chiều rộng thẻ
    CCCD_HEIGHT_CM = 5.4  # Chiều cao thẻ
    ASPECT_RATIO = CCCD_WIDTH_CM / CCCD_HEIGHT_CM  # ~1.585

    # Kích thước output (pixels) - đảm bảo chất lượng cao
    OUTPUT_WIDTH = 1712   # 8.56 cm @ 200 DPI
    OUTPUT_HEIGHT = 1080  # 5.4 cm @ 200 DPI

    def __init__(self):
        pass

    def align(self, image: np.ndarray, detection: Dict) -> Dict:
        """
        Align CCCD card from detection

        Args:
            image: Original image
            detection: Detection result with bbox or polygon

        Returns:
            Dictionary with aligned image and metadata
        """
        if 'polygon' in detection:
            return self._align_with_polygon(image, detection['polygon'])
        else:
            return self._align_with_bbox(image, detection['bbox'])

    def _align_with_polygon(self, image: np.ndarray, polygon: List[List[float]]) -> Dict:
        """
        Align using 4-point perspective transform (CamScanner style)
        polygon: [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
        """
        # Đảm bảo đúng thứ tự điểm: top-left, top-right, bottom-right, bottom-left
        pts_src = self._order_points(polygon)

        # Tính kích thước output dựa trên tỷ lệ CCCD
        width, height = self._calculate_output_size(pts_src)

        # Điểm đích (rectangle)
        pts_dst = np.array([
            [0, 0],
            [width - 1, 0],
            [width - 1, height - 1],
            [0, height - 1]
        ], dtype=np.float32)

        # Perspective transform
        matrix = cv2.getPerspectiveTransform(pts_src, pts_dst)
        aligned = cv2.warpPerspective(image, matrix, (width, height))

        # Tính góc xoay
        angle = self._calculate_rotation_angle(pts_src)

        return {
            'aligned_image': aligned,
            'angle': angle,
            'original_points': pts_src.tolist(),
            'width': width,
            'height': height,
            'method': 'perspective_transform'
        }

    def _align_with_bbox(self, image: np.ndarray, bbox: List[float]) -> Dict:
        """
        Align using bounding box + rotation detection
        bbox: [x1, y1, x2, y2]
        """
        x1, y1, x2, y2 = map(int, bbox)

        # Validate bbox
        img_h, img_w = image.shape[:2]
        x1 = max(0, min(x1, img_w))
        x2 = max(0, min(x2, img_w))
        y1 = max(0, min(y1, img_h))
        y2 = max(0, min(y2, img_h))

        if x1 >= x2 or y1 >= y2:
            raise ValueError(f"Invalid bounding box: [{x1}, {y1}, {x2}, {y2}]")

        # Crop vùng CCCD
        card_region = image[y1:y2, x1:x2]

        if card_region.size == 0:
            raise ValueError("Invalid bounding box: empty region")

        # Check minimum size
        if card_region.shape[0] < 50 or card_region.shape[1] < 50:
            raise ValueError(f"Detected region too small: {card_region.shape}")

        # Phát hiện góc xoay bằng minAreaRect
        angle = self._detect_skew_angle(card_region)

        # Xoay ảnh để thẳng
        aligned = self._rotate_image(card_region, angle)

        # Resize về kích thước chuẩn CCCD nếu cần
        aligned = self._resize_to_standard(aligned)

        return {
            'aligned_image': aligned,
            'angle': angle,
            'original_bbox': bbox,
            'width': aligned.shape[1],
            'height': aligned.shape[0],
            'method': 'bbox_rotate'
        }

    def _order_points(self, pts: List[List[float]]) -> np.ndarray:
        """
        Sắp xếp 4 điểm theo thứ tự: top-left, top-right, bottom-right, bottom-left
        """
        pts = np.array(pts, dtype=np.float32)

        # Tính centroid
        centroid = np.mean(pts, axis=0)

        # Sắp xếp theo góc so với centroid
        angles = np.arctan2(pts[:, 1] - centroid[1], pts[:, 0] - centroid[0])
        sorted_indices = np.argsort(angles)

        # Điều chỉnh để bắt đầu từ top-left
        # Top-left có góc lớn nhất (gần -3π/4 hoặc 135 độ)
        pts = pts[sorted_indices]

        # Xác định top-left, top-right, bottom-right, bottom-left
        # dựa trên tổng và hiệu tọa độ
        rect = np.zeros((4, 2), dtype=np.float32)

        s = pts.sum(axis=1)
        diff = np.diff(pts, axis=1)

        rect[0] = pts[np.argmin(s)]      # Top-left: min sum
        rect[2] = pts[np.argmax(s)]      # Bottom-right: max sum
        rect[1] = pts[np.argmin(diff)]   # Top-right: min diff
        rect[3] = pts[np.argmax(diff)]    # Bottom-left: max diff

        return rect

    def _calculate_output_size(self, pts: np.ndarray) -> Tuple[int, int]:
        """
        Tính kích thước output dựa trên tỷ lệ CCCD chuẩn
        """
        # Tính chiều rộng và cao trung bình
        width_top = np.linalg.norm(pts[1] - pts[0])
        width_bottom = np.linalg.norm(pts[2] - pts[3])
        width = int((width_top + width_bottom) / 2)

        height_left = np.linalg.norm(pts[3] - pts[0])
        height_right = np.linalg.norm(pts[2] - pts[1])
        height = int((height_left + height_right) / 2)

        # Đảm bảo tỷ lệ đúng CCCD
        current_ratio = width / height if height > 0 else self.ASPECT_RATIO

        if current_ratio > self.ASPECT_RATIO:
            # Quá rộng, điều chỉnh chiều rộng
            width = int(height * self.ASPECT_RATIO)
        else:
            # Quá cao, điều chỉnh chiều cao
            height = int(width / self.ASPECT_RATIO)

        # Giới hạn kích thước tối đa
        max_width = 2400
        max_height = 1600

        if width > max_width:
            scale = max_width / width
            width = max_width
            height = int(height * scale)

        if height > max_height:
            scale = max_height / height
            height = max_height
            width = int(width * scale)

        # Đảm bảo kích thước tối thiểu
        min_size = 400
        if width < min_size or height < min_size:
            # Sử dụng kích thước chuẩn
            return (self.OUTPUT_WIDTH, self.OUTPUT_HEIGHT)

        return (width, height)

    def _detect_skew_angle(self, image: np.ndarray) -> float:
        """
        Phát hiện góc nghiêng của thẻ CCCD sử dụng minAreaRect
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Tăng độ tương phản
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        # Edge detection
        edges = cv2.Canny(enhanced, 50, 150, apertureSize=3)

        # Tìm contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            return 0.0

        # Tìm contour lớn nhất (giả sử là thẻ CCCD)
        largest_contour = max(contours, key=cv2.contourArea)

        # minAreaRect để tìm hình chữ nhật xoay tối ưu
        rect = cv2.minAreaRect(largest_contour)
        angle = rect[2]

        # OpenCV trả về góc từ -90 đến 0
        # Nếu góc < -45, điều chỉnh
        if angle < -45:
            angle = 90 + angle

        return angle

    def _rotate_image(self, image: np.ndarray, angle: float) -> np.ndarray:
        """
        Xoay ảnh về góc thẳng
        """
        height, width = image.shape[:2]
        center = (width // 2, height // 2)

        # Tạo rotation matrix
        matrix = cv2.getRotationMatrix2D(center, angle, 1.0)

        # Tính kích thước mới để không bị cắt
        abs_cos = abs(matrix[0, 0])
        abs_sin = abs(matrix[0, 1])

        new_width = int(height * abs_sin + width * abs_cos)
        new_height = int(height * abs_cos + width * abs_sin)

        # Điều chỉnh matrix để giữ ảnh ở giữa
        matrix[0, 2] += (new_width - width) / 2
        matrix[1, 2] += (new_height - height) / 2

        # Xoay ảnh
        rotated = cv2.warpAffine(image, matrix, (new_width, new_height),
                                 borderMode=cv2.BORDER_CONSTANT,
                                 borderValue=(255, 255, 255))

        return rotated

    def _resize_to_standard(self, image: np.ndarray) -> np.ndarray:
        """
        Resize ảnh về tỷ lệ chuẩn CCCD nếu cần
        """
        height, width = image.shape[:2]
        current_ratio = width / height

        # Nếu tỷ lệ gần đúng, giữ nguyên
        if abs(current_ratio - self.ASPECT_RATIO) < 0.1:
            return image

        # Tính kích thước mới giữ nguyên tỷ lệ CCCD
        if current_ratio > self.ASPECT_RATIO:
            # Quá rộng
            new_width = int(height * self.ASPECT_RATIO)
            start_x = (width - new_width) // 2
            cropped = image[:, start_x:start_x + new_width]
            return cropped
        else:
            # Quá cao
            new_height = int(width / self.ASPECT_RATIO)
            start_y = (height - new_height) // 2
            cropped = image[start_y:start_y + new_height, :]
            return cropped

    def _calculate_rotation_angle(self, pts: np.ndarray) -> float:
        """
        Tính góc xoay từ 4 điểm
        """
        # Vector top edge
        top_edge = pts[1] - pts[0]

        # Tính góc so với trục x
        angle = math.degrees(math.atan2(top_edge[1], top_edge[0]))

        return angle


class CCCDProcessor:
    """Main processor combining detection and alignment"""

    def __init__(self, model_path: Optional[str] = None):
        self.detector = CCCDDetector(model_path)
        self.aligner = CCCDAligner()

    def process(self, image: np.ndarray, conf_threshold: float = 0.5) -> Dict:
        """
        Full pipeline: detect -> align -> return

        Args:
            image: OpenCV BGR image
            conf_threshold: Detection confidence threshold

        Returns:
            Dictionary with aligned image and metadata
        """
        # Step 1: Detect
        detection = self.detector.detect_polygon(image, conf_threshold)

        if detection is None:
            return {
                'success': False,
                'error': 'No CCCD card detected in image',
                'aligned_image': None,
                'detection': None
            }

        # Step 2: Align
        try:
            align_result = self.aligner.align(image, detection)

            return {
                'success': True,
                'aligned_image': align_result['aligned_image'],
                'angle': align_result['angle'],
                'detection': {
                    'bbox': detection.get('bbox'),
                    'confidence': detection.get('confidence'),
                    'polygon': detection.get('polygon')
                },
                'metadata': {
                    'width': align_result['width'],
                    'height': align_result['height'],
                    'method': align_result['method'],
                    'original_points': align_result.get('original_points')
                }
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Alignment failed: {str(e)}',
                'aligned_image': None,
                'detection': detection
            }


def encode_image_to_base64(image: np.ndarray, format: str = 'jpeg') -> str:
    """Encode OpenCV image to base64 string"""
    import base64

    if format.lower() == 'jpeg' or format.lower() == 'jpg':
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, 95]
        ext = '.jpg'
    else:
        encode_params = []
        ext = '.png'

    success, buffer = cv2.imencode(ext, image, encode_params)

    if not success:
        raise ValueError("Failed to encode image")

    return base64.b64encode(buffer).decode('utf-8')


def decode_base64_to_image(base64_string: str) -> np.ndarray:
    """Decode base64 string to OpenCV image"""
    import base64

    # Xử lý data URI nếu có
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]

    buffer = base64.b64decode(base64_string)
    nparr = np.frombuffer(buffer, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    return image


# Singleton instance
_processor: Optional[CCCDProcessor] = None


def get_processor(model_path: Optional[str] = None) -> CCCDProcessor:
    """Get or create singleton processor instance"""
    global _processor
    if _processor is None:
        _processor = CCCDProcessor(model_path)
    return _processor


def process_cccd_image(image: np.ndarray, conf_threshold: float = 0.5) -> Dict:
    """
    Convenience function to process CCCD image
    """
    processor = get_processor()
    return processor.process(image, conf_threshold)

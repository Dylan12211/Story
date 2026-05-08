"""
CCCD Step-by-Step Flow API

Flow xử lý CCCD theo từng bước:
1. Upload file
2. Model nhận khung CCCD
3. Hiển thị kết quả đã nhận khung cho user xem
4. User chỉnh sửa/cắt (nếu cần)
5. Gửi ảnh cho model OCR

Endpoints:
- POST /cccd-flow/create-session     : Tạo session mới
- POST /cccd-flow/upload/{session_id}: Upload ảnh CCCD
- POST /cccd-flow/detect/{session_id}: Detect khung CCCD
- GET  /cccd-flow/preview/{session_id}: Xem preview với khung detect
- POST /cccd-flow/adjust/{session_id}: Điều chỉnh khung (optional)
- POST /cccd-flow/align/{session_id} : Cắt và căn chỉnh ảnh
- GET  /cccd-flow/aligned/{session_id}: Xem ảnh đã căn chỉnh
- POST /cccd-flow/ocr/{session_id}   : OCR ảnh đã căn chỉnh
- GET  /cccd-flow/result/{session_id}: Lấy kết quả cuối cùng
- DEL  /cccd-flow/session/{session_id}: Xóa session
"""

import cv2
import numpy as np
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
from pydantic import BaseModel

# Import services và utils
from services import CCCDDetector, encode_image_to_base64, decode_base64_to_image
from utils.session_manager import get_session_manager, CCCDSession
from utils.helpers import decode_base64_image
from cccd_detector import CCCDAligner
from ocr_model import process_id_card

# Constants
YOLO_MODEL_PATH = r"C:\Users\Admin\Desktop\Cuong\IDcard.v1i.yolov8\weights\best.pt"

# Initialize router
router = APIRouter(prefix="/cccd-flow", tags=["CCCD Step Flow"])

# Initialize detector (lazy load)
_detector: Optional[CCCDDetector] = None
_aligner: Optional[CCCDAligner] = None


def get_detector() -> CCCDDetector:
    """Get or create detector instance"""
    global _detector
    if _detector is None:
        _detector = CCCDDetector(YOLO_MODEL_PATH)
    return _detector


def get_aligner() -> CCCDAligner:
    """Get or create aligner instance"""
    global _aligner
    if _aligner is None:
        _aligner = CCCDAligner()
    return _aligner


# ============ Pydantic Models ============

class AdjustBBoxRequest(BaseModel):
    """Request để điều chỉnh bounding box"""
    x1: float
    y1: float
    x2: float
    y2: float


class DetectionResponse(BaseModel):
    """Response sau khi detect"""
    success: bool
    message: str
    session_id: str
    detection: Optional[dict] = None
    preview_image: Optional[str] = None  # base64


class OCRResponse(BaseModel):
    """Response sau khi OCR"""
    success: bool
    message: str
    session_id: str
    ocr_data: Optional[dict] = None
    aligned_image: Optional[str] = None  # base64


class SessionInfoResponse(BaseModel):
    """Response thông tin session"""
    session_id: str
    status: str
    has_original_image: bool
    has_detection: bool
    has_aligned_image: bool
    has_ocr_result: bool
    detection_confidence: float
    detected_bbox: Optional[list] = None
    adjusted_bbox: Optional[list] = None


# ============ API Endpoints ============

@router.post("/create-session", response_model=dict)
async def create_session():
    """
    Bước 0: Tạo session mới để bắt đầu flow xử lý CCCD.
    Trả về session_id để sử dụng cho các bước tiếp theo.
    """
    session_manager = get_session_manager()
    session_id = session_manager.create_session()

    return {
        "success": True,
        "message": "Session created successfully",
        "session_id": session_id
    }


@router.post("/upload/{session_id}", response_model=dict)
async def upload_image(session_id: str, file: UploadFile = File(...)):
    """
    Bước 1: Upload ảnh CCCD vào session.

    - session_id: ID từ bước create-session
    - file: Ảnh CCCD (jpg, png)
    """
    session_manager = get_session_manager()
    session = session_manager.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        # Đọc ảnh từ upload
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        # Lưu vào session
        success = session_manager.save_uploaded_image(session_id, image)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to save image")

        return {
            "success": True,
            "message": "Image uploaded successfully",
            "session_id": session_id,
            "image_info": {
                "width": image.shape[1],
                "height": image.shape[0],
                "channels": image.shape[2] if len(image.shape) > 2 else 1
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")


@router.post("/detect/{session_id}", response_model=DetectionResponse)
async def detect_card(session_id: str, conf_threshold: float = 0.5):
    r"""
    Bước 2: Detect khung CCCD trong ảnh đã upload.

    Sử dụng YOLOv8 model tại: C:\Users\Admin\Desktop\Cuong\IDcard.v1i.yolov8\weights\best.pt

    - session_id: ID session
    - conf_threshold: Ngưỡng confidence (mặc định 0.5)

    Trả về:
    - Bounding box của CCCD
    - Preview image với khung đã vẽ (base64)
    - Confidence score
    """
    session_manager = get_session_manager()
    session = session_manager.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.original_image is None:
        raise HTTPException(status_code=400, detail="No image uploaded. Call /upload first.")

    try:
        # Get detector
        detector = get_detector()

        # Detect card
        result = detector.detect_card(session.original_image, conf_threshold)

        if result is None:
            return DetectionResponse(
                success=False,
                message="No CCCD card detected in image",
                session_id=session_id,
                detection=None,
                preview_image=None
            )

        # Extract detection info
        bbox = result["bbox"]
        confidence = result["confidence"]

        # Create polygon from bbox
        x1, y1, x2, y2 = bbox
        polygon = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]

        # Save detection result to session
        session_manager.save_detection_result(
            session_id=session_id,
            bbox=bbox,
            polygon=polygon,
            confidence=confidence
        )

        # Create preview image with bbox
        preview_image = session_manager.get_preview_with_bbox(session_id)

        # Encode preview to base64
        preview_base64 = None
        if preview_image is not None:
            preview_base64 = f"data:image/jpeg;base64,{encode_image_to_base64(preview_image, '.jpg')}"

        return DetectionResponse(
            success=True,
            message="CCCD card detected successfully",
            session_id=session_id,
            detection={
                "bbox": bbox,
                "polygon": polygon,
                "confidence": confidence
            },
            preview_image=preview_base64
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection error: {str(e)}")


@router.get("/preview/{session_id}", response_model=dict)
async def get_preview(session_id: str, use_adjusted: bool = False):
    """
    Bước 3: Xem preview ảnh với khung detect.

    - session_id: ID session
    - use_adjusted: Sử dụng bbox đã điều chỉnh (nếu có)

    Trả về preview image (base64) để hiển thị cho user.
    """
    session_manager = get_session_manager()
    session = session_manager.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.original_image is None:
        raise HTTPException(status_code=400, detail="No image uploaded")

    try:
        # Determine which bbox to use
        bbox = None
        if use_adjusted and session.adjusted_bbox:
            bbox = session.adjusted_bbox
        elif session.detected_bbox:
            bbox = session.detected_bbox

        # Create preview
        preview_image = session_manager.get_preview_with_bbox(session_id, bbox)

        if preview_image is None:
            raise HTTPException(status_code=400, detail="Failed to create preview")

        # Encode to base64
        preview_base64 = encode_image_to_base64(preview_image, '.jpg')

        return {
            "success": True,
            "session_id": session_id,
            "preview_image": f"data:image/jpeg;base64,{preview_base64}",
            "bbox_used": bbox,
            "is_adjusted": use_adjusted and session.adjusted_bbox is not None
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview error: {str(e)}")


@router.post("/adjust/{session_id}", response_model=dict)
async def adjust_bbox(session_id: str, request: AdjustBBoxRequest):
    """
    Bước 4 (Optional): Điều chỉnh bounding box theo ý muốn user.

    User có thể điều chỉnh lại khung detect nếu chưa chính xác.

    - session_id: ID session
    - request: Tọa độ bbox mới (x1, y1, x2, y2)

    Lưu ý: Bước này là optional. Nếu không điều chỉnh, sẽ dùng bbox từ detect.
    """
    session_manager = get_session_manager()
    session = session_manager.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.original_image is None:
        raise HTTPException(status_code=400, detail="No image uploaded")

    try:
        # Validate bbox
        h, w = session.original_image.shape[:2]
        x1, y1, x2, y2 = request.x1, request.y1, request.x2, request.y2

        # Giới hạn trong ảnh
        x1 = max(0, min(x1, w))
        y1 = max(0, min(y1, h))
        x2 = max(0, min(x2, w))
        y2 = max(0, min(y2, h))

        if x1 >= x2 or y1 >= y2:
            raise HTTPException(status_code=400, detail="Invalid bounding box")

        adjusted_bbox = [x1, y1, x2, y2]

        # Save adjusted bbox
        success = session_manager.save_adjusted_bbox(session_id, adjusted_bbox)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to save adjusted bbox")

        # Create preview with adjusted bbox
        preview_image = session_manager.get_preview_with_bbox(session_id, adjusted_bbox)
        preview_base64 = encode_image_to_base64(preview_image, '.jpg')

        return {
            "success": True,
            "message": "Bounding box adjusted successfully",
            "session_id": session_id,
            "adjusted_bbox": adjusted_bbox,
            "preview_image": f"data:image/jpeg;base64,{preview_base64}"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Adjust error: {str(e)}")


@router.post("/align/{session_id}", response_model=dict)
async def align_card(session_id: str):
    """
    Bước 5: Cắt và căn chỉnh ảnh CCCD.

    Dùng bbox (detected hoặc adjusted) để cắt ảnh và căn chỉnh perspective.

    - session_id: ID session

    Trả về ảnh đã căn chỉnh (base64) và thông tin alignment.
    """
    session_manager = get_session_manager()
    session = session_manager.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.original_image is None:
        raise HTTPException(status_code=400, detail="No image uploaded")

    # Determine which bbox to use (adjusted > detected)
    bbox = session.adjusted_bbox or session.detected_bbox

    if bbox is None:
        raise HTTPException(status_code=400, detail="No detection found. Call /detect first.")

    try:
        # Get aligner
        aligner = get_aligner()

        # Create detection dict for aligner
        detection = {
            'bbox': bbox,
            'polygon': [
                [bbox[0], bbox[1]],
                [bbox[2], bbox[1]],
                [bbox[2], bbox[3]],
                [bbox[0], bbox[3]]
            ]
        }

        # Align image
        align_result = aligner.align(session.original_image, detection)

        if 'aligned_image' not in align_result or align_result['aligned_image'] is None:
            raise HTTPException(status_code=500, detail="Alignment failed")

        aligned_image = align_result['aligned_image']

        # Save aligned image
        success = session_manager.save_aligned_image(session_id, aligned_image)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to save aligned image")

        # Encode aligned image to base64
        aligned_base64 = encode_image_to_base64(aligned_image, '.jpg')

        return {
            "success": True,
            "message": "Card aligned successfully",
            "session_id": session_id,
            "aligned_image": f"data:image/jpeg;base64,{aligned_base64}",
            "metadata": {
                "angle": align_result.get('angle', 0),
                "width": align_result.get('width', aligned_image.shape[1]),
                "height": align_result.get('height', aligned_image.shape[0]),
                "method": align_result.get('method', 'unknown')
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Alignment error: {str(e)}")


@router.get("/aligned/{session_id}", response_model=dict)
async def get_aligned_image(session_id: str):
    """
    Xem ảnh đã căn chỉnh.

    - session_id: ID session
    """
    session_manager = get_session_manager()
    session = session_manager.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.aligned_image is None:
        raise HTTPException(status_code=400, detail="No aligned image. Call /align first.")

    try:
        # Encode aligned image
        aligned_base64 = encode_image_to_base64(session.aligned_image, '.jpg')

        return {
            "success": True,
            "session_id": session_id,
            "aligned_image": f"data:image/jpeg;base64,{aligned_base64}",
            "image_info": {
                "width": session.aligned_image.shape[1],
                "height": session.aligned_image.shape[0]
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/ocr/{session_id}", response_model=OCRResponse)
async def run_ocr(session_id: str):
    """
    Bước 6: OCR ảnh CCCD đã căn chỉnh.

    Nhận dạng thông tin từ ảnh CCCD đã được căn chỉnh.

    - session_id: ID session

    Trả về kết quả OCR (số CCCD, họ tên, ngày sinh, v.v.).
    """
    session_manager = get_session_manager()
    session = session_manager.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.aligned_image is None:
        raise HTTPException(status_code=400, detail="No aligned image. Call /align first.")

    try:
        # Run OCR
        ocr_result = process_id_card(session.aligned_image)

        # Save OCR result
        session_manager.save_ocr_result(session_id, ocr_result)

        # Encode aligned image for response
        aligned_base64 = encode_image_to_base64(session.aligned_image, '.jpg')

        return OCRResponse(
            success=True,
            message="OCR completed successfully",
            session_id=session_id,
            ocr_data=ocr_result,
            aligned_image=f"data:image/jpeg;base64,{aligned_base64}"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR error: {str(e)}")


@router.get("/result/{session_id}", response_model=dict)
async def get_result(session_id: str):
    """
    Lấy kết quả cuối cùng của session.

    Bao gồm: thông tin ảnh gốc, detect, ảnh đã căn chỉnh, và kết quả OCR.
    """
    session_manager = get_session_manager()
    session = session_manager.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = {
        "success": True,
        "session_id": session_id,
        "status": session.status,
        "detection": {
            "bbox": session.detected_bbox,
            "confidence": session.detection_confidence,
            "adjusted_bbox": session.adjusted_bbox
        } if session.detected_bbox else None,
        "ocr": session.ocr_result
    }

    # Include aligned image if available
    if session.aligned_image is not None:
        aligned_base64 = encode_image_to_base64(session.aligned_image, '.jpg')
        result["aligned_image"] = f"data:image/jpeg;base64,{aligned_base64}"

    return result


@router.get("/session/{session_id}", response_model=SessionInfoResponse)
async def get_session_status(session_id: str):
    """
    Lấy thông tin trạng thái hiện tại của session.
    """
    session_manager = get_session_manager()
    info = session_manager.get_session_info(session_id)

    if "error" in info:
        raise HTTPException(status_code=404, detail=info["error"])

    return SessionInfoResponse(
        session_id=info["session_id"],
        status=info["status"],
        has_original_image=info["has_original_image"],
        has_detection=info["has_detection"],
        has_aligned_image=info["has_aligned_image"],
        has_ocr_result=info["has_ocr_result"],
        detection_confidence=info["detection_confidence"],
        detected_bbox=info.get("detected_bbox"),
        adjusted_bbox=info.get("adjusted_bbox")
    )


@router.delete("/session/{session_id}", response_model=dict)
async def delete_session(session_id: str):
    """
    Xóa session và dọn dẹp dữ liệu tạm.
    Nên gọi khi đã hoàn thành flow để giải phóng tài nguyên.
    """
    session_manager = get_session_manager()
    session = session_manager.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session_manager.delete_session(session_id)

    return {
        "success": True,
        "message": "Session deleted successfully",
        "session_id": session_id
    }


@router.get("/health", response_model=dict)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "cccd-step-flow",
        "model_path": YOLO_MODEL_PATH
    }

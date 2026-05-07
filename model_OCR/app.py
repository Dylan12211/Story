from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
from PIL import Image
import io
import base64
from typing import Optional
from ocr_model import process_id_card
from cccd_detector import CCCDProcessor, encode_image_to_base64, get_processor
from api_cccd_stepflow import router as cccd_flow_router

app = FastAPI(title="ID Card OCR & Detection API")

# Initialize CCCD processor on startup
cccd_processor: Optional[CCCDProcessor] = None

@app.on_event("startup")
async def startup_event():
    global cccd_processor
    try:
        cccd_processor = get_processor()
        print("✅ CCCD Processor initialized successfully")
    except Exception as e:
        print(f"⚠️ Failed to initialize CCCD Processor: {e}")

# CORS middleware để cho phép gọi từ web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include CCCD step flow router
app.include_router(cccd_flow_router)

@app.post("/ocr/id-card")
async def ocr_id_card(file: UploadFile = File(...)):
    """Endpoint nhận ảnh và trả về kết quả OCR"""

    try:
        # Đọc ảnh từ upload
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        image_np = np.array(image)

        # Convert RGB to BGR cho OpenCV
        if len(image_np.shape) == 3:
            image_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)

        # Process OCR
        result = process_id_card(image_np)

        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        return {
            "success": True,
            "data": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/cccd/detect")
async def detect_cccd(file: UploadFile = File(...), conf_threshold: float = 0.5):
    """
    Endpoint phát hiện CCCD trong ảnh
    Trả về bounding box và polygon points
    """
    global cccd_processor

    if cccd_processor is None:
        raise HTTPException(status_code=503, detail="CCCD Processor not initialized")

    try:
        # Đọc ảnh
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        # Detect CCCD
        detection = cccd_processor.detector.detect_polygon(image, conf_threshold)

        if detection is None:
            return JSONResponse({
                "success": False,
                "message": "No CCCD card detected in image",
                "detection": None
            })

        # Encode preview image with bounding box
        preview_image = image.copy()
        bbox = detection['bbox']
        x1, y1, x2, y2 = map(int, bbox)
        cv2.rectangle(preview_image, (x1, y1), (x2, y2), (0, 255, 0), 3)

        # Add polygon if available
        if 'polygon' in detection:
            pts = np.array(detection['polygon'], np.int32)
            pts = pts.reshape((-1, 1, 2))
            cv2.polylines(preview_image, [pts], True, (255, 0, 0), 2)

        preview_base64 = encode_image_to_base64(preview_image, 'jpeg')

        return {
            "success": True,
            "detection": {
                "bbox": detection['bbox'],
                "polygon": detection.get('polygon'),
                "confidence": detection['confidence'],
                "class_id": detection.get('class_id'),
                "class_name": detection.get('class_name')
            },
            "preview_image": f"data:image/jpeg;base64,{preview_base64}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/cccd/align")
async def align_cccd(file: UploadFile = File(...), conf_threshold: float = 0.5):
    """
    Endpoint detect + align CCCD
    Trả về ảnh CCCD đã được căn thẳng và crop
    """
    global cccd_processor

    if cccd_processor is None:
        raise HTTPException(status_code=503, detail="CCCD Processor not initialized")

    try:
        # Đọc ảnh
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        # Process: detect + align
        result = cccd_processor.process(image, conf_threshold)

        if not result['success']:
            return JSONResponse({
                "success": False,
                "message": result.get('error', 'Processing failed'),
                "detection": result.get('detection')
            })

        # Check if aligned_image exists
        aligned_image = result.get('aligned_image')
        if aligned_image is None:
            return JSONResponse({
                "success": False,
                "message": "Alignment failed: no output image",
                "detection": result.get('detection')
            })

        # Encode aligned image
        aligned_base64 = encode_image_to_base64(aligned_image, 'jpeg')

        return {
            "success": True,
            "message": "CCCD detected and aligned successfully",
            "aligned_image": f"data:image/jpeg;base64,{aligned_base64}",
            "metadata": {
                "angle": result['angle'],
                "width": result['metadata']['width'],
                "height": result['metadata']['height'],
                "method": result['metadata']['method']
            },
            "detection": result['detection']
        }

    except Exception as e:
        import traceback
        print(f"Error in align_cccd: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/cccd/process-full")
async def process_cccd_full(file: UploadFile = File(...), conf_threshold: float = 0.5):
    """
    Endpoint full pipeline: detect -> align -> OCR
    Trả về ảnh đã align + thông tin OCR
    """
    global cccd_processor

    if cccd_processor is None:
        raise HTTPException(status_code=503, detail="CCCD Processor not initialized")

    try:
        # Đọc ảnh
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        # Step 1: Detect + Align
        align_result = cccd_processor.process(image, conf_threshold)

        if not align_result['success']:
            return JSONResponse({
                "success": False,
                "message": align_result.get('error', 'Processing failed'),
                "detection": align_result.get('detection')
            })

        # Check if aligned_image exists
        aligned_image = align_result.get('aligned_image')
        if aligned_image is None:
            return JSONResponse({
                "success": False,
                "message": "Alignment failed: no output image",
                "detection": align_result.get('detection')
            })

        # Step 2: OCR on aligned image
        try:
            ocr_result = process_id_card(aligned_image)
        except Exception as ocr_err:
            print(f"OCR error: {ocr_err}")
            ocr_result = {"error": str(ocr_err)}

        # Encode aligned image
        aligned_base64 = encode_image_to_base64(aligned_image, 'jpeg')

        return {
            "success": True,
            "message": "CCCD processed successfully",
            "aligned_image": f"data:image/jpeg;base64,{aligned_base64}",
            "ocr_data": ocr_result,
            "metadata": {
                "angle": align_result['angle'],
                "width": align_result['metadata']['width'],
                "height": align_result['metadata']['height'],
                "method": align_result['metadata']['method']
            },
            "detection": align_result['detection']
        }

    except Exception as e:
        import traceback
        print(f"Error in process_cccd_full: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def root():
    return {
        "message": "ID Card OCR API is running",
        "endpoints": {
            "legacy": {
                "ocr": "/ocr/id-card",
                "detect": "/cccd/detect",
                "align": "/cccd/align",
                "full_pipeline": "/cccd/process-full"
            },
            "step_by_step_flow": {
                "description": "CCCD Login/Profile Edit Flow - Từng bước",
                "endpoints": {
                    "1_create_session": "POST /cccd-flow/create-session",
                    "2_upload": "POST /cccd-flow/upload/{session_id}",
                    "3_detect": "POST /cccd-flow/detect/{session_id}",
                    "4_preview": "GET /cccd-flow/preview/{session_id}",
                    "5_adjust": "POST /cccd-flow/adjust/{session_id} (optional)",
                    "6_align": "POST /cccd-flow/align/{session_id}",
                    "7_aligned_image": "GET /cccd-flow/aligned/{session_id}",
                    "8_ocr": "POST /cccd-flow/ocr/{session_id}",
                    "9_result": "GET /cccd-flow/result/{session_id}",
                    "delete_session": "DELETE /cccd-flow/session/{session_id}"
                }
            }
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

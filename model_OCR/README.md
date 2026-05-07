# CCCD Detection & Alignment System

Hệ thống phát hiện và căn chỉnh ảnh CCCD (Thẻ Căn cước công dân) sử dụng YOLOv8 và OpenCV.

## 🎯 Tính năng

1. **Phát hiện CCCD** (YOLOv8): Tự động phát hiện vùng chứa thẻ CCCD trong ảnh
2. **Căn chỉnh tự động** (OpenCV):
   - Phát hiện góc nghiêng
   - Xoay ảnh về đúng góc (deskew)
   - Perspective transform (nếu có 4 điểm)
3. **OCR**: Trích xuất thông tin từ ảnh đã căn chỉnh

## 📁 Cấu trúc

```
model_OCR/
├── app.py                 # FastAPI server (main entry)
├── cccd_detector.py       # Detection & alignment logic
├── ocr_model.py          # OCR logic (EasyOCR)
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

## 🚀 Cài đặt & Chạy

### 1. Cài đặt dependencies

```bash
cd model_OCR
pip install -r requirements.txt
```

### 2. Cấu hình model YOLOv8

Cập nhật đường dẫn model trong `cccd_detector.py`:

```python
DEFAULT_MODEL_PATH = r"C:\Users\Admin\Desktop\Cuong\IDcard.v1i.yolov8\weights\ocrmodel.pth"
```

Hoặc đặt model vào thư mục `runs/detect/train/weights/best.pt`

### 3. Chạy server

```bash
python app.py
```

Server sẽ chạy tại `http://localhost:8000`

## 📡 API Endpoints

### 1. Detect CCCD
```http
POST /cccd/detect
Content-Type: multipart/form-data

file: <image_file>
conf_threshold: 0.5  # optional
```

**Response:**
```json
{
  "success": true,
  "detection": {
    "bbox": [x1, y1, x2, y2],
    "polygon": [[x1,y1], [x2,y2], [x3,y3], [x4,y4]],
    "confidence": 0.92,
    "class_id": 0,
    "class_name": "id_card"
  },
  "preview_image": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

### 2. Detect + Align CCCD
```http
POST /cccd/align
Content-Type: multipart/form-data

file: <image_file>
conf_threshold: 0.5  # optional
```

**Response:**
```json
{
  "success": true,
  "message": "CCCD detected and aligned successfully",
  "aligned_image": "data:image/jpeg;base64,/9j/4AAQ...",
  "metadata": {
    "angle": 2.5,
    "width": 1712,
    "height": 1080,
    "method": "perspective_transform"
  },
  "detection": { ... }
}
```

### 3. Full Pipeline (Detect + Align + OCR)
```http
POST /cccd/process-full
Content-Type: multipart/form-data

file: <image_file>
conf_threshold: 0.5  # optional
```

**Response:**
```json
{
  "success": true,
  "message": "CCCD processed successfully",
  "aligned_image": "data:image/jpeg;base64,/9j/4AAQ...",
  "ocr_data": {
    "id_number": { "text": "012345678901", "confidence": 0.95, "bbox": [...] },
    "name": { "text": "NGUYEN VAN A", "confidence": 0.92, "bbox": [...] },
    "dob": { "text": "01/01/1990", "confidence": 0.88, "bbox": [...] },
    ...
  },
  "metadata": { ... },
  "detection": { ... }
}
```

### 4. OCR Only (Legacy)
```http
POST /ocr/id-card
Content-Type: multipart/form-data

file: <image_file>
```

## 🔧 Cách hoạt động

### Pipeline xử lý:

```
Ảnh upload
    ↓
YOLOv8 Detection
    ↓
Bounding Box / Polygon
    ↓
OpenCV Alignment
    ├─ minAreaRect (tìm góc nghiêng)
    ├─ Rotate (xoay về 0°)
    ├─ Perspective Transform (căn 4 góc)
    ↓
Ảnh CCCD đã thẳng
    ↓
OCR (EasyOCR)
    ↓
Kết quả JSON
```

### Thuật toán căn chỉnh:

1. **minAreaRect**: Tìm hình chữ nhật xoay tối ưu bao quanh CCCD
2. **Rotate**: Xoay ảnh về góc 0° (cạnh dài song song trục X)
3. **Perspective Transform** (bonus): Nếu có 4 điểm chính xác, áp dụng transform để "scan" CCCD
4. **Crop & Resize**: Cắt vùng CCCD và resize về tỷ lệ chuẩn (1.585:1)

## 📐 Tỷ lệ CCCD chuẩn

- **Kích thước thực**: 8.56 cm × 5.4 cm
- **Tỷ lệ**: 1.585:1 (width:height)
- **Output**: 1712 × 1080 pixels (@ 200 DPI)

## 🌐 Tích hợp Angular

### Service

```typescript
import { CccdDetectionService } from './core/cccd-detection.service';

// Detect + Align
const result = await this.detectionService.alignCCCD(file, 0.5);

// Convert base64 to File
const alignedFile = this.detectionService.base64ToFile(result.aligned_image);

// Send to Java backend for OCR
const ocrData = await this.api.scanIdCardProfile(alignedFile);
```

### Component

```typescript
// File: profile-page.component.ts
async onPythonFileSelected(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  // Step 1: Detect & Align with Python
  const result = await this.detectionService.alignCCCD(file, 0.5);

  if (result.success) {
    // Show aligned preview
    this.alignedImageBase64 = result.aligned_image;

    // Step 2: OCR with Java backend
    const alignedFile = this.detectionService.base64ToFile(result.aligned_image);
    const ocrData = await this.api.scanIdCardProfile(alignedFile);

    // Update form
    this.form.idNumber = ocrData.idNumber;
    this.form.name = ocrData.name;
    // ...
  }
}
```

## ⚠️ Lưu ý

1. **Model Path**: Cập nhật `DEFAULT_MODEL_PATH` trong `cccd_detector.py` cho đúng với máy của bạn
2. **GPU**: Nếu có GPU, YOLOv8 sẽ tự động sử dụng
3. **CORS**: Frontend Angular chạy ở port khác (thường 4200) đã được CORS cho phép
4. **Ports**:
   - Python API: `8000`
   - Java Backend: `8080`
   - Angular: `4200`

## 🐛 Troubleshooting

### Model not found
```
FileNotFoundError: Model not found at ...
```
→ Kiểm tra đường dẫn model trong `cccd_detector.py`

### No CCCD detected
→ Giảm `conf_threshold` (mặc định 0.5) hoặc kiểm tra ảnh đầu vào

### ImportError: cv2
```bash
pip install opencv-python
```

## 📚 Dependencies

- FastAPI: Web framework
- Ultralytics (YOLOv8): Object detection
- OpenCV: Image processing
- EasyOCR: Text recognition
- NumPy: Array operations
- Pillow: Image I/O
- Torch: Deep learning backend

## 📝 License

Internal use only.

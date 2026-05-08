import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/**
 * Interface for CCCD detection response
 */
export interface CCCDDetectionResult {
  success: boolean;
  message?: string;
  detection: {
    bbox: number[];        // [x1, y1, x2, y2]
    polygon?: number[][];  // [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
    confidence: number;
    class_id?: number;
    class_name?: string;
  } | null;
  preview_image?: string;  // Base64 encoded image with bounding box overlay
}

/**
 * Interface for CCCD alignment response
 */
export interface CCCDAlignmentResult {
  success: boolean;
  message?: string;
  aligned_image: string;   // Base64 encoded aligned image
  metadata: {
    angle: number;         // Rotation angle
    width: number;
    height: number;
    method: 'perspective_transform' | 'bbox_rotate';
  };
  detection: {
    bbox: number[];
    confidence: number;
    polygon?: number[][];
  } | null;
}

/**
 * Interface for OCR field result
 */
export interface OCRField {
  text: string;
  confidence: number;
  bbox: number[];
}

/**
 * Interface for full CCCD processing response (detect + align + OCR)
 */
export interface CCCDFullProcessResult {
  success: boolean;
  message?: string;
  aligned_image: string;    // Base64 encoded aligned image
  ocr_data: {
    id_number: OCRField;
    name: OCRField;
    dob: OCRField;
    gender: OCRField;
    nationality: OCRField;
    place_of_origin: OCRField;
    place_of_residence: OCRField;
    date_of_expiry: OCRField;
  };
  metadata: {
    angle: number;
    width: number;
    height: number;
    method: 'perspective_transform' | 'bbox_rotate';
  };
  detection: {
    bbox: number[];
    confidence: number;
    polygon?: number[][];
  } | null;
}

/**
 * Service for CCCD detection and alignment using Python backend
 * Backend: FastAPI + YOLOv8 + OpenCV
 * Runs on port 8000
 */
@Injectable({ providedIn: 'root' })
export class CccdDetectionService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = 'http://localhost:8000';  // Python FastAPI server

  /**
   * Detect CCCD card in image
   * POST /cccd/detect
   */
  async detectCCCD(file: File, confThreshold: number = 0.5): Promise<CCCDDetectionResult> {
    const formData = new FormData();
    formData.append('file', file);

    const params = { conf_threshold: confThreshold.toString() };

    return firstValueFrom(
      this.http.post<CCCDDetectionResult>(
        `${this.apiBase}/cccd/detect`,
        formData,
        { params }
      )
    );
  }

  /**
   * Detect and align CCCD card
   * POST /cccd/align
   * Returns aligned (straightened) image
   */
  async alignCCCD(file: File, confThreshold: number = 0.5): Promise<CCCDAlignmentResult> {
    const formData = new FormData();
    formData.append('file', file);

    const params = { conf_threshold: confThreshold.toString() };

    return firstValueFrom(
      this.http.post<CCCDAlignmentResult>(
        `${this.apiBase}/cccd/align`,
        formData,
        { params }
      )
    );
  }

  /**
   * Full pipeline: Detect + Align + OCR
   * POST /cccd/process-full
   * Returns aligned image + OCR data
   */
  async processFull(file: File, confThreshold: number = 0.5): Promise<CCCDFullProcessResult> {
    const formData = new FormData();
    formData.append('file', file);

    const params = { conf_threshold: confThreshold.toString() };

    return firstValueFrom(
      this.http.post<CCCDFullProcessResult>(
        `${this.apiBase}/cccd/process-full`,
        formData,
        { params }
      )
    );
  }

  /**
   * Legacy OCR endpoint (only OCR, no alignment)
   * POST /ocr/id-card
   */
  async ocrIdCard(file: File): Promise<{ success: boolean; data: any }> {
    const formData = new FormData();
    formData.append('file', file);

    return firstValueFrom(
      this.http.post<{ success: boolean; data: any }>(
        `${this.apiBase}/ocr/id-card`,
        formData
      )
    );
  }

  /**
   * Convert base64 image to Blob for display/upload
   */
  base64ToBlob(base64Image: string, contentType: string = 'image/jpeg'): Blob {
    // Remove data URI prefix if present
    const base64Data = base64Image.includes(',')
      ? base64Image.split(',')[1]
      : base64Image;

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }

  /**
   * Convert base64 image to File object
   */
  base64ToFile(base64Image: string, filename: string = 'cccd_aligned.jpg'): File {
    const blob = this.base64ToBlob(base64Image);
    return new File([blob], filename, { type: 'image/jpeg' });
  }

  /**
   * Create object URL for base64 image (for preview)
   */
  createImageUrl(base64Image: string): string {
    // If already has data URI prefix, return as-is
    if (base64Image.startsWith('data:')) {
      return base64Image;
    }
    return `data:image/jpeg;base64,${base64Image}`;
  }

  /**
   * Check if Python backend is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ message: string }>(`${this.apiBase}/`, { timeout: 3000 })
      );
      return response?.message?.includes('running') ?? false;
    } catch {
      return false;
    }
  }
}

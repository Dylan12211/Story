import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CccdLoginRequest {
  image: Blob | string;
  cccdNumber?: string;
}

export interface CccdLoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    name: string;
    cccdNumber: string;
  };
  message?: string;
  ocrData?: {
    id: string;
    name: string;
    dob: string;
    nationality: string;
    sex: string;
    address: string;
    issueDate: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class CccdLoginService {
  private apiUrl = '/api/auth/cccd'; // Backend API endpoint

  constructor(private http: HttpClient) {}

  /**
   * Upload CCCD image for OCR and authentication
   * @param imageData - The cropped image as Blob or base64 string
   * @param cccdNumber - Optional CCCD number for verification
   */
  loginWithCccd(imageData: Blob | string, cccdNumber?: string): Observable<CccdLoginResponse> {
    const formData = new FormData();

    if (typeof imageData === 'string') {
      // Convert base64 to blob if needed
      const blob = this.base64ToBlob(imageData);
      formData.append('image', blob, 'cccd.jpg');
    } else {
      formData.append('image', imageData, 'cccd.jpg');
    }

    if (cccdNumber) {
      formData.append('cccdNumber', cccdNumber);
    }

    return this.http.post<CccdLoginResponse>(`${this.apiUrl}/login`, formData);
  }

  /**
   * Verify CCCD data with backend
   * @param ocrData - OCR extracted data
   */
  verifyCccdData(ocrData: any): Observable<CccdLoginResponse> {
    return this.http.post<CccdLoginResponse>(`${this.apiUrl}/verify`, ocrData);
  }

  /**
   * Send image to OCR service for data extraction
   * @param imageData - The cropped image
   */
  extractCccdData(imageData: Blob | string): Observable<any> {
    const formData = new FormData();

    if (typeof imageData === 'string') {
      const blob = this.base64ToBlob(imageData);
      formData.append('image', blob, 'cccd.jpg');
    } else {
      formData.append('image', imageData, 'cccd.jpg');
    }

    return this.http.post(`${this.apiUrl}/ocr`, formData);
  }

  /**
   * Helper method to convert base64 to Blob
   */
  private base64ToBlob(base64: string): Blob {
    // Remove data URL prefix if present
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'image/jpeg' });
  }

  /**
   * Download cropped image as file
   */
  downloadCroppedImage(blob: Blob, filename: string = 'cccd-cropped.jpg'): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

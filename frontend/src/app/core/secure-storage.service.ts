import { Injectable } from '@angular/core';

/**
 * Service bảo mật để lưu trữ session
 * Kết hợp memory storage + sessionStorage + mã hóa đơn giản
 */
@Injectable({
  providedIn: 'root'
})
export class SecureStorageService {
  private memoryStore: Map<string, string> = new Map();
  private readonly STORAGE_KEY = '_s_d';
  private readonly SECRET_KEY = 'story_app_secret_v1'; // Trong thực tế nên lấy từ env

  /**
   * Lưu session - memory + sessionStorage
   */
  setSession(data: string): void {
    // 1. Lưu trong memory (bảo mật nhất)
    this.memoryStore.set(this.STORAGE_KEY, data);
    
    // 2. Backup vào sessionStorage với mã hóa đơn giản
    try {
      const encrypted = this.simpleEncrypt(data);
      sessionStorage.setItem(this.STORAGE_KEY, encrypted);
    } catch {
      // sessionStorage có thể bị disabled
    }
  }

  /**
   * Lấy session - ưu tiên memory store
   */
  getSession(): string | null {
    // 1. Thử lấy từ memory trước
    const memoryData = this.memoryStore.get(this.STORAGE_KEY);
    if (memoryData) {
      return memoryData;
    }

    // 2. Nếu memory mất (reload page), lấy từ sessionStorage
    try {
      const encrypted = sessionStorage.getItem(this.STORAGE_KEY);
      if (encrypted) {
        const decrypted = this.simpleDecrypt(encrypted);
        // Khôi phục vào memory
        this.memoryStore.set(this.STORAGE_KEY, decrypted);
        return decrypted;
      }
    } catch {
      // sessionStorage có thể bị disabled
    }

    return null;
  }

  /**
   * Xóa session
   */
  clearSession(): void {
    this.memoryStore.delete(this.STORAGE_KEY);
    try {
      sessionStorage.removeItem(this.STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  /**
   * Mã hóa đơn giản (XOR cipher) - không phải encryption mạnh 
   * nhưng tốt hơn lưu plain text
   */
  private simpleEncrypt(text: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ this.SECRET_KEY.charCodeAt(i % this.SECRET_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(result);
  }

  private simpleDecrypt(encrypted: string): string {
    try {
      const text = atob(encrypted);
      let result = '';
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ this.SECRET_KEY.charCodeAt(i % this.SECRET_KEY.length);
        result += String.fromCharCode(charCode);
      }
      return result;
    } catch {
      return '';
    }
  }

  /**
   * Kiểm tra có đang ở chế độ private/incognito không
   */
  isPrivateMode(): boolean {
    try {
      const testKey = '__private_test__';
      sessionStorage.setItem(testKey, '1');
      sessionStorage.removeItem(testKey);
      return false;
    } catch {
      return true;
    }
  }
}

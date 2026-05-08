import { Injectable, signal, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type Language = 'vi' | 'en';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly http = inject(HttpClient);
  private readonly translations = signal<Record<string, string>>({});
  private readonly currentLang = signal<Language>('vi');

  readonly language = this.currentLang.asReadonly();

  constructor() {
    effect(() => {
      const lang = this.currentLang();
      this.loadTranslations(lang);
      localStorage.setItem('app_language', lang);
    });

    const savedLang = localStorage.getItem('app_language') as Language;
    if (savedLang && (savedLang === 'vi' || savedLang === 'en')) {
      this.currentLang.set(savedLang);
    }
  }

  private async loadTranslations(lang: Language): Promise<void> {
    try {
      const translations = await firstValueFrom(
        this.http.get<Record<string, string>>(`/i18n/${lang}.json`)
      );
      this.translations.set(translations);
    } catch {
      console.warn(`Failed to load translations for ${lang}`);
    }
  }

  setLanguage(lang: Language): void {
    this.currentLang.set(lang);
  }

  translate(key: string, params?: Record<string, string | number>): string {
    let text = this.translations()[key] ?? key;

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g'), String(value));
      });
    }

    return text;
  }

  instant(key: string, params?: Record<string, string | number>): string {
    return this.translate(key, params);
  }
}

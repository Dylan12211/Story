import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService, Language } from './translation.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="language-switcher">
      <button
        [class.active]="lang() === 'vi'"
        (click)="setLanguage('vi')"
        title="Tiếng Việt"
      >
        🇻🇳 VI
      </button>
      <button
        [class.active]="lang() === 'en'"
        (click)="setLanguage('en')"
        title="English"
      >
        🇬🇧 EN
      </button>
    </div>
  `,
  styles: [`
    .language-switcher {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    button {
      padding: 4px 8px;
      border: 1px solid #ccc;
      background: white;
      cursor: pointer;
      border-radius: 4px;
      font-size: 12px;
      transition: all 0.2s;
    }
    button:hover {
      background: #f0f0f0;
    }
    button.active {
      background: #1976d2;
      color: white;
      border-color: #1976d2;
    }
  `]
})
export class LanguageSwitcherComponent {
  protected readonly translationService = inject(TranslationService);
  protected readonly lang = this.translationService.language;

  setLanguage(lang: Language): void {
    this.translationService.setLanguage(lang);
  }
}

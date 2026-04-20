import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { reportTableOptions } from '../../core/mock-data';
import { PortalApiService } from '../../core/portal-api.service';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="reports-grid">

      <section class="card">
        <p class="eyebrow">Table selector</p>
        <h3>Bảng dữ liệu</h3>
        <div class="table-list">
          <button
            type="button"
            class="table-item"
            *ngFor="let table of tables"
            [class.active]="selectedTableKey() === table.key"
            (click)="toggleTable(table.key)"
          >
            <div>
              <strong>{{ table.label }}</strong>
              <p>{{ table.description }}</p>
            </div>
            <span class="badge" [class.warning]="!table.available">{{ table.available ? 'available' : 'pending' }}</span>
          </button>
        </div>
      </section>

      <section class="card">
        <p class="eyebrow">Column selector</p>
        <h3>Chọn cột</h3>
        <div class="column-list">
          <label class="column-item" *ngFor="let column of selectedTable().columns">
            <input type="checkbox" [checked]="selectedColumns().includes(column.key)" (change)="toggleColumn(column.key)" />
            <div>
              <strong>{{ column.label }}</strong>
              <p>{{ column.description }}</p>
            </div>
          </label>
        </div>
      </section>

      <section class="card">
        <p class="eyebrow">Export actions</p>
        <h3>Xuất báo cáo</h3>
        <div class="message error" *ngIf="error()">{{ error() }}</div>
        <div class="message success" *ngIf="success()">{{ success() }}</div>
        <div class="actions">
          <button type="button" (click)="export('pdf', 'preview')" [disabled]="busy()">
            Xem trước PDF
          </button>
          <button type="button" (click)="export('pdf')" [disabled]="busy()">
            {{ busy() ? 'Đang xuất...' : 'Xuất PDF' }}
          </button>
          <button type="button" class="ghost" (click)="export('xlsx')" [disabled]="busy()">
            {{ busy() ? 'Đang xuất...' : 'Xuất Excel' }}
          </button>
        </div>
        <div class="summary">
          <strong>Đang chọn</strong>
          <p>{{ selectedTable().label }}</p>
          <p>{{ selectedColumns().join(', ') }}</p>
        </div>
      </section>
    </section>
  `,
  styles: [`
    .reports-grid {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 1rem;
    }

    .overview {
      grid-column: span 12;
    }

    .reports-grid > .card:not(.overview) {
      grid-column: span 4;
    }

    .card {
      border-radius: 24px;
      padding: 1.25rem;
      background: rgba(255, 249, 243, 0.9);
      border: 1px solid rgba(140, 121, 104, 0.18);
      box-shadow: 0 24px 50px rgba(48, 31, 19, 0.08);
    }

    .eyebrow {
      margin: 0;
      font-size: 0.72rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #8b6f5a;
    }

    h3 {
      margin: 0.3rem 0 1rem;
    }

    .overview-grid,
    .table-list,
    .column-list {
      display: grid;
      gap: 0.8rem;
    }

    .overview-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .overview-grid article,
    .summary,
    .column-item,
    .table-item {
      border-radius: 20px;
      padding: 1rem;
      background: rgba(255, 253, 249, 0.95);
      border: 1px solid rgba(140, 121, 104, 0.14);
    }

    .table-item {
      width: 100%;
      text-align: left;
      display: flex;
      justify-content: space-between;
      gap: 0.8rem;
      cursor: pointer;
      font: inherit;
    }

    .table-item.active {
      border-color: rgba(208, 113, 67, 0.5);
      box-shadow: inset 0 0 0 1px rgba(208, 113, 67, 0.18);
    }

    .table-item p,
    .column-item p,
    .overview-grid p,
    .summary p {
      margin: 0.45rem 0 0;
      color: #6f625a;
      line-height: 1.6;
    }

    .column-item {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.8rem;
      align-items: start;
    }

    .column-item input {
      margin-top: 0.25rem;
    }

    .actions {
      display: flex;
      gap: 0.8rem;
      margin-bottom: 1rem;
    }

    button {
      border: none;
      border-radius: 999px;
      padding: 0.9rem 1.2rem;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      background: linear-gradient(135deg, #d07143, #8f3b1e);
      color: #fff8f2;
    }

    .ghost {
      background: rgba(36, 27, 22, 0.06);
      color: #241b16;
    }

    .message {
      padding: 0.9rem 1rem;
      border-radius: 18px;
      margin-bottom: 0.8rem;
    }

    .message.error {
      color: #8b2f24;
      background: rgba(178, 56, 40, 0.1);
    }

    .message.success {
      color: #2f6b54;
      background: rgba(63, 135, 102, 0.12);
    }

    .badge {
      border-radius: 999px;
      padding: 0.35rem 0.75rem;
      background: rgba(63, 135, 102, 0.12);
      color: #2e6b52;
      font-size: 0.76rem;
      text-transform: uppercase;
      font-weight: 700;
      height: fit-content;
    }

    .badge.warning {
      background: rgba(199, 127, 34, 0.14);
      color: #9a5b08;
    }

    @media (max-width: 1120px) {
      .reports-grid > .card:not(.overview) {
        grid-column: span 12;
      }

      .overview-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .table-item,
      .actions {
        display: grid;
      }
    }
  `]
})
export class ReportsPageComponent {
  private readonly api = inject(PortalApiService);

  readonly tables = reportTableOptions;
  readonly selectedTableKey = signal(this.tables[0].key);
  readonly selectedColumns = signal<string[]>(this.tables[0].columns.map((column) => column.key));
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly selectedTable = computed(
    () => this.tables.find((table) => table.key === this.selectedTableKey()) ?? this.tables[0]
  );

  toggleTable(tableKey: string): void {
    this.selectedTableKey.set(tableKey);
    const table = this.tables.find((item) => item.key === tableKey);
    this.selectedColumns.set(table?.columns.map((column) => column.key) ?? []);
    this.error.set('');
    this.success.set('');
  }

  toggleColumn(columnKey: string): void {
    const current = this.selectedColumns();
    this.selectedColumns.set(
      current.includes(columnKey) ? current.filter((item) => item !== columnKey) : [...current, columnKey]
    );
  }

  async export(format: 'pdf' | 'xlsx', mode: 'preview' | 'download' = 'download'): Promise<void> {
    this.error.set('');
    this.success.set('');

    if (!this.selectedColumns().length) {
      this.error.set('Bạn cần chọn ít nhất một cột để export.');
      return;
    }

    const table = this.selectedTable();
    if (!table.available) {
      this.error.set('Bảng này mới có UI chọn cột; backend Jasper chưa có endpoint export tương ứng.');
      return;
    }

    this.busy.set(true);
    try {
      let blob: Blob;
      let filename: string;

      if (table.key === 'users') {
        blob = await this.api.exportUsers(format, this.selectedColumns());
        filename = `user-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      } else if (table.key === 'stories') {
        blob = await this.api.exportStories(format, this.selectedColumns());
        filename = `story-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      } else if (table.key === 'workflow') {
        blob = await this.api.exportTasks(format, this.selectedColumns());
        filename = `task-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      } else {
        throw new Error('Unknown table type');
      }

      const url = window.URL.createObjectURL(blob);
      const extension = format === 'pdf' ? 'pdf' : 'xlsx';

      if (format === 'pdf' && mode === 'preview') {
        window.open(url, '_blank');
        this.busy.set(false);
        return;
      }

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
      this.success.set(`Đã export file ${extension.toUpperCase()} cho bảng ${table.label}.`);
    } catch (error) {
      this.error.set(this.api.formatError(error, 'Export Jasper thất bại.'));
    } finally {
      this.busy.set(false);
    }
  }
}

import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { reportTableOptions } from '../../core/mock-data';
import { PortalApiService } from '../../core/portal-api.service';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports-page.component.html',
  styleUrls: ['./reports-page.component.scss']})
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

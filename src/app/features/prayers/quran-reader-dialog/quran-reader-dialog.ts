import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';

import { QuranPagesData, QuranPageSurahBlock } from '../../../core/services/quran-pages-data';
import { Prayer as PrayerService } from '../../../core/services/prayer';
import { PrayerName } from '../../../core/models/prayer.model';
import { InlineMessage } from '../../../shared/components/inline-message/inline-message';

export interface QuranReaderDialogData {
  /** Explicit page numbers (not a numeric range) so a 604 → 1 wrap-around stays correct. */
  pages: number[];
  prayerName: PrayerName;
  alreadyCompleted: boolean;
}

@Component({
  selector: 'app-quran-reader-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe, InlineMessage],
  templateUrl: './quran-reader-dialog.html',
  styleUrl: './quran-reader-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuranReaderDialog {
  private readonly quranPagesData = inject(QuranPagesData);
  private readonly prayerService = inject(PrayerService);
  private readonly dialogRef = inject(MatDialogRef<QuranReaderDialog, boolean>);
  readonly data = inject<QuranReaderDialogData>(MAT_DIALOG_DATA);

  readonly pageIndex = signal(0);
  readonly currentPage = computed(() => this.data.pages[this.pageIndex()]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly blocks = signal<QuranPageSurahBlock[]>([]);
  readonly marking = signal(false);

  constructor() {
    void this.loadPage(this.currentPage());
  }

  canGoPrev(): boolean {
    return this.pageIndex() > 0;
  }

  canGoNext(): boolean {
    return this.pageIndex() < this.data.pages.length - 1;
  }

  prevPage(): void {
    if (!this.canGoPrev()) return;
    this.pageIndex.update((i) => i - 1);
    void this.loadPage(this.currentPage());
  }

  nextPage(): void {
    if (!this.canGoNext()) return;
    this.pageIndex.update((i) => i + 1);
    void this.loadPage(this.currentPage());
  }

  async loadPage(page: number): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      this.blocks.set(await this.quranPagesData.getPage(page));
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async markAsReadAndPrayed(): Promise<void> {
    this.marking.set(true);
    try {
      if (!this.data.alreadyCompleted) {
        await this.prayerService.toggleCompletion(this.data.prayerName);
      }
      this.dialogRef.close(true);
    } finally {
      this.marking.set(false);
    }
  }

  close(): void {
    this.dialogRef.close(false);
  }
}

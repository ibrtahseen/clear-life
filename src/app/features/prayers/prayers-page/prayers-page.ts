import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { InlineMessage } from '../../../shared/components/inline-message/inline-message';

import { Prayer as PrayerService } from '../../../core/services/prayer';
import { Quran as QuranService, PrayerPageRange } from '../../../core/services/quran';
import { PRAYER_NAMES, PrayerName } from '../../../core/models/prayer.model';
import { formatTime, todayIso } from '../../../core/utils/date.util';
import { QuranReaderDialog, QuranReaderDialogData } from '../quran-reader-dialog/quran-reader-dialog';

@Component({
  selector: 'app-prayers-page',
  imports: [RouterLink, TranslatePipe, MatButtonModule, MatIconModule, InlineMessage],
  templateUrl: './prayers-page.html',
  styleUrl: './prayers-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrayersPage implements OnDestroy {
  private readonly prayerService = inject(PrayerService);
  private readonly quranService = inject(QuranService);
  private readonly dialog = inject(MatDialog);
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  readonly prayerNames = PRAYER_NAMES;
  readonly schedule = this.prayerService.schedule;
  readonly loading = this.prayerService.loading;
  readonly error = this.prayerService.error;
  readonly completionMap = this.prayerService.completionMap;
  readonly nextPrayer = this.prayerService.nextPrayer;
  readonly quranProgress = this.quranService.progress;
  readonly pageRanges = signal<Partial<Record<PrayerName, PrayerPageRange>>>({});

  readonly now = signal(Date.now());
  readonly countdownLabel = computed(() => {
    const next = this.nextPrayer();
    if (!next) return '';
    const [h, m] = next.time.split(':').map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target.getTime() < this.now()) {
      target.setDate(target.getDate() + 1);
    }
    const diffMs = target.getTime() - this.now();
    const totalMinutes = Math.max(0, Math.round(diffMs / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  });

  constructor() {
    void this.init();
    this.intervalHandle = setInterval(() => this.now.set(Date.now()), 30_000);
  }

  private async init(): Promise<void> {
    await Promise.all([this.prayerService.loadToday(), this.quranService.init()]);
    await this.refreshPageRanges();
  }

  private async refreshPageRanges(): Promise<void> {
    const completed = new Set(this.prayerNames.filter((name) => this.isCompleted(name)));
    this.pageRanges.set(await this.quranService.pageRangesForDate(todayIso(), completed));
  }

  ngOnDestroy(): void {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
  }

  formattedTime(time: string): string {
    return formatTime(time);
  }

  isCompleted(name: PrayerName): boolean {
    return this.completionMap().get(name) ?? false;
  }

  pageRangeLabel(name: PrayerName): string | null {
    const range = this.pageRanges()[name];
    return range ? `${range.start}-${range.end}` : null;
  }

  /**
   * Tapping an incomplete prayer opens the Quran reader first — completion
   * (and the page award) happens when the user finishes reading and taps
   * "Mark as Read & Prayed" inside the dialog. Tapping an already-completed
   * prayer just un-marks it directly; there's nothing to read when undoing.
   */
  async toggle(name: PrayerName): Promise<void> {
    if (this.isCompleted(name)) {
      await this.prayerService.toggleCompletion(name);
      await this.refreshPageRanges();
    } else {
      this.openReader(name);
    }
  }

  openReader(name: PrayerName): void {
    const range = this.pageRanges()[name];
    if (!range) return;

    const data: QuranReaderDialogData = {
      pages: [range.start, range.end],
      prayerName: name,
      alreadyCompleted: this.isCompleted(name),
    };
    const ref = this.dialog.open(QuranReaderDialog, { data, maxWidth: '95vw' });
    ref.afterClosed().subscribe((markedAsPrayed) => {
      if (markedAsPrayed) {
        void this.refreshPageRanges();
      }
    });
  }

  quranRangeLabel(): string {
    return this.quranService.currentRangeLabel();
  }

  async refreshLocation(): Promise<void> {
    await this.prayerService.refreshLocation();
  }
}

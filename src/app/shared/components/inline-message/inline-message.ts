import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type InlineMessageSeverity = 'info' | 'success' | 'warn' | 'error';

const ICONS: Record<InlineMessageSeverity, string> = {
  info: 'info',
  success: 'check_circle',
  warn: 'warning',
  error: 'error',
};

@Component({
  selector: 'app-inline-message',
  imports: [MatIconModule],
  templateUrl: './inline-message.html',
  styleUrl: './inline-message.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"inline-message inline-message--" + severity()',
  },
})
export class InlineMessage {
  readonly severity = input<InlineMessageSeverity>('info');

  icon(): string {
    return ICONS[this.severity()];
  }
}

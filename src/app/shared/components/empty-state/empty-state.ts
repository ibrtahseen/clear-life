import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type EmptyStateVariant = 'inline' | 'compact' | 'spacious';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly variant = input<EmptyStateVariant>('compact');
}

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { UserStore } from '../../core/services/user-store';
import { I18n } from '../../core/services/i18n';

interface NavItem {
  path: string;
  icon: string;
  labelKey: string;
}

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe, MatIconModule],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly userStore = inject(UserStore);
  private readonly i18n = inject(I18n);

  readonly navItems: NavItem[] = [
    { path: '/dashboard', icon: 'home', labelKey: 'nav.dashboard' },
    { path: '/habits', icon: 'check_box', labelKey: 'nav.habits' },
    { path: '/prayers', icon: 'nights_stay', labelKey: 'nav.prayers' },
    { path: '/stay-focus', icon: 'timer', labelKey: 'nav.stayFocus' },
    { path: '/statistics', icon: 'bar_chart', labelKey: 'nav.statistics' },
    { path: '/calendar', icon: 'calendar_month', labelKey: 'nav.calendar' },
    { path: '/settings', icon: 'settings', labelKey: 'nav.settings' },
  ];

  readonly greetingName = computed(() => this.userStore.profile()?.name ?? '');
  readonly isRtl = computed(() => this.i18n.isRtl());
}

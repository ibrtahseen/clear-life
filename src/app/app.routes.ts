import { Routes } from '@angular/router';
import { onboardingCompletedGuard, onboardingPendingGuard } from './core/guards/onboarding.guard';

export const routes: Routes = [
  {
    path: 'onboarding',
    canActivate: [onboardingPendingGuard],
    loadComponent: () =>
      import('./features/onboarding/onboarding-page/onboarding-page').then((m) => m.OnboardingPage),
  },
  {
    path: '',
    canActivate: [onboardingCompletedGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'habits',
        loadComponent: () => import('./features/habits/habits-page/habits-page').then((m) => m.HabitsPage),
      },
      {
        path: 'prayers',
        loadComponent: () =>
          import('./features/prayers/prayers-page/prayers-page').then((m) => m.PrayersPage),
      },
      {
        path: 'statistics',
        loadComponent: () =>
          import('./features/statistics/statistics-page/statistics-page').then((m) => m.StatisticsPage),
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/calendar/calendar-page/calendar-page').then((m) => m.CalendarPage),
      },
      {
        path: 'stay-focus',
        loadComponent: () =>
          import('./features/stay-focus/stay-focus-page/stay-focus-page').then((m) => m.StayFocusPage),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings-page/settings-page').then((m) => m.SettingsPage),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];

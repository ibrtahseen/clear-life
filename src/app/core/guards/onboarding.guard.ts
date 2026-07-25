import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppStateRepository } from '../data/repositories';

export const onboardingCompletedGuard: CanActivateFn = async () => {
  const appStateRepository = inject(AppStateRepository);
  const router = inject(Router);
  const state = await appStateRepository.get();
  if (state.onboardingCompleted) {
    return true;
  }
  return router.parseUrl('/onboarding');
};

export const onboardingPendingGuard: CanActivateFn = async () => {
  const appStateRepository = inject(AppStateRepository);
  const router = inject(Router);
  const state = await appStateRepository.get();
  if (!state.onboardingCompleted) {
    return true;
  }
  return router.parseUrl('/dashboard');
};

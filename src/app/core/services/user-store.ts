import { Service, inject, signal } from '@angular/core';
import { UserRepository } from '../data/repositories/user-repository';
import { UserProfile } from '../models/user.model';

@Service()
export class UserStore {
  private readonly userRepository = inject(UserRepository);

  readonly profile = signal<UserProfile | null>(null);

  async init(): Promise<void> {
    const profile = await this.userRepository.get();
    this.profile.set(profile ?? null);
  }

  async setName(name: string): Promise<void> {
    const saved = await this.userRepository.save(name);
    this.profile.set(saved);
  }
}

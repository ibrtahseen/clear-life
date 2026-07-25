import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database.service';
import { UserProfile } from '../../models/user.model';

const SINGLETON_ID = 1;

@Service()
export class UserRepository {
  private readonly databaseService = inject(DatabaseService);
  private get table() {
    return this.databaseService.db.user;
  }

  get(): Promise<UserProfile | undefined> {
    return this.table.get(SINGLETON_ID);
  }

  async save(name: string): Promise<UserProfile> {
    const now = new Date().toISOString();
    const existing = await this.get();
    const profile: UserProfile = {
      id: SINGLETON_ID,
      name,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.table.put(profile);
    return profile;
  }

  async replace(profile: UserProfile): Promise<void> {
    await this.table.put({ ...profile, id: SINGLETON_ID });
  }

  async clear(): Promise<void> {
    await this.table.clear();
  }
}

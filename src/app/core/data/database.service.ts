import { Injectable } from '@angular/core';
import { ClearLifeDatabase } from './clear-life.db';

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  readonly db = new ClearLifeDatabase();
}

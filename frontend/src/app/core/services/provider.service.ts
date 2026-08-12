import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ProviderType } from '../models/saic.models';

const STORAGE_KEY = 'smartcar_provider';

@Injectable({ providedIn: 'root' })
export class ProviderService {
  private provider$ = new BehaviorSubject<ProviderType>(this.loadProvider());

  readonly activeProvider$ = this.provider$.asObservable();

  get currentProvider(): ProviderType {
    return this.provider$.getValue();
  }

  setProvider(provider: ProviderType): void {
    this.provider$.next(provider);
    localStorage.setItem(STORAGE_KEY, provider);
  }

  private loadProvider(): ProviderType {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'smartcar' || saved === 'saic') return saved;
    return 'smartcar';
  }
}

import { Injectable, signal } from '@angular/core';

export type ToastKind = 'info' | 'success' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  kind: ToastKind;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);

  push(message: string, kind: ToastKind = 'info', durationMs = 4_000): void {
    const id = crypto.randomUUID();
    this.toasts.update((current) => [...current, { id, message, kind }]);

    window.setTimeout(() => this.dismiss(id), durationMs);
  }

  dismiss(id: string): void {
    this.toasts.update((current) => current.filter((item) => item.id !== id));
  }
}

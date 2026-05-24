import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal
} from '@angular/core';

import { ZardIconComponent } from '@/shared/components/icon';
import type { ZardIcon } from '@/shared/components/icon/icons';

export interface SettingsSection {
  id: string;
  label: string;
  icon: ZardIcon;
}

@Component({
  selector: 'app-settings-section-nav',
  imports: [ZardIconComponent],
  templateUrl: './settings-section-nav.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './settings-section-nav.component.css'
})
export class SettingsSectionNavComponent implements AfterViewInit {
  readonly sections = input.required<SettingsSection[]>();
  readonly pageRoot = input.required<HTMLElement>();

  readonly activeSectionChange = output<string>();

  protected readonly activeSectionId = signal('general');

  private readonly destroyRef = inject(DestroyRef);
  private observer: IntersectionObserver | null = null;

  ngAfterViewInit(): void {
    this.setupScrollSpy();
  }

  protected scrollToSection(sectionId: string): void {
    const target = document.getElementById(`settings-${sectionId}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.activeSectionId.set(sectionId);
    this.activeSectionChange.emit(sectionId);
  }

  private setupScrollSpy(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const root = this.pageRoot();
    const scrollRoot = findScrollParent(root) ?? null;
    const observedSections = this.sections()
      .map((section) => document.getElementById(`settings-${section.id}`))
      .filter((element): element is HTMLElement => element !== null);

    this.observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);

        const top = visible[0]?.target;
        if (top?.id?.startsWith('settings-')) {
          const sectionId = top.id.replace('settings-', '');
          this.activeSectionId.set(sectionId);
          this.activeSectionChange.emit(sectionId);
        }
      },
      {
        root: scrollRoot,
        rootMargin: '-15% 0px -70% 0px',
        threshold: [0, 0.25, 0.5]
      }
    );

    for (const section of observedSections) {
      this.observer.observe(section);
    }

    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
      this.observer = null;
    });
  }
}

function findScrollParent(element: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element.parentElement;

  while (current) {
    const style = getComputedStyle(current);
    const scrollable =
      /auto|scroll/i.test(style.overflowY) && current.scrollHeight > current.clientHeight;
    if (scrollable) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

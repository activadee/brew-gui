import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  model,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import type { ClassValue } from 'clsx';

import { ZardIdDirective } from '@/shared/core';
import { mergeClasses, noopFn } from '@/shared/utils/merge-classes';

import { switchVariants, type ZardSwitchSizeVariants, type ZardSwitchTypeVariants } from '../switch.variants';

type OnTouchedType = () => void;
type OnChangeType = (value: boolean) => void;

@Component({
  selector: 'z-switch',
  imports: [ZardIdDirective],
  templateUrl: './switch.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZardSwitchComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  exportAs: 'zSwitch',
  styleUrl: './switch.component.css',
})
export class ZardSwitchComponent implements ControlValueAccessor {
  readonly class = input<ClassValue>('');
  readonly zChecked = model<boolean>(true);
  readonly zId = input<string>('');
  readonly zSize = input<ZardSwitchSizeVariants>('default');
  readonly zType = input<ZardSwitchTypeVariants>('default');
  readonly zDisabled = input(false, { transform: booleanAttribute });
  /** Accessible name when the visible label is omitted (e.g. settings row with external label). */
  readonly zAriaLabel = input<string | undefined>(undefined);

  private onChange: OnChangeType = noopFn;
  private onTouched: OnTouchedType = noopFn;

  protected readonly status = computed(() => (this.zChecked() ? 'checked' : 'unchecked'));
  protected readonly classes = computed(() =>
    mergeClasses(switchVariants({ zType: this.zType(), zSize: this.zSize() }), this.class()),
  );

  protected readonly formDisabled = signal(false);

  writeValue(val: boolean): void {
    this.zChecked.set(val);
  }

  registerOnChange(fn: OnChangeType): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: OnTouchedType): void {
    this.onTouched = fn;
  }

  onSwitchChange(): void {
    if (this.zDisabled() || this.formDisabled()) {
      return;
    }

    this.zChecked.update(checked => !checked);
    this.onTouched();
    this.onChange(this.zChecked());
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}

import * as React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, ClockIcon } from 'lucide-react';
import type { DayPicker } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface DateTimePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  /** Minute step. Default 5. Allowed: 1, 5, 10, 15, 30, 60. */
  minuteStep?: 1 | 5 | 10 | 15 | 30 | 60;
  /** Locale-aware label for the empty trigger button. Default: "Selecciona fecha y hora". */
  placeholder?: string;
  /** Optional id for the trigger button (for label[htmlFor]). */
  id?: string;
  /** Same shape as react-day-picker's `disabled`. */
  disabled?: React.ComponentProps<typeof DayPicker>['disabled'];
  /** Optional className for the trigger button. */
  className?: string;
}

const HOURS: ReadonlyArray<{ value: string; label: string }> = Array.from(
  { length: 24 },
  (_, h) => ({
    value: String(h).padStart(2, '0'),
    label: String(h).padStart(2, '0'),
  }),
);

function minuteOptions(step: DateTimePickerProps['minuteStep']): Array<{ value: string; label: string }> {
  const s = step ?? 5;
  const out: Array<{ value: string; label: string }> = [];
  for (let m = 0; m < 60; m += s) {
    out.push({ value: String(m).padStart(2, '0'), label: String(m).padStart(2, '0') });
  }
  return out;
}

/**
 * Date + time picker. Same trigger UX as the date-only picker, but the popover
 * carries a Calendar at the top and two Selects (hour, minute) at the bottom.
 *
 * - Picking a day on the calendar updates the date part of `value` (keeping the
 *   time) and closes the popover.
 * - Changing the Selects updates the time part (keeping the date) and keeps
 *   the popover open so the user can tweak both.
 * - When `value` is undefined and the user picks a day, the time defaults to
 *   the current local time (rounded down to the minuteStep) so the resulting
 *   Date is never half-built.
 */
export function DateTimePicker({
  value,
  onChange,
  minuteStep,
  placeholder = 'Selecciona fecha y hora',
  id,
  disabled,
  className,
}: DateTimePickerProps) {
  const minutes = React.useMemo(() => minuteOptions(minuteStep), [minuteStep]);

  const handleDaySelect = (day: Date | undefined) => {
    if (!day) {
      onChange(undefined);
      return;
    }
    const next = new Date(day);
    if (value) {
      next.setHours(value.getHours(), value.getMinutes(), 0, 0);
    } else {
      const now = new Date();
      const step = minuteStep ?? 5;
      const roundedMinutes = Math.floor(now.getMinutes() / step) * step;
      next.setHours(now.getHours(), roundedMinutes, 0, 0);
    }
    onChange(next);
  };

  const handleHourChange = (hour: string) => {
    const base = value ?? new Date();
    const next = new Date(base);
    next.setHours(Number(hour), next.getMinutes(), 0, 0);
    onChange(next);
  };

  const handleMinuteChange = (minute: string) => {
    const base = value ?? new Date();
    const next = new Date(base);
    next.setHours(next.getHours(), Number(minute), 0, 0);
    onChange(next);
  };

  const hourValue = value ? String(value.getHours()).padStart(2, '0') : undefined;
  const minuteValue = value
    ? String(value.getMinutes()).padStart(2, '0')
    : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            'w-full justify-start px-2.5 font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="size-4" aria-hidden="true" />
          {value ? (
            <span>{format(value, "PPP p", { locale: es })}</span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          timeZone="America/Lima"
          selected={value}
          onSelect={handleDaySelect}
          disabled={disabled}
        />
        <div className="flex items-center gap-2 border-t p-3">
          <ClockIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          <Select value={hourValue} onValueChange={handleHourChange}>
            <SelectTrigger
              size="sm"
              aria-label="Hora"
              className="w-[5.5rem]"
              disabled={!value}
            >
              <SelectValue placeholder="HH" />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((h) => (
                <SelectItem key={h.value} value={h.value}>
                  {h.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">:</span>
          <Select value={minuteValue} onValueChange={handleMinuteChange}>
            <SelectTrigger
              size="sm"
              aria-label="Minutos"
              className="w-[5.5rem]"
              disabled={!value}
            >
              <SelectValue placeholder="MM" />
            </SelectTrigger>
            <SelectContent>
              {minutes.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}

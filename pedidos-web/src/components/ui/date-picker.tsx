import * as React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import type { DayPicker } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface DatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  /** Locale-aware label for the empty trigger button. Default: "Selecciona una fecha". */
  placeholder?: string;
  /** Optional id for the trigger button (for label[htmlFor]). */
  id?: string;
  /** Same shape as react-day-picker's `disabled`. */
  disabled?: React.ComponentProps<typeof DayPicker>['disabled'];
  /** Optional className for the trigger button. */
  className?: string;
}

/**
 * Single-day date picker. Renders a button that looks like an input and opens
 * a Popover with a Calendar. The trigger shows the formatted value (es, "15 de
 * octubre de 2026") when set, or a muted placeholder when empty.
 *
 * The component is a controlled wrapper over react-day-picker's single mode;
 * it does not own any internal state, so the caller decides how the value
 * round-trips (string, ISO, Date). The product form converts yyyy-MM-dd
 * strings to/from Date at the boundary to keep its existing validation.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecciona una fecha',
  id,
  disabled,
  className,
}: DatePickerProps) {
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
            <span>{format(value, 'PPP', { locale: es })}</span>
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
          onSelect={onChange}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
}

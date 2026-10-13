import * as React from 'react';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { DayPicker, getDefaultClassNames, type DayButton } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  locale = es,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant'];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        'group/calendar bg-background p-2 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(8)]',
        className,
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale.code, { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn('relative flex flex-col gap-4 md:flex-row', defaultClassNames.months),
        month: cn('flex w-full flex-col gap-4', defaultClassNames.month),
        nav: cn(
          'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          'flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)',
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          'flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium',
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          'relative rounded-(--cell-radius) [&>button]:bg-popover [&>button]:opacity-100',
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn('absolute inset-0 opacity-0', defaultClassNames.dropdown),
        caption_label: cn(
          'font-medium select-none text-sm',
          captionLayout === 'label'
            ? ''
            : 'flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground',
          defaultClassNames.caption_label,
        ),
        month_grid: cn('w-full border-collapse', defaultClassNames.month_grid),
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none',
          defaultClassNames.weekday,
        ),
        week: cn('mt-2 flex w-full', defaultClassNames.week),
        week_number_header: cn('w-(--cell-size) select-none', defaultClassNames.week_number_header),
        week_number: cn('text-[0.8rem] text-muted-foreground select-none', defaultClassNames.week_number),
        day: cn(
          'group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none',
          '[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)',
          '[&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)',
          defaultClassNames.day,
        ),
        today: cn(
          'rounded-(--cell-radius) bg-muted text-foreground data-[selected=true]:rounded-none',
          defaultClassNames.today,
        ),
        outside: cn(
          'text-muted-foreground aria-selected:text-muted-foreground',
          defaultClassNames.outside,
        ),
        disabled: cn('text-muted-foreground opacity-50', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className: chevronClassName, orientation, ...props }) => {
          if (orientation === 'left') {
            return <ChevronLeftIcon className={cn('size-4', chevronClassName)} {...props} />;
          }
          if (orientation === 'right') {
            return <ChevronRightIcon className={cn('size-4', chevronClassName)} {...props} />;
          }
          return <ChevronDownIcon className={cn('size-4', chevronClassName)} {...props} />;
        },
        DayButton: ({ ...props }) => <CalendarDayButton {...props} />,
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 border-0 leading-none font-normal',
        'data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-r-(--cell-radius) data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground',
        'data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground',
        'data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-l-(--cell-radius) data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground',
        'data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground',
        'dark:hover:text-foreground',
        '[&>span]:text-xs [&>span]:opacity-70',
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };

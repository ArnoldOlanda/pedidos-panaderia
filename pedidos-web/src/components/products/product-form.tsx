import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRecipes } from '../../hooks/use-recipes';
import type { PublishProductInput } from '../../hooks/use-publish-product';
import { formatPrice } from '@/lib/format';
import type { Recipe } from '../../lib/recipes';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function limaParts(date: Date): { ymd: string; hm: string; ymdhm: string } {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = f.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  const year = parts.year ?? '0000';
  const month = parts.month ?? '01';
  const day = parts.day ?? '01';
  const hour = parts.hour ?? '00';
  const minute = parts.minute ?? '00';
  const ymd = `${year}-${month}-${day}`;
  const hm = `${hour}:${minute}`;
  return { ymd, hm, ymdhm: `${ymd}T${hm}` };
}

function defaultAvailableDate(): string {
  return limaParts(new Date()).ymd;
}

function defaultClosesAt(): string {
  return limaParts(new Date(Date.now() + 6 * 60 * 60 * 1000)).ymdhm;
}

function parseYmd(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  const [, y, m, d] = match;
  const parsed = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/**
 * The form's date fields are yyyy-MM-dd and yyyy-MM-ddThh:mm strings in Lima
 * time, but the shadcn date pickers speak Date. The two converters below turn
 * each Lima wall-clock string into a Date whose limaParts() round-trips back
 * to the same string, regardless of the browser's local timezone. Lima has no
 * DST, so a fixed UTC-5 offset is correct year-round.
 */
const LIMA_OFFSET_HOURS = 5;

function ymdToDate(ymd: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return undefined;
  const [, y, mo, d] = m;
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), LIMA_OFFSET_HOURS));
}

function ymdhmToDate(ymdhm: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(ymdhm);
  if (!m) return undefined;
  const [, y, mo, d, h, mi] = m;
  return new Date(
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h) + LIMA_OFFSET_HOURS, Number(mi)),
  );
}

const todayYmd = (): string => limaParts(new Date()).ymd;

interface ProductFormProps {
  formId: string;
  idPrefix: string;
  serverError: string | null;
  publishErrorStatus: number | null;
  isSubmitting: boolean;
  onSubmit: (input: PublishProductInput) => void;
}

/**
 * Product fields for the create flow. The form owns its state and its
 * `<form onSubmit>`, and renders fields only: the submit and cancel buttons
 * live in the surrounding dialog footer and reach the form through the native
 * `form={formId}` attribute, which is why the form carries an `id`.
 *
 * It also owns the 404 recovery the page used to own: once the selection is
 * local state, only this component can clear it when the server reports the
 * recipe no longer exists.
 */
export function ProductForm({
  formId,
  idPrefix,
  serverError,
  publishErrorStatus,
  isSubmitting,
  onSubmit,
}: ProductFormProps) {
  const recipesQuery = useRecipes();

  const [recipeId, setRecipeId] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [availableDate, setAvailableDate] = useState(defaultAvailableDate);
  const [closesAtLocal, setClosesAtLocal] = useState(defaultClosesAt);
  const availableDateObj = ymdToDate(availableDate);
  const closesAtObj = ymdhmToDate(closesAtLocal);
  const [validationError, setValidationError] = useState<string | null>(null);

  // A 404 means the selected recipe disappeared between load and submit. The
  // selection is internal state now, so the reset lives here rather than on the
  // page that used to own `recipeId`.
  useEffect(() => {
    if (publishErrorStatus === 404) {
      setRecipeId('');
    }
  }, [publishErrorStatus]);

  const selectedRecipe: Recipe | undefined = recipesQuery.data?.find(
    (r) => r.id === recipeId,
  );

  // Picking a recipe prefills the price with its suggested price, so the common
  // case (sell at the suggested price) is one click; the field stays editable.
  // This runs only on an explicit selection: doing it in an effect keyed on the
  // selected recipe would overwrite whatever the vendor typed every time the
  // recipes query refetches. Clearing the selection clears the price with it.
  const handleRecipeChange = (nextRecipeId: string) => {
    setRecipeId(nextRecipeId);
    const recipe = recipesQuery.data?.find((r) => r.id === nextRecipeId);
    setPrice(recipe ? recipe.suggestedPrice.toFixed(2) : '');
  };

  const validate = (): string | null => {
    if (!recipeId.trim()) return 'Selecciona una receta';
    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 200) {
      return 'El nombre debe tener entre 1 y 200 caracteres';
    }
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return 'El precio debe ser mayor a 0';
    }
    const dateParsed = parseYmd(availableDate);
    if (!dateParsed) return 'La fecha disponible no es válida';
    const todayYmd = defaultAvailableDate();
    if (availableDate < todayYmd) {
      return 'La fecha disponible debe ser hoy o posterior';
    }
    if (!closesAtLocal) return 'Define la hora de cierre';
    const closesAtDate = new Date(closesAtLocal);
    if (Number.isNaN(closesAtDate.getTime())) {
      return 'La hora de cierre no es válida';
    }
    if (closesAtDate.getTime() <= Date.now()) {
      return 'La hora de cierre debe estar en el futuro';
    }
    return null;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);

    const v = validate();
    if (v) {
      setValidationError(v);
      return;
    }

    const input: PublishProductInput = {
      recipeId,
      name: name.trim(),
      price: Number(price),
      availableDate,
      closesAt: new Date(closesAtLocal).toISOString(),
    };

    onSubmit(input);
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-recipe`}>Receta</Label>
        <Select required value={recipeId} onValueChange={handleRecipeChange}>
          <SelectTrigger id={`${idPrefix}-recipe`} className="w-full">
            <SelectValue placeholder="Selecciona una receta" />
          </SelectTrigger>
          <SelectContent>
            {recipesQuery.data?.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name} · sugerido {formatPrice(r.suggestedPrice)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Link
          to="/vendor/recipes"
          className="inline-block text-xs font-medium text-primary hover:underline"
        >
          Gestionar recetas →
        </Link>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-name`}>Nombre del producto</Label>
        <Input
          id={`${idPrefix}-name`}
          type="text"
          maxLength={200}
          minLength={1}
          placeholder="Pan de yema (docena)"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-price`}>
          Precio{' '}
          {selectedRecipe && (
            <span className="text-xs font-normal text-muted-foreground">
              Sugerido: {formatPrice(selectedRecipe.suggestedPrice)}
            </span>
          )}
        </Label>
        {/* step must be one centavo. With step="0.10" and min="0.01" the
            browser only accepts min + n*0.10 (0.01, 0.11, ... 9.21, 9.31),
            so a round price and most suggested prices were rejected by
            native constraint validation before validate() ever ran. */}
        <Input
          id={`${idPrefix}-price`}
          type="number"
          step="0.01"
          min="0.01"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-32"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-available-date`}>Fecha disponible</Label>
        <DatePicker
          id={`${idPrefix}-available-date`}
          value={availableDateObj}
          onChange={(d) => {
            if (d) {
              setAvailableDate(limaParts(d).ymd);
            }
          }}
          placeholder="Selecciona la fecha"
          disabled={(d) => {
            const ymd = limaParts(d).ymd;
            return ymd < todayYmd();
          }}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-closes-at`}>Hora de cierre</Label>
        <DateTimePicker
          id={`${idPrefix}-closes-at`}
          value={closesAtObj}
          onChange={(d) => {
            if (d) {
              setClosesAtLocal(limaParts(d).ymdhm);
            }
          }}
          placeholder="Selecciona fecha y hora"
        />
      </div>

      {validationError && (
        <p className="text-sm text-destructive" role="alert">
          {validationError}
        </p>
      )}

      {serverError && (() => {
        if (publishErrorStatus === 403) {
          return (
            <Alert>
              <AlertTitle>Solo los vendedores pueden publicar productos.</AlertTitle>
              <AlertDescription>
                <Link
                  to="/catalog"
                  className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                >
                  Volver al catálogo →
                </Link>
              </AlertDescription>
            </Alert>
          );
        }
        if (publishErrorStatus === 404) {
          return (
            <Alert variant="destructive">
              <AlertTitle>La receta seleccionada ya no existe.</AlertTitle>
            </Alert>
          );
        }
        if (publishErrorStatus === 409) {
          return (
            <Alert variant="destructive">
              <AlertTitle>{serverError}</AlertTitle>
              <AlertDescription>
                <Button type="submit" variant="outline" disabled={isSubmitting}>
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          );
        }
        return (
          <Alert variant="destructive">
            <AlertTitle>{serverError}</AlertTitle>
          </Alert>
        );
      })()}
    </form>
  );
}

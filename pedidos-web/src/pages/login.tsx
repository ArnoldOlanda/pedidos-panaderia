import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLogin } from '../hooks/use-login';
import { toApiError } from '../lib/auth';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginPage() {
  const [dni, setDni] = useState('');
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const login = useLogin();

  const pending = login.isPending;
  const submitLabel = pending ? 'Ingresando…' : 'Ingresar';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerMessage(null);
    setHint(null);
    login.mutate(
      { dni },
      {
        onError: (err) => {
          const apiErr = toApiError(err);
          setServerMessage(apiErr.message || 'No pudimos iniciar sesión');
          if (apiErr.status === 401) {
            setHint('DNI no registrado');
          } else if (apiErr.status === 403) {
            setHint('Este DNI no corresponde a un vendedor');
          } else if (apiErr.status === 500) {
            setHint('Error del servidor');
          }
        },
      },
    );
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <Card>
          <CardHeader>
            {/* A real h1, not CardTitle: CardTitle renders a div, which would leave the page without a heading element. */}
            <h1 className="font-heading text-xl font-semibold tracking-tight">Ingreso de vendedores</h1>
            <CardDescription>Este ingreso es exclusivo para vendedores.</CardDescription>
            <CardDescription>Ingresá tu DNI para continuar.</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="dni">DNI</Label>
                <Input
                  id="dni"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{8}"
                  maxLength={8}
                  autoComplete="username"
                  placeholder="12345678"
                  required
                  autoFocus
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            {serverMessage && (
              <Alert variant="destructive" className="mt-4">
                {serverMessage}
                {hint ? <span className="text-muted-foreground"> — {hint}</span> : null}
              </Alert>
            )}

            <Button type="submit" disabled={pending} className="mt-5 w-full">
              {submitLabel}
            </Button>
            {/* role=status rather than aria-live on the button: a live region has to
                pre-exist and announce its own content change, not the name of the
                control the user just activated. */}
            <span role="status" className="sr-only">
              {pending ? submitLabel : ''}
            </span>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              ¿Sos nuevo?{' '}
              <Link to="/register" className="font-medium text-foreground underline-offset-2 hover:underline">
                Registrate como vendedor
              </Link>
            </p>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

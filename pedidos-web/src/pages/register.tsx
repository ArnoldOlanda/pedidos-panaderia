import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRegister } from '../hooks/use-register';
import { toApiError } from '../lib/auth';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RegisterPage() {
  const [dni, setDni] = useState('');
  const [name, setName] = useState('');
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const register = useRegister();

  const pending = register.isPending;
  const submitLabel = pending ? 'Creando cuenta…' : 'Registrarme';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerMessage(null);
    setHint(null);
    register.mutate(
      { dni, name },
      {
        onError: (err) => {
          const apiErr = toApiError(err);
          setServerMessage(apiErr.message || 'No pudimos crear la cuenta');
          if (apiErr.status === 409) {
            setHint('Ese DNI ya está registrado');
          } else if (apiErr.status === 400) {
            setHint('Verifica el DNI (8 dígitos) y el nombre (al menos 2 caracteres)');
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
            {/* A real h1, not CardTitle: CardTitle renders a div, which would
                leave the page without a heading element. */}
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              Registro de vendedores
            </h1>
            <CardDescription>
              Esta página es exclusiva para nuevos vendedores.
            </CardDescription>
            <CardDescription>
              Ingresá tu DNI y tu nombre para crear tu cuenta.
            </CardDescription>
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

              <div className="space-y-1">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  type="text"
                  minLength={2}
                  autoComplete="name"
                  placeholder="Tu nombre"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
            {/* role=status rather than aria-live on the button: a live region
                has to pre-exist and announce its own content change, not the
                name of the control the user just activated. */}
            <span role="status" className="sr-only">
              {pending ? submitLabel : ''}
            </span>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="font-medium text-foreground underline-offset-2 hover:underline">
                Iniciar sesión
              </Link>
            </p>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

import { FormEvent, useState } from 'react';
import { useLogin } from '../hooks/use-login';
import { toApiError } from '../lib/auth';

export function LoginPage() {
  const [dni, setDni] = useState('');
  const [name, setName] = useState('');
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const login = useLogin();

  const pending = login.isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerMessage(null);
    setHint(null);
    login.mutate(
      { dni, name },
      {
        onError: (err) => {
          const apiErr = toApiError(err);
          setServerMessage(apiErr.message || 'No pudimos iniciar sesión');
          if (apiErr.status === 400) {
            setHint('DNI o nombre inválido');
          } else if (apiErr.status === 500) {
            setHint('Error del servidor');
          }
        },
      },
    );
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-xs"
      >
        <h1 className="text-xl font-semibold text-slate-900">Ingreso de vendedores</h1>
        <p className="mt-1 text-sm text-slate-600">
          Este ingreso es exclusivo para vendedores.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Ingresa tu DNI y tu nombre para continuar.
        </p>

        <div className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className="text-slate-700">DNI</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{8}"
              maxLength={8}
              autoComplete="username"
              placeholder="12345678"
              required
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
              className="mt-1 w-full rounded-sm border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-700">Nombre</span>
            <input
              type="text"
              minLength={2}
              autoComplete="name"
              placeholder="Tu nombre"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-sm border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </label>
        </div>

        {serverMessage && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {serverMessage}
            {hint ? <span className="text-slate-500"> — {hint}</span> : null}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-5 w-full rounded-sm bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}

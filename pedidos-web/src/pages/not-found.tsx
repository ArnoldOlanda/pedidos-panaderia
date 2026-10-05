import { Link } from 'react-router-dom';
import { Card, CardDescription, CardHeader } from '@/components/ui/card';

export function NotFoundPage() {
  return (
    <Card className="text-center">
      <CardHeader>
        {/* A real h1, not CardTitle: CardTitle renders a div, which would leave the page without a heading element. */}
        <h1 className="font-heading text-2xl font-semibold tracking-tight">404 — no encontramos esa página</h1>
        <CardDescription>
          Volver al{' '}
          <Link to="/" className="text-primary hover:underline">
            inicio
          </Link>
          .
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

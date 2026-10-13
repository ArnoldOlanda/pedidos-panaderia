import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { loginRequest } from '../lib/auth';
import { toast } from '../lib/toast';

export function useLogin() {
  const setUser = useAuth((s) => s.setUser);
  const setStatus = useAuth((s) => s.setStatus);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: ({ dni, name }: { dni: string; name: string }) => loginRequest(dni, name),
    onMutate: () => setStatus('loading'),
    onSuccess: (user) => {
      setUser(user);
      navigate(user.role === 'VENDEDOR' ? '/vendor/products' : '/catalog', { replace: true });
      toast.success('Sesión iniciada');
    },
    onError: () => {
      setStatus('unauthenticated');
    },
  });
}
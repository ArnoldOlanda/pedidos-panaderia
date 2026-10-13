import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { registerRequest } from '../lib/auth';
import { toast } from '../lib/toast';

export function useRegister() {
  const setUser = useAuth((s) => s.setUser);
  const setStatus = useAuth((s) => s.setStatus);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: ({ dni, name }: { dni: string; name: string }) => registerRequest(dni, name),
    onMutate: () => setStatus('loading'),
    onSuccess: (user) => {
      setUser(user);
      navigate('/vendor/products', { replace: true });
      toast.success('Cuenta creada');
    },
    onError: () => {
      setStatus('unauthenticated');
    },
  });
}

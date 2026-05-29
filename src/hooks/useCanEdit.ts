import { useAuth } from './useAuth';
import { useRole } from './useRole';
import { canEditWithRole } from '../utils/permissions';

export function useCanEdit(): boolean {
  const { user } = useAuth();
  const roleState = useRole(user);
  return canEditWithRole(user, roleState);
}

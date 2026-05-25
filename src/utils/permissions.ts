
import type { User } from 'firebase/auth';

export const READ_ONLY_USERS = [
    'fhsvp2208@gmail.com'
];

export const canEdit = (user: User | null): boolean => {
    if (!user) return false;
    if (user.isAnonymous || !user.email) return false;
    return !READ_ONLY_USERS.includes(user.email);
};

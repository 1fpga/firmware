import { fail } from '@/utils/assert/error';

export async function isAdmin(message?: string | (() => string)) {
  if (!(await import('@/services/user')).User.loggedInUser(true).admin) {
    fail(message ?? 'User needs to be admin to perform this action.');
  }
}

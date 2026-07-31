export const ROLE_DASHBOARDS = {
  admin: '/admin',
  user: '/dashboard',
};

export function getRoleFromEmail(email) {
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((adminEmail) => adminEmail.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(email?.toLowerCase()) ? 'admin' : 'user';
}

export function getUserRole(user) {
  if (!user) return null;

  const appRole = user.app_metadata?.role;
  if (appRole === 'admin' || appRole === 'user') return appRole;

  const emailRole = getRoleFromEmail(user.email);
  if (emailRole === 'admin') return emailRole;

  const userRole = user.user_metadata?.role;
  if (userRole === 'admin' || userRole === 'user') return userRole;

  return 'user';
}

export function getRoleDashboard(user) {
  const role = getUserRole(user);
  return role ? ROLE_DASHBOARDS[role] : '/';
}

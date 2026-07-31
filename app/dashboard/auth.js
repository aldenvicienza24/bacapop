'use client';

import { supabase } from '../lib/supabase';
import { getUserRole } from '../lib/roles';

export async function getDashboardUser(router) {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;

  if (!user) {
    router.replace('/login');
    return null;
  }

  if (getUserRole(user) === 'admin') {
    router.replace('/admin');
    return null;
  }

  return user;
}

export async function logoutFromDashboard(router) {
  await supabase.auth.signOut();
  router.replace('/login');
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { getUserRole } from '../../lib/roles';

export default function AdminGuard({ children }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const { data, error } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (error || !user) {
        router.replace('/login');
        return;
      }

      if (getUserRole(user) !== 'admin') {
        router.replace('/dashboard');
        return;
      }

      if (active) setAuthorized(true);
    }

    checkAccess();
    return () => { active = false; };
  }, [router]);

  if (!authorized) {
    return (
      <main style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', fontWeight: 900 }}>
        Memeriksa akses admin...
      </main>
    );
  }

  return children;
}

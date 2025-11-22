'use client';

import { useEffect } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';

export default function UniversityPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  useEffect(() => {
    // Redirect to main page with the university ID
    // This will trigger the seamless navigation system
    router.replace(`/?university=${resolvedParams.id}`);
  }, [resolvedParams.id, router]);

  return null; // This component doesn't render anything, it just redirects
}
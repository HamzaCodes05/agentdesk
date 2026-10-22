'use client';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/LoginForm';

export default function Signup() {
  const router = useRouter();
  return <LoginForm signup onDone={() => router.push('/')} />;
}

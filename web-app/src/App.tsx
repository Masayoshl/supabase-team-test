import { useAuthSession } from '@/shared/hooks/useAuthSession';
import { AuthPage } from '@/features/auth/page/AuthPage';
import { OnboardingPage } from '@/features/onboarding/page/OnboardingPage';
import { DashboardPage } from '@/features/dashboard/page/DashboardPage';

export default function App() {
  const { session, profile, isLoading, refreshProfile } = useAuthSession();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400 text-sm">
        <div className="animate-pulse">Loading profile configuration...</div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  if (profile && !profile.team_id) {
    return (
      <OnboardingPage 
        onSuccess={refreshProfile} 
      />
    );
  }

  return <DashboardPage />;
}
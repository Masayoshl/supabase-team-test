import { useOnboarding } from '../hooks/useOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

interface OnboardingFormProps {
  onSuccess: () => void;
}

export function OnboardingPage({ onSuccess }: OnboardingFormProps) {
  const {
    mode,
    apiError,
    isLoading,
    createForm,
    joinForm,
    onCreateSubmit,
    onJoinSubmit,
    handleModeChange,
  } = useOnboarding({ onSuccess });

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm shadow-xl shadow-zinc-950/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight text-center text-zinc-100">
            Team Workspace Setup
          </CardTitle>
          <CardDescription className="text-center text-zinc-400">
            Create a new standalone team or join an existing one
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Custom Tab Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-lg border border-zinc-800 bg-zinc-900/40">
            <button
              type="button"
              onClick={() => handleModeChange('create')}
              className={`py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
                mode === 'create'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/30'
              }`}
            >
              Create Team
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('join')}
              className={`py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
                mode === 'join'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/30'
              }`}
            >
              Join Team
            </button>
          </div>

          {/* Conditional Form Rendering */}
          {mode === 'create' ? (
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamName" className="text-zinc-300">Team Name</Label>
                <Input
                  id="teamName"
                  placeholder="Acme Corp"
                  {...createForm.register('teamName')}
                />
                {createForm.formState.errors.teamName && (
                  <p className="text-xs text-destructive">
                    {createForm.formState.errors.teamName.message}
                  </p>
                )}
              </div>

              {apiError && (
                <div className="p-3 text-xs border bg-destructive/10 border-destructive/30 text-destructive rounded-md">
                  {apiError}
                </div>
              )}

              <Button type="submit" className="w-full bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer transition-colors" disabled={isLoading}>
                {isLoading ? 'Creating Team...' : 'Create'}
              </Button>
            </form>
          ) : (
            <form onSubmit={joinForm.handleSubmit(onJoinSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteCode" className="text-zinc-300">Invite Code</Label>
                <Input
                  id="inviteCode"
                  placeholder="X7R2K9"
                  maxLength={10}
                  {...joinForm.register('inviteCode')}
                  className="uppercase"
                />
                {joinForm.formState.errors.inviteCode && (
                  <p className="text-xs text-destructive">
                    {joinForm.formState.errors.inviteCode.message}
                  </p>
                )}
              </div>

              {apiError && (
                <div className="p-3 text-xs border bg-destructive/10 border-destructive/30 text-destructive rounded-md">
                  {apiError}
                </div>
              )}

              <Button type="submit" className="w-full bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer transition-colors" disabled={isLoading}>
                {isLoading ? 'Joining Team...' : 'Join'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
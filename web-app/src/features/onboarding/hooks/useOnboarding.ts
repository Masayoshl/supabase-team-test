import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTeamSchema, joinTeamSchema, type CreateTeamInput, type JoinTeamInput } from '../schemas/onboarding_schema';
import { onboardingService } from '../services/onboarding_service';

export type OnboardingMode = 'create' | 'join';

interface UseOnboardingOptions {
  onSuccess: () => void;
}

export function useOnboarding({ onSuccess }: UseOnboardingOptions) {
  const [mode, setMode] = useState<OnboardingMode>('create');
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createForm = useForm<CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { teamName: '' },
  });

  const joinForm = useForm<JoinTeamInput>({
    resolver: zodResolver(joinTeamSchema),
    defaultValues: { inviteCode: '' },
  });

  const onCreateSubmit = async (data: CreateTeamInput) => {
    setIsLoading(true);
    setApiError(null);
    try {
      await onboardingService.createTeam({ teamName: data.teamName });
      onSuccess();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to create team.');
    } finally {
      setIsLoading(false);
    }
  };

  const onJoinSubmit = async (data: JoinTeamInput) => {
    setIsLoading(true);
    setApiError(null);
    try {
      await onboardingService.joinTeam({ inviteCode: data.inviteCode });
      onSuccess();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Invalid invite code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = (newMode: OnboardingMode) => {
    setMode(newMode);
    setApiError(null);
    createForm.reset();
    joinForm.reset();
  };

  return {
    mode,
    apiError,
    isLoading,
    createForm,
    joinForm,
    onCreateSubmit,
    onJoinSubmit,
    handleModeChange,
  };
}

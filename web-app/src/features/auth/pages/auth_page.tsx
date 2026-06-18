/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { supabase } from '@/shared/supabase/supabase_client';


type AuthMode = 'sign_in' | 'sign_up' | 'forgot_password';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      if (mode === 'sign_in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'sign_up') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Verification link sent! Check your email.' });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Password reset link sent to your email!' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Something went wrong' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    }   catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md backdrop-blur-md border-zinc-900">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-center">
            {mode === 'sign_in' && 'Sign In'}
            {mode === 'sign_up' && 'Create an Account'}
            {mode === 'forgot_password' && 'Reset Password'}
          </CardTitle>
          <CardDescription className="text-center">
            {mode === 'sign_in' && 'Enter your email to access your team'}
            {mode === 'sign_up' && 'Sign up to build or join a team'}
            {mode === 'forgot_password' && 'Enter your email to get a reset link'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            {mode !== 'forgot_password' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === 'sign_in' && (
                    <button 
                      type="button" 
                      onClick={() => setMode('forgot_password')}
                      className="text-xs text-primary hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            {message && (
              <div className={`p-3 rounded-md text-xs border ${
                message.type === 'success' 
                  ? 'bg-emerald-950/30 border-emerald-800 text-emerald-400' 
                  : 'bg-destructive/10 border-destructive/30 text-destructive'
              }`}>
                {message.text}
              </div>
            )}

            <Button type="submit" className="w-full cursor-pointer" disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Continue'}
            </Button>
          </form>

          {mode !== 'forgot_password' && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className=" px-2 ">Or continue with</span>
              </div>
            </div>
          )}

          {mode !== 'forgot_password' && (
            <Button variant="outline" type="button" className="w-full border-zinc-800 hover:bg-zinc-100 cursor-pointer" onClick={handleGoogleAuth}>
              Google
            </Button>
          )}
        </CardContent>

        <CardFooter className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in');
            }}
          
          >
            {mode === 'sign_in' && "Don't have an account? Sign up"}
            {mode === 'sign_up' && 'Already have an account? Sign in'}
            {mode === 'forgot_password' && 'Back to Sign In'}
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
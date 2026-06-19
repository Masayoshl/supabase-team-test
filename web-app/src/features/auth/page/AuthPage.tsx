/* eslint-disable @typescript-eslint/no-explicit-any */

import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

export function AuthPage() {
  const {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    message,
    setMessage,
    handleEmailAuth,
    handleGoogleAuth,
  } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm shadow-xl shadow-zinc-950/20">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-center text-zinc-100">
            {mode === 'sign_in' && 'Sign In'}
            {mode === 'sign_up' && 'Create an Account'}
            {mode === 'forgot_password' && 'Reset Password'}
          </CardTitle>
          <CardDescription className="text-center text-zinc-400">
            {mode === 'sign_in' && 'Enter your email to access your team'}
            {mode === 'sign_up' && 'Sign up to build or join a team'}
            {mode === 'forgot_password' && 'Enter your email to get a reset link'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
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
                  <Label htmlFor="password" className="text-zinc-300">Password</Label>
                  {mode === 'sign_in' && (
                    <button 
                      type="button" 
                      onClick={() => setMode('forgot_password')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer transition-colors"
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

            <Button type="submit" className="w-full bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer transition-colors" disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Continue'}
            </Button>
          </form>

          {mode !== 'forgot_password' && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#141416] px-2 text-zinc-500">Or continue with</span>
              </div>
            </div>
          )}

          {mode !== 'forgot_password' && (
            <Button variant="outline" type="button" className="w-full border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800/50 hover:text-zinc-100 cursor-pointer transition-all" onClick={handleGoogleAuth}>
              Google
            </Button>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t border-zinc-800/50 bg-zinc-900/20 py-4">
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in');
            }}
            className="text-xs text-zinc-400 hover:text-zinc-100 hover:underline cursor-pointer transition-colors"
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
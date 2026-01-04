import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Building2, AlertTriangle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if Supabase is configured
  const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);
    
    try {
      if (isRegister) {
        if (!name || !email || !password) {
          setError('All fields are required');
          setIsLoading(false);
          return;
        }
        const result = await register(name, email, password, phone);
        if (!result.success) {
          setError(result.error || 'Registration failed');
        } else {
          setSuccessMessage('Account created successfully! Please check your email to confirm your account.');
        }
      } else {
        const result = await login(email, password);
        if (!result.success) {
          setError(result.error || 'Invalid email or password');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            {isRegister ? 'Create Owner Account' : 'RentHub Login'}
          </CardTitle>
          <CardDescription className="text-center">
            {isRegister 
              ? 'Register as a property owner to start managing rentals'
              : 'Sign in to manage your properties and tenants'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSupabaseConfigured && (
            <Alert className="mb-4 border-yellow-500 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>⚠️ Supabase Not Configured</strong>
                <p className="mt-1 text-sm">
                  Create a <code className="bg-yellow-100 px-1 rounded">.env</code> file with your Supabase credentials to enable authentication.
                </p>
                <p className="mt-1 text-sm">
                  See <code className="bg-yellow-100 px-1 rounded">SUPABASE_SETUP.md</code> for instructions.
                </p>
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            {successMessage && (
              <Alert className="border-green-500 bg-green-50">
                <AlertDescription className="text-green-800">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Please wait...' : (isRegister ? 'Register' : 'Sign In')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setSuccessMessage('');
            }}
            disabled={isLoading}
          >
            {isRegister 
              ? 'Already have an account? Sign In'
              : 'Need an owner account? Register'
            }
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
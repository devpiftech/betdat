import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { signUp } from '../../lib/supabase';
import { useStore } from '../../store/useStore';

export const SignUpPage = () => {
  const navigate = useNavigate();
  const { setUser } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate inputs
      if (!email || !password || !username) {
        throw new Error('All fields are required');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (username.length < 3) {
        throw new Error('Username must be at least 3 characters');
      }

      // Sign up user
      const { data, error: signUpError } = await signUp(email, password, username);
      if (signUpError) throw signUpError;
      if (!data?.user) throw new Error('Failed to create account');

      // Set user and navigate
      if (data.profile) {
        setUser(data.profile);
        navigate('/dashboard', { replace: true });
      } else {
        throw new Error('Failed to create profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-indigo-900 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <div className="rounded-lg bg-white/10 p-8 backdrop-blur-sm">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">Create Account</h2>
            <p className="mt-2 text-gray-300">
              Join thousands of players in the ultimate social casino
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300">
                Username
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="block w-full rounded-lg border-gray-600 bg-white/5 pl-10 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="Choose a username"
                  minLength={3}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="block w-full rounded-lg border-gray-600 bg-white/5 pl-10 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="block w-full rounded-lg border-gray-600 bg-white/5 pl-10 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="Choose a password"
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-center text-sm text-gray-300">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-blue-400 hover:text-blue-300 disabled:opacity-50"
                onClick={(e) => loading && e.preventDefault()}
              >
                Sign In
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
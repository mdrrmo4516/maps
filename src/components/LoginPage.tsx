import { useState } from "react";
import { Eye, EyeOff, Lock, User, ArrowLeft, LogIn, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface LoginPageProps {
  onLogin?: () => void;
  onNavigate?: (view: string) => void;
}

export default function LoginPage({ onLogin, onNavigate }: LoginPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validation
      if (!email.trim()) {
        setError("Please enter your email");
        setLoading(false);
        return;
      }

      if (!password) {
        setError("Please enter your password");
        setLoading(false);
        return;
      }

      if (isSignUp) {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters");
          setLoading(false);
          return;
        }
        await signUp(email, password);
        setError(null);
        // Switch to sign in mode
        setIsSignUp(false);
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      } else {
        await signIn(email, password);
        
        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem("rememberMe", "true");
          localStorage.setItem("userEmail", email);
        } else {
          localStorage.removeItem("rememberMe");
          localStorage.removeItem("userEmail");
        }

        // Trigger callback
        onLogin?.();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Authentication failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load saved email if remember me was checked
  if (!rememberMe && email === "") {
    const savedEmail = localStorage.getItem("userEmail");
    const remember = localStorage.getItem("rememberMe");
    if (savedEmail && remember) {
      setTimeout(() => {
        setEmail(savedEmail);
        setRememberMe(true);
      }, 0);
    }
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/50">
        <div className="text-center mb-8">
          <div className="mx-auto bg-gradient-to-br from-blue-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {isSignUp ? "Create Account" : "Sign In"}
          </h2>
          <p className="text-gray-600">
            {isSignUp ? "Create a new account to get started" : "Access your map dashboard"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password (Sign Up only) */}
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Remember Me */}
          {!isSignUp && (
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={loading}
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-gray-700"
              >
                Remember me
              </label>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 border border-red-200 flex gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <LogIn className="w-5 h-5" />
              {loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.("panorama")}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800 font-medium rounded-lg shadow transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
          </div>

          {/* Toggle Sign Up / Sign In */}
          <div className="text-center pt-2">
            <p className="text-sm text-gray-600">
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setPassword("");
                  setConfirmPassword("");
                }}
                disabled={loading}
                className="font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} Map Viewer. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

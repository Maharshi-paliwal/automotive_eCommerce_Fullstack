import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { heroSectionData } from "../assets/assets";
import { Loader2Icon, LockIcon, MailIcon, UserIcon } from "lucide-react";
const Login = () => {
  const [isLoginState, setIsLoginState] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${apiUrl}/auth/${isLoginState ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isLoginState ? { email, password } : { name, email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not sign in.");
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      navigate("/");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* left side */}
      <div className="hidden lg:flex lg:w-1/2 bg-app-blue relative items-center justify-center">
        <img
          src={heroSectionData.hero_image}
          alt=""
          className="absolute inset-0 object-cover h-full bg-center opacity-30"
        />
        <div className="relative text-center px-12">
          <h2 className="text-4xl font-semibold text-white mb-4">
            Welcome to TorqueNest
          </h2>
          <p className="text-white/80 font-serif text-xl max-w-sm max-auto">
            Automotive parts for cars, bikes and everything in between.
          </p>
        </div>
      </div>
      {/* right side */}
      <div className="flex-1 flex-center px-4 py-12 bg-app-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center  gap-2 mb-4">
              <img
                src={heroSectionData.logo}
                alt=""
                className="size-[50px] object-contain"
              />
              <span className="text-2xl font-semibold text-app-blue">
                TorqueNest
              </span>
            </Link>
            <h1 className="text-2xl font-semibold text-app-blue-light">
              {isLoginState
                ? "Sign in to your Account"
                : "Sign up to your Accont"}
            </h1>
            <p className="text-sm text-app-blue-light">
              {isLoginState
                ? "don't have an account ?"
                : "already have an account"}{" "}
              <button
                onClick={() => setIsLoginState(!isLoginState)}
                className="text-app-amber ml-1 font-semibold hover:text-app-amber-dark transition-colors"
              >
                {isLoginState ? "Create One " : "Sign In"}
              </button>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLoginState && (
              <label htmlFor="" className="text-sm flex flex-col gap-1">
                Name
                <div className="relative">
                  <UserIcon
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your Name"
                    className="w-full pl-11 pr-4 py-3 text-sm bg-white rounded-xl border not-focus:border-app-border transition-all"
                  />
                </div>
              </label>
            )}
             <label htmlFor="" className="text-sm flex flex-col gap-1">
                Email
                <div className="relative">
                  <MailIcon
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="You@example.com"
                    className="w-full pl-11 pr-4 py-3 text-sm bg-white rounded-xl border not-focus:border-app-border transition-all"
                  />
                </div>
              </label>

               <label htmlFor="" className="text-sm flex flex-col gap-1">
                Password
                <div className="relative">
                  <LockIcon
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Your Password"
                    className="w-full pl-11 pr-4 py-3 text-sm bg-white rounded-xl border not-focus:border-app-border transition-all"
                  />
                </div>
              </label>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <button type="submit" className="flex-center w-full py-3 bg-sky-600 text-white font-semibold rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-50" disabled={loading}>
                {loading? <Loader2Icon className="animate-spin"/> : isLoginState ? "Sign In" : "Sign Up"}
              </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

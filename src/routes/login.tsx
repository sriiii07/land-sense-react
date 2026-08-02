/** Authority sign-in. Credentials are validated by the backend. */
import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MountainSnow, Lock } from "lucide-react";
import { clearAuthToken, login, setAuthToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Authority Login — BHOOSAKTHI" },
      {
        name: "description",
        content:
          "Restricted sign-in for district disaster management officers of the BHOOSAKTHI landslide warning platform.",
      },
      { property: "og:title", content: "Authority Login — BHOOSAKTHI" },
      {
        property: "og:description",
        content: "Restricted sign-in for district disaster management officers.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [email, setEmail] = useState("anil.kumar@ddma.kerala.gov.in");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!auth.loading && auth.user) {
      navigate({ to: "/dashboard" });
    }
  }, [auth.loading, auth.user, navigate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await login(email, password);
      setAuthToken(response.access_token);
      await auth.refreshUser();
      navigate({ to: "/dashboard" });
    } catch (err) {
      clearAuthToken();
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <div className="bg-primary px-4 py-1.5 text-center text-xs text-primary-foreground">
        Restricted system · Authorised personnel only · All activity is logged
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2.5">
            <MountainSnow aria-hidden className="size-6 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">BHOOSAKTHI</p>
              <p className="text-xs text-muted-foreground">Authority Console</p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded border border-border bg-card p-6"
          >
            <div>
              <h1 className="text-base font-semibold text-foreground">Officer sign in</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Use the credentials issued by your State Disaster Management Authority.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-medium text-foreground">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" name="remember" className="size-3.5 rounded border-input" />
                Keep me signed in
              </label>
              <Link to="/forgot-password" className="font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            {error ? <p className="text-sm text-risk-critical">{error}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Lock aria-hidden className="size-4" />
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Not an officer?{" "}
            <Link to="/" className="font-medium text-primary hover:underline">
              Return to public site
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

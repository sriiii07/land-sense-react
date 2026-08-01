/** Password recovery request for registered officers. */
import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MountainSnow, MailCheck } from "lucide-react";
import { forgotPassword } from "@/lib/api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — BHOOSAKTHI Authority Console" },
      {
        name: "description",
        content:
          "Request a password reset link for your BHOOSAKTHI disaster management officer account.",
      },
      { property: "og:title", content: "Reset Password — BHOOSAKTHI Authority Console" },
      {
        property: "og:description",
        content: "Request a password reset link for your officer account.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit your request.");
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

          <div className="rounded border border-border bg-card p-6">
            {submitted ? (
              <div>
                <MailCheck aria-hidden className="size-5 text-risk-low" />
                <h1 className="mt-3 text-base font-semibold text-foreground">Request received</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  If the officer ID exists, a reset link has been sent to the registered government
                  email address. The link expires in 30 minutes.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h1 className="text-base font-semibold text-foreground">Reset password</h1>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enter your officer ID. A reset link will be sent to your registered government
                    email address.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="recovery-email" className="block text-xs font-medium text-foreground">
                    Email address
                  </label>
                  <input
                    id="recovery-email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
                  />
                </div>

                {error ? <p className="text-sm text-risk-critical">{error}</p> : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Sending..." : "Send reset link"}
                </button>
              </form>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

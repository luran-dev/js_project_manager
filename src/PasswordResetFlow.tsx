import { type FormEvent, useEffect, useRef, useState } from "react";
import { projectVibeRepository } from "./repository";

type ResetStep =
  | { readonly kind: "request" }
  | { readonly kind: "verify"; readonly email: string }
  | { readonly kind: "complete"; readonly resetToken: string };

export function PasswordResetFlow({ onCancel, onComplete }: { readonly onCancel: () => void; readonly onComplete: () => void }) {
  const [step, setStep] = useState<ResetStep>({ kind: "request" });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => headingRef.current?.focus(), [step.kind]);

  const run = async (action: () => Promise<void>) => {
    setSubmitting(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const requestCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");
    if (typeof email !== "string") return;
    void run(async () => {
      await projectVibeRepository.requestPasswordReset(email);
      setStep({ kind: "verify", email });
    });
  };

  const verifyCode = (event: FormEvent<HTMLFormElement>, email: string) => {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get("code");
    if (typeof code !== "string") return;
    void run(async () => {
      const resetToken = await projectVibeRepository.verifyPasswordReset(email, code);
      setStep({ kind: "complete", resetToken });
    });
  };

  const changePassword = (event: FormEvent<HTMLFormElement>, resetToken: string) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = form.get("password");
    const confirmation = form.get("confirmation");
    if (typeof password !== "string" || typeof confirmation !== "string") return;
    if (password !== confirmation) {
      setMessage("Passwords do not match");
      return;
    }
    void run(async () => {
      await projectVibeRepository.completePasswordReset(resetToken, password);
      onComplete();
    });
  };

  return (
    <>
      <h1 id="auth-title" ref={headingRef} tabIndex={-1}>{step.kind === "request" ? "Reset password" : step.kind === "verify" ? "Enter verification code" : "Choose a new password"}</h1>
      {step.kind === "request" ? (
        <form className="auth-form" onSubmit={requestCode}>
          <p className="auth-description">Enter the email address associated with your account.</p>
          <label>Email<input autoComplete="email" name="email" required type="email" /></label>
          <button className="text-button primary" disabled={submitting} type="submit">{submitting ? "Sending..." : "Send verification code"}</button>
        </form>
      ) : step.kind === "verify" ? (
        <form className="auth-form" onSubmit={(event) => verifyCode(event, step.email)}>
          <p className="auth-description">Enter the 6-digit code sent to {step.email}.</p>
          <label>Verification code<input autoComplete="one-time-code" inputMode="numeric" maxLength={6} name="code" pattern="[0-9]{6}" required /></label>
          <button className="text-button primary" disabled={submitting} type="submit">{submitting ? "Verifying..." : "Verify code"}</button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={(event) => changePassword(event, step.resetToken)}>
          <label>New password<input autoComplete="new-password" minLength={8} name="password" required type="password" /></label>
          <label>Confirm new password<input autoComplete="new-password" minLength={8} name="confirmation" required type="password" /></label>
          <button className="text-button primary" disabled={submitting} type="submit">{submitting ? "Updating..." : "Update password"}</button>
        </form>
      )}
      {message ? <p className="auth-error" role="alert">{message}</p> : null}
      <button className="auth-link" onClick={onCancel} type="button">Back to sign in</button>
    </>
  );
}

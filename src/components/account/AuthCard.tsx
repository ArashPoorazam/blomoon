"use client";

import { LoaderCircle, Mail, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import {
  AuthFields,
  RegisterProgress,
  getAuthSubtitle,
  getAuthTitle,
  getPrimaryActionLabel,
  type AuthMode,
  type RegisterStep,
  type ResetStep
} from "./AuthCardView";

type FormNotice = {
  kind: "info" | "success";
  message: string;
};

type AuthCardProps = {
  googleAuthEnabled: boolean;
  modeLabel: string;
  onAuthenticated: () => void | Promise<void>;
  onClose?: () => void;
  serviceError?: string | null;
  titleSuffix?: string;
};

export function AuthCard({
  googleAuthEnabled,
  modeLabel,
  onAuthenticated,
  onClose,
  serviceError,
  titleSuffix
}: AuthCardProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [registerStep, setRegisterStep] = useState<RegisterStep>("email");
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [registrationVerificationSource, setRegistrationVerificationSource] = useState<"pending" | "better-auth">("pending");
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const isModal = Boolean(onClose);
  const title = getAuthTitle(mode, registerStep, resetStep);
  const subtitle = getAuthSubtitle(mode, registerStep, resetStep, titleSuffix, email);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    clearMessages();

    try {
      if (mode === "login") {
        await submitLogin();
        return;
      }

      if (mode === "reset") {
        if (resetStep === "email") {
          await requestPasswordResetCode();
          return;
        }

        await resetPasswordWithCode();
        return;
      }

      if (registerStep === "email") {
        continueToPasswordStep();
        return;
      }

      if (registerStep === "password") {
        await createAccountAndSendCode();
        return;
      }

      await verifyRegistrationCode();
    } catch {
      setError("Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitLogin() {
    const normalizedEmail = normalizeEmail(email);
    const result = await authClient.signIn.email({
      callbackURL: "/?auth=verified",
      email: normalizedEmail,
      password,
      rememberMe
    });

    if (result.error) {
      if (isEmailVerificationError(result.error)) {
        await sendVerificationCode(normalizedEmail);
        setMode("register");
        setRegisterStep("verify");
        setRegistrationVerificationSource("better-auth");
        setVerificationEmail(normalizedEmail);
        setNotice({
          kind: "info",
          message: "Enter the verification code we sent to your email."
        });
        return;
      }

      setError(result.error.message ?? "Authentication failed.");
      return;
    }

    await finishAuthenticatedFlow();
  }

  function continueToPasswordStep() {
    setEmail(normalizeEmail(email));
    setRegisterStep("password");
  }

  async function createAccountAndSendCode() {
    if (password !== confirmPassword) {
      setError("Passwords must match.");
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    if (!await requestPendingRegistrationCode(normalizedEmail)) {
      return;
    }

    setEmail(normalizedEmail);
    setVerificationEmail(normalizedEmail);
    setRegistrationVerificationSource("pending");
    setRegisterStep("verify");
    setNotice({
      kind: "success",
      message: "Verification code sent. Check your email."
    });
  }

  async function requestPendingRegistrationCode(normalizedEmail: string) {
    const response = await fetch("/api/auth/pending-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirmPassword,
        email: normalizedEmail,
        password
      })
    });

    if (!response.ok) {
      const payload = await readErrorPayload(response);
      setError(payload.error ?? "Could not create your account.");
      return false;
    }

    return true;
  }

  async function verifyRegistrationCode() {
    const normalizedEmail = normalizeEmail(verificationEmail ?? email);

    if (registrationVerificationSource === "better-auth") {
      const result = await authClient.emailOtp.verifyEmail({
        email: normalizedEmail,
        otp: verificationCode.trim()
      });

      if (result.error) {
        setError(result.error.message ?? "Verification failed.");
        return;
      }

      await finishAuthenticatedFlow();
      return;
    }

    const response = await fetch("/api/auth/pending-registration/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: normalizedEmail,
        otp: verificationCode.trim()
      })
    });

    if (!response.ok) {
      const payload = await readErrorPayload(response);
      setError(payload.error ?? "Verification failed.");
      return;
    }

    const signInResult = await authClient.signIn.email({
      callbackURL: "/?auth=verified",
      email: normalizedEmail,
      password,
      rememberMe: true
    });

    if (signInResult.error) {
      setError(signInResult.error.message ?? "Account verified. Log in to continue.");
      setMode("login");
      setRegisterStep("email");
      setConfirmPassword("");
      setVerificationCode("");
      return;
    }

    await finishAuthenticatedFlow();
  }

  async function resendVerificationCode() {
    const normalizedEmail = normalizeEmail(verificationEmail ?? email);

    if (!normalizedEmail) {
      setError("Enter your email address first.");
      return;
    }

    setResendingVerification(true);
    clearMessages();

    try {
      if (registrationVerificationSource === "pending") {
        if (!await requestPendingRegistrationCode(normalizedEmail)) {
          return;
        }
      } else {
        await sendVerificationCode(normalizedEmail);
      }

      setVerificationEmail(normalizedEmail);
      setNotice({
        kind: "success",
        message: "Verification code sent. Check your email."
      });
    } catch {
      setError("Could not send a verification code.");
    } finally {
      setResendingVerification(false);
    }
  }

  async function sendVerificationCode(normalizedEmail: string) {
    const result = await authClient.emailOtp.sendVerificationOtp({
      email: normalizedEmail,
      type: "email-verification"
    });

    if (result.error) {
      throw new Error(result.error.message ?? "Could not send a verification code.");
    }
  }

  async function signInWithGoogle() {
    setSubmitting(true);
    clearMessages();

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/"
      });

      if (result?.error) {
        setError(result.error.message ?? "Google sign-in failed.");
      }
    } catch {
      setError("Google sign-in is unavailable.");
    } finally {
      setSubmitting(false);
    }
  }

  async function requestPasswordResetCode() {
    const normalizedEmail = normalizeEmail(email);
    const result = await authClient.emailOtp.requestPasswordReset({
      email: normalizedEmail
    });

    if (result.error) {
      setError(result.error.message ?? "Could not send a reset code.");
      return;
    }

    setEmail(normalizedEmail);
    setVerificationEmail(normalizedEmail);
    setResetStep("verify");
    setNotice({
      kind: "success",
      message: "Password reset code sent. Check your email."
    });
  }

  async function resetPasswordWithCode() {
    if (password !== confirmPassword) {
      setError("Passwords must match.");
      return;
    }

    const normalizedEmail = normalizeEmail(verificationEmail ?? email);
    const result = await authClient.emailOtp.resetPassword({
      email: normalizedEmail,
      otp: verificationCode.trim(),
      password
    });

    if (result.error) {
      setError(result.error.message ?? "Could not reset your password.");
      return;
    }

    setMode("login");
    setResetStep("email");
    setPassword("");
    setConfirmPassword("");
    setVerificationCode("");
    setNotice({
      kind: "success",
      message: "Password reset. Log in with your new password."
    });
  }

  async function finishAuthenticatedFlow() {
    await onAuthenticated();
    onClose?.();
    setPassword("");
    setConfirmPassword("");
    setVerificationCode("");
  }

  function clearMessages() {
    setError(null);
    setNotice(null);
  }

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setRegisterStep("email");
    setResetStep("email");
    setPassword("");
    setConfirmPassword("");
    setVerificationCode("");
    setVerificationEmail(null);
    setRegistrationVerificationSource("pending");
    clearMessages();
  }

  function goBackOneRegisterStep() {
    clearMessages();
    setRegisterStep(registerStep === "verify" ? "password" : "email");
  }

  function startPasswordReset() {
    setMode("reset");
    setRegisterStep("email");
    setResetStep("email");
    setPassword("");
    setConfirmPassword("");
    setVerificationCode("");
    setVerificationEmail(null);
    setRegistrationVerificationSource("pending");
    clearMessages();
  }

  function goBackOneResetStep() {
    clearMessages();
    setResetStep("email");
    setPassword("");
    setConfirmPassword("");
    setVerificationCode("");
  }

  const showsBackButton = (mode === "register" && registerStep !== "email") || (mode === "reset" && resetStep !== "email");

  return (
    <div
      className="auth-modal"
      role={isModal ? "dialog" : undefined}
      aria-modal={isModal ? "true" : undefined}
      aria-labelledby="auth-title"
    >
      <div className="modal-header">
        <div>
          <div className="drawer-kicker">{modeLabel}</div>
          <h2 id="auth-title">{title}</h2>
          {subtitle ? <p className="auth-greeting">{subtitle}</p> : null}
        </div>
        {onClose ? (
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
            <X size={17} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {mode === "register" ? <RegisterProgress activeStep={registerStep} /> : null}

      <form className="auth-form" onSubmit={submit}>
        <AuthFields
          confirmPassword={confirmPassword}
          email={email}
          mode={mode}
          password={password}
          registerStep={registerStep}
          resetStep={resetStep}
          rememberMe={rememberMe}
          verificationCode={verificationCode}
          onConfirmPasswordChange={setConfirmPassword}
          onEmailChange={(value) => {
            setEmail(value);
            setVerificationEmail(null);
          }}
          onPasswordChange={setPassword}
          onRememberMeChange={setRememberMe}
          onVerificationCodeChange={setVerificationCode}
        />

        {serviceError ? <div className="form-error">{serviceError}</div> : null}
        {error ? <div className="form-error">{error}</div> : null}
        {notice ? <div className={`form-status ${notice.kind}`}>{notice.message}</div> : null}

        {mode === "login" ? (
          <button className="text-action inline" disabled={submitting || Boolean(serviceError)} type="button" onClick={startPasswordReset}>
            Forgot password?
          </button>
        ) : null}

        <div className={showsBackButton ? "auth-form-actions" : ""}>
          {showsBackButton ? (
            <button
              className="secondary-action"
              disabled={submitting || Boolean(serviceError)}
              type="button"
              onClick={mode === "reset" ? goBackOneResetStep : goBackOneRegisterStep}
            >
              Back
            </button>
          ) : null}
          <button className="primary-action" disabled={submitting || Boolean(serviceError)} type="submit">
            {submitting ? <LoaderCircle className="spin" size={15} aria-hidden="true" /> : null}
            {getPrimaryActionLabel(mode, registerStep, resetStep)}
          </button>
        </div>
      </form>

      <div className="auth-secondary-actions">
        {mode === "register" && registerStep === "verify" ? (
          <button
            className="secondary-action"
            disabled={resendingVerification || submitting || Boolean(serviceError)}
            type="button"
            onClick={resendVerificationCode}
          >
            {resendingVerification ? <LoaderCircle className="spin" size={15} aria-hidden="true" /> : null}
            {!resendingVerification ? <Mail size={15} aria-hidden="true" /> : null}
            Resend verification code
          </button>
        ) : null}

        {googleAuthEnabled ? (
          <button className="secondary-action" disabled={submitting || Boolean(serviceError)} type="button" onClick={signInWithGoogle}>
            Continue with Google
          </button>
        ) : null}
      </div>

      <button className="text-action" type="button" onClick={switchMode}>
        {mode === "login" ? "Create an account" : "Use an existing account"}
      </button>
    </div>
  );
}

function normalizeEmail(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

async function readErrorPayload(response: Response): Promise<{ error?: string }> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function isEmailVerificationError(error: { code?: string; message?: string; status?: number }) {
  return error.status === 403
    || error.code === "EMAIL_NOT_VERIFIED"
    || error.message?.toLowerCase().includes("email not verified") === true;
}

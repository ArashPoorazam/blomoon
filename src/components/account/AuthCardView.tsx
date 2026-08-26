export type AuthMode = "login" | "register";
export type RegisterStep = "email" | "password" | "verify";

const registerSteps: RegisterStep[] = ["email", "password", "verify"];

export function AuthFields({
  confirmPassword,
  email,
  mode,
  password,
  registerStep,
  rememberMe,
  verificationCode,
  onConfirmPasswordChange,
  onEmailChange,
  onPasswordChange,
  onRememberMeChange,
  onVerificationCodeChange
}: {
  confirmPassword: string;
  email: string;
  mode: AuthMode;
  password: string;
  registerStep: RegisterStep;
  rememberMe: boolean;
  verificationCode: string;
  onConfirmPasswordChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRememberMeChange: (value: boolean) => void;
  onVerificationCodeChange: (value: string) => void;
}) {
  if (mode === "register" && registerStep === "verify") {
    return (
      <label className="form-field">
        <span className="form-label-text">
          Verification code <span className="required-marker" aria-hidden="true">*</span>
        </span>
        <input
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
          pattern="[0-9]*"
          required
          type="text"
          value={verificationCode}
          onChange={(event) => onVerificationCodeChange(event.target.value)}
        />
      </label>
    );
  }

  if (mode === "register" && registerStep === "password") {
    return (
      <>
        <label className="form-field">
          <span className="form-label-text">
            Password <span className="required-marker" aria-hidden="true">*</span>
          </span>
          <input
            autoComplete="new-password"
            minLength={8}
            required
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
          />
        </label>
        <label className="form-field">
          <span className="form-label-text">
            Confirm password <span className="required-marker" aria-hidden="true">*</span>
          </span>
          <input
            autoComplete="new-password"
            minLength={8}
            required
            type="password"
            value={confirmPassword}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
          />
        </label>
        <div className="form-hint">Use at least 8 characters. No symbol or uppercase rule required.</div>
      </>
    );
  }

  return (
    <>
      <label className="form-field">
        <span className="form-label-text">
          Email <span className="required-marker" aria-hidden="true">*</span>
        </span>
        <input
          autoComplete="email"
          required
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
        />
      </label>
      {mode === "login" ? (
        <>
          <label className="form-field">
            <span className="form-label-text">
              Password <span className="required-marker" aria-hidden="true">*</span>
            </span>
            <input
              autoComplete="current-password"
              minLength={8}
              required
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
          </label>
          <label className="remember-option">
            <input
              checked={rememberMe}
              type="checkbox"
              onChange={(event) => onRememberMeChange(event.target.checked)}
            />
            <span className="remember-check" aria-hidden="true" />
            <span>Remember me</span>
          </label>
        </>
      ) : null}
    </>
  );
}

export function RegisterProgress({ activeStep }: { activeStep: RegisterStep }) {
  const activeIndex = registerSteps.indexOf(activeStep);

  return (
    <ol className="auth-step-list" aria-label="Registration progress">
      {registerSteps.map((step, index) => (
        <li className={`auth-step ${index <= activeIndex ? "active" : ""}`} key={step}>
          <span>{index + 1}</span>
          {getRegisterStepLabel(step)}
        </li>
      ))}
    </ol>
  );
}

export function getAuthTitle(mode: AuthMode, registerStep: RegisterStep) {
  if (mode === "login") {
    return "Log in";
  }

  if (registerStep === "password") {
    return "Set password";
  }

  if (registerStep === "verify") {
    return "Verify email";
  }

  return "Create account";
}

export function getAuthSubtitle(mode: AuthMode, registerStep: RegisterStep, loginSubtitle?: string, email?: string) {
  if (mode === "login") {
    return loginSubtitle;
  }

  if (registerStep === "password") {
    return "Choose a password and confirm it before we send your code.";
  }

  if (registerStep === "verify") {
    return `Enter the 6-digit code sent to ${normalizeEmail(email)}.`;
  }

  return "Start with the email you want to use for Blomoon.";
}

export function getPrimaryActionLabel(mode: AuthMode, registerStep: RegisterStep) {
  if (mode === "login") {
    return "Log in";
  }

  if (registerStep === "password") {
    return "Create account";
  }

  if (registerStep === "verify") {
    return "Verify account";
  }

  return "Continue";
}

function getRegisterStepLabel(step: RegisterStep) {
  if (step === "password") {
    return "Password";
  }

  if (step === "verify") {
    return "Verify";
  }

  return "Email";
}

function normalizeEmail(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

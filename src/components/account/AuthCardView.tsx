export type AuthMode = "login" | "register" | "reset";
export type RegisterStep = "email" | "password" | "verify";
export type ResetStep = "email" | "verify";

const registerSteps: RegisterStep[] = ["email", "password", "verify"];

export function AuthFields({
  confirmPassword,
  email,
  mode,
  password,
  registerStep,
  resetStep,
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
  resetStep: ResetStep;
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
      <div className="auth-field-group" key="register-verify-fields">
        <label className="form-field" htmlFor="register-verification-code">
          <span className="form-label-text">
            Verification code <span className="required-marker" aria-hidden="true">*</span>
          </span>
          <input
            autoComplete="one-time-code"
            id="register-verification-code"
            inputMode="numeric"
            maxLength={6}
            name="otp"
            pattern="[0-9]*"
            required
            type="text"
            value={verificationCode}
            onChange={(event) => onVerificationCodeChange(event.target.value)}
          />
        </label>
      </div>
    );
  }

  if (mode === "register" && registerStep === "password") {
    return (
      <div className="auth-field-group" key="register-password-fields">
        <label className="form-field" htmlFor="register-password">
          <span className="form-label-text">
            Password <span className="required-marker" aria-hidden="true">*</span>
          </span>
          <input
            autoComplete="new-password"
            id="register-password"
            minLength={8}
            name="password"
            required
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
          />
        </label>
        <label className="form-field" htmlFor="register-confirm-password">
          <span className="form-label-text">
            Confirm password <span className="required-marker" aria-hidden="true">*</span>
          </span>
          <input
            autoComplete="new-password"
            id="register-confirm-password"
            minLength={8}
            name="confirmPassword"
            required
            type="password"
            value={confirmPassword}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
          />
        </label>
        <div className="form-hint">Use at least 8 characters. No symbol or uppercase rule required.</div>
      </div>
    );
  }

  if (mode === "reset" && resetStep === "verify") {
    return (
      <div className="auth-field-group" key="reset-verify-fields">
        <label className="form-field" htmlFor="reset-verification-code">
          <span className="form-label-text">
            Verification code <span className="required-marker" aria-hidden="true">*</span>
          </span>
          <input
            autoComplete="one-time-code"
            id="reset-verification-code"
            inputMode="numeric"
            maxLength={6}
            name="otp"
            pattern="[0-9]*"
            required
            type="text"
            value={verificationCode}
            onChange={(event) => onVerificationCodeChange(event.target.value)}
          />
        </label>
        <label className="form-field" htmlFor="reset-password">
          <span className="form-label-text">
            New password <span className="required-marker" aria-hidden="true">*</span>
          </span>
          <input
            autoComplete="new-password"
            id="reset-password"
            minLength={8}
            name="password"
            required
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
          />
        </label>
        <label className="form-field" htmlFor="reset-confirm-password">
          <span className="form-label-text">
            Confirm password <span className="required-marker" aria-hidden="true">*</span>
          </span>
          <input
            autoComplete="new-password"
            id="reset-confirm-password"
            minLength={8}
            name="confirmPassword"
            required
            type="password"
            value={confirmPassword}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
          />
        </label>
      </div>
    );
  }

  if (mode === "reset") {
    return (
      <div className="auth-field-group" key="reset-email-fields">
        <label className="form-field" htmlFor="reset-email">
          <span className="form-label-text">
            Email <span className="required-marker" aria-hidden="true">*</span>
          </span>
          <input
            autoComplete="username"
            id="reset-email"
            name="email"
            required
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="auth-field-group" key={`${mode}-${mode === "login" ? "credentials" : "email"}-fields`}>
      <label className="form-field" htmlFor={mode === "login" ? "login-email" : "register-email"}>
        <span className="form-label-text">
          Email <span className="required-marker" aria-hidden="true">*</span>
        </span>
        <input
          autoComplete={mode === "login" ? "username" : "email"}
          id={mode === "login" ? "login-email" : "register-email"}
          name="email"
          required
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
        />
      </label>
      {mode === "login" ? (
        <>
          <label className="form-field" htmlFor="login-password">
            <span className="form-label-text">
              Password <span className="required-marker" aria-hidden="true">*</span>
            </span>
            <input
              autoComplete="current-password"
              id="login-password"
              minLength={8}
              name="password"
              required
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
          </label>
          <label className="remember-option">
            <input
              checked={rememberMe}
              id="login-remember"
              name="remember"
              type="checkbox"
              onChange={(event) => onRememberMeChange(event.target.checked)}
            />
            <span className="remember-check" aria-hidden="true" />
            <span>Remember me</span>
          </label>
        </>
      ) : null}
    </div>
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

export function getAuthTitle(mode: AuthMode, registerStep: RegisterStep, resetStep: ResetStep) {
  if (mode === "login") {
    return "Log in";
  }

  if (mode === "reset") {
    return resetStep === "verify" ? "Reset password" : "Forgot password";
  }

  if (registerStep === "password") {
    return "Set password";
  }

  if (registerStep === "verify") {
    return "Verify email";
  }

  return "Create account";
}

export function getAuthSubtitle(mode: AuthMode, registerStep: RegisterStep, resetStep: ResetStep, loginSubtitle?: string, email?: string) {
  if (mode === "login") {
    return loginSubtitle;
  }

  if (mode === "reset") {
    if (resetStep === "verify") {
      return `Enter the code sent to ${normalizeEmail(email)}, then choose a new password.`;
    }

    return "Enter your account email and we will send a password reset code.";
  }

  if (registerStep === "password") {
    return "Choose a password and confirm it before we send your code.";
  }

  if (registerStep === "verify") {
    return `Enter the 6-digit code sent to ${normalizeEmail(email)}.`;
  }

  return "Start with the email you want to use for Blomoon.";
}

export function getPrimaryActionLabel(mode: AuthMode, registerStep: RegisterStep, resetStep: ResetStep) {
  if (mode === "login") {
    return "Log in";
  }

  if (mode === "reset") {
    return resetStep === "verify" ? "Reset password" : "Send reset code";
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

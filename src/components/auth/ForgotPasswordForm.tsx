import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ChevronLeftIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { apiRequest, ApiError } from "../../lib/apiClient";

export default function ForgotPasswordForm() {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [debugResetUrl, setDebugResetUrl] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setDebugResetUrl(null);

    if (token) {
      if (!password || !confirmPassword) {
        setErrorMessage("Please enter and confirm your new password.");
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match.");
        return;
      }

      if (!passwordPattern.test(password)) {
        setErrorMessage(
          "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
        );
        return;
      }

      try {
        setIsSubmitting(true);
        await apiRequest<{ success: boolean }>("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ token, password }),
        });
        setSuccessMessage("Password updated successfully. You can now sign in.");
        setPassword("");
        setConfirmPassword("");
      } catch (error) {
        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Unable to reset password. Please try again.");
        }
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    if (!email.trim()) {
      setErrorMessage("Email is required.");
      return;
    }

    if (!emailPattern.test(email.trim())) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await apiRequest<{
        sent: boolean;
        message?: string;
        debugResetUrl?: string;
      }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      setSuccessMessage(
        "If an account exists for this email, password reset instructions have been sent.",
      );
      setDebugResetUrl(response.data.debugResetUrl ?? null);
      if (response.data.message && !response.data.debugResetUrl) {
        setSuccessMessage(response.data.message);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to process password reset request.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Back to sign in
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            {token ? "Set a new password" : "Reset your password"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {token
              ? "Create a new password for your account."
              : "Enter your account email and we will send password reset instructions."}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5">
            {token ? (
              <>
                <div>
                  <Label>
                    New Password <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label>
                    Confirm Password <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </>
            ) : (
              <div>
                <Label>
                  Email <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            )}

            {errorMessage ? (
              <p className="text-sm text-error-600 dark:text-error-400">{errorMessage}</p>
            ) : null}

            {successMessage ? (
              <p className="text-sm text-success-600 dark:text-success-400">{successMessage}</p>
            ) : null}

            {debugResetUrl ? (
              <p className="text-sm text-brand-600 dark:text-brand-400">
                Development reset link: <a className="underline" href={debugResetUrl}>{debugResetUrl}</a>
              </p>
            ) : null}

            <div>
              <Button className="w-full" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : token ? "Update password" : "Send reset instructions"}
              </Button>
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-400">
              Remember your password?{" "}
              <Link to="/signin" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
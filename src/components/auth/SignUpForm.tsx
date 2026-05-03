import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import { apiRequest } from "../../lib/apiClient";
import { setAuthSession } from "../../lib/auth";

type RegisterResponse = {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: "admin" | "manager" | "viewer";
  };
  accessToken: string;
  refreshToken: string;
};

export default function SignUpForm() {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const hasUppercase = /[A-Z]/;
  const hasLowercase = /[a-z]/;
  const hasNumber = /[0-9]/;
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim() || !company.trim() || !email.trim() || !password) {
      setErrorMessage("Full name, company, email, and password are required.");
      return;
    }

    if (!emailPattern.test(email.trim())) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 8 || !hasUppercase.test(password) || !hasLowercase.test(password) || !hasNumber.test(password)) {
      setErrorMessage(
        "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
      );
      return;
    }

    if (!isChecked) {
      setErrorMessage("Please accept the Terms and Conditions and Privacy Policy to continue.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = await apiRequest<RegisterResponse>(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            password,
          }),
        },
      );

      setAuthSession(payload.data);
      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="w-full max-w-md mx-auto mb-5 sm:pt-10">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Back to InveXa dashboard
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Create your workspace
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Set up InveXa for your team and start tracking stock with Query-Based Demand Insights.
            </p>
          </div>
          <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* Workspace owner */}
                  <div className="sm:col-span-1">
                    <Label>
                      Full Name<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="fullName"
                      name="fullName"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  {/* Company name */}
                  <div className="sm:col-span-1">
                    <Label>
                      Company<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="company"
                      name="company"
                      placeholder="Enter company name"
                      value={company}
                      onChange={(event) => setCompany(event.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                {/* <!-- Email --> */}
                <div>
                  <Label>
                    Email<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                {/* <!-- Password --> */}
                <div>
                  <Label>
                    Password<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={isSubmitting}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>
                {/* <!-- Checkbox --> */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    className="w-5 h-5"
                    checked={isChecked}
                    onChange={setIsChecked}
                    disabled={isSubmitting}
                  />
                  <p className="inline-block font-normal text-gray-500 dark:text-gray-400">
                    By creating a workspace, you agree to the{" "}
                    <Link to="/terms" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
                      Terms and Conditions
                    </Link>{" "}
                    and the{" "}
                    <Link to="/privacy-policy" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
                      Privacy Policy
                    </Link>
                  </p>
                </div>
                {errorMessage ? (
                  <p className="text-sm text-error-600 dark:text-error-400">{errorMessage}</p>
                ) : null}
                {/* <!-- Button --> */}
                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Creating workspace..." : "Create InveXa workspace"}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                Already have an account? {""}
                <Link
                  to="/signin"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

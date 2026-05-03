import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import ForgotPasswordForm from "../../components/auth/ForgotPasswordForm";

export default function ForgotPassword() {
  return (
    <>
      <PageMeta
        title="Reset Password | InveXa"
        description="Request password reset instructions for your InveXa account."
      />
      <AuthLayout>
        <ForgotPasswordForm />
      </AuthLayout>
    </>
  );
}
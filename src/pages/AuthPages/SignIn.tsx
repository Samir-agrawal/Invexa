import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Sign In | InveXa Inventory Management"
        description="Sign in to InveXa to manage inventory, track suppliers, and review Query-Based Demand Insights."
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}

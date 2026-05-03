import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Create Account | InveXa Inventory Management"
        description="Create your InveXa account to organize products, automate stock updates, and review Query-Based Demand Insights."
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}

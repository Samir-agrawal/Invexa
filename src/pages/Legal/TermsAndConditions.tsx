import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

export default function TermsAndConditions() {
  return (
    <div>
      <PageMeta
        title="Terms and Conditions | InveXa"
        description="Basic terms for using the InveXa demo application and its inventory management features."
      />
      <PageBreadcrumb pageTitle="Terms and Conditions" />
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[800px] space-y-6 text-gray-600 dark:text-gray-400">
          <div>
            <p className="text-sm font-medium text-brand-500">Last updated: 20 April 2026</p>
            <h1 className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Terms and Conditions</h1>
          </div>

          <p>
            These terms describe the basic rules for using InveXa. By creating an account or using
            the application, you agree to use it responsibly and follow applicable laws.
          </p>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Acceptable use</h2>
            <p>Do not misuse the app, attempt unauthorized access, or interfere with another user’s workspace or data.</p>
            <p>Use the demo data and features only for legitimate evaluation, testing, or internal workflow review.</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Accounts and access</h2>
            <p>You are responsible for the accuracy of account information you submit and for keeping your login credentials secure.</p>
            <p>InveXa may suspend or remove access if abuse, security risks, or unexpected misuse are detected.</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Data and content</h2>
            <p>You remain responsible for the data you enter into the platform. Demo content, generated records, and seeded data are provided for evaluation purposes.</p>
            <p>If InveXa is deployed in production, organization-specific policies should be added for retention, backup, export, and compliance.</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Changes</h2>
            <p>These terms may be updated as the product evolves. Continuing to use the app after changes means you accept the updated terms.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
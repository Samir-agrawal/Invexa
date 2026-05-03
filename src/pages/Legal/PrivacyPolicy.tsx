import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

export default function PrivacyPolicy() {
  return (
    <div>
      <PageMeta
        title="Privacy Policy | InveXa"
        description="How InveXa collects, uses, stores, and protects account and workspace data."
      />
      <PageBreadcrumb pageTitle="Privacy Policy" />
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[800px] space-y-6 text-gray-600 dark:text-gray-400">
          <div>
            <p className="text-sm font-medium text-brand-500">Last updated: 20 April 2026</p>
            <h1 className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Privacy Policy</h1>
          </div>

          <p>
            InveXa collects the information needed to create accounts, operate workspaces, and
            improve inventory workflows. This page explains the basic data practices for the demo
            application.
          </p>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">What we collect</h2>
            <p>We may collect account details such as your name, email address, company name, and authentication information.</p>
            <p>We also store workspace data you enter or generate while using inventory, supplier, order, and analytics features.</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">How we use it</h2>
            <p>Data is used to authenticate users, provide the application experience, and keep operational records available inside InveXa.</p>
            <p>We may use aggregated usage data to understand performance and improve the product experience.</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">How we protect it</h2>
            <p>Passwords are not stored in plain text. Access tokens are issued for authenticated sessions, and backend routes are protected by authorization checks.</p>
            <p>Local demo data is intended for evaluation and development, not for sensitive production information.</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Your choices</h2>
            <p>If you are using the demo environment, you can stop using the app at any time and clear your local browser session data.</p>
            <p>If this project is adapted for production use, the privacy policy should be expanded to reflect the final hosting, retention, and compliance requirements.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
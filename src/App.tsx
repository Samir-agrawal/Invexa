import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import ForgotPassword from "./pages/AuthPages/ForgotPassword";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Calendar from "./pages/Calendar";
import PrivacyPolicy from "./pages/Legal/PrivacyPolicy";
import TermsAndConditions from "./pages/Legal/TermsAndConditions";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import ModulePage from "./pages/Modules/ModulePage";
import DemandInsights from "./pages/Insights/DemandInsights";
import Reports from "./pages/Insights/Reports";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import Suppliers from "./pages/Suppliers";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicOnlyRoute from "./components/auth/PublicOnlyRoute";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index path="/" element={<Home />} />

            <Route
              path="/inventory"
              element={<Inventory />}
            />
            <Route
              path="/products"
              element={<Products />}
            />
            <Route
              path="/orders"
              element={<Orders />}
            />
            <Route
              path="/suppliers"
              element={<Suppliers />}
            />
            <Route
              path="/demand-insights"
              element={<DemandInsights />}
            />
            <Route
              path="/reports"
              element={<Reports />}
            />
            <Route
              path="/settings"
              element={
                <ModulePage
                  title="Settings"
                  description="Configure workspace preferences, integrations, and automation behavior."
                />
              }
            />

            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />
          </Route>

          {/* Auth Layout */}
          <Route path="/signin" element={<PublicOnlyRoute><SignIn /></PublicOnlyRoute>} />
          <Route path="/signup" element={<PublicOnlyRoute><SignUp /></PublicOnlyRoute>} />
          <Route path="/reset-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsAndConditions />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}

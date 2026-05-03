import { getAuthSession } from "./auth";

export type UserProfile = {
  fullName: string;
  email: string;
  role: string;
  phone: string;
  bio: string;
  avatarUrl: string;
  country: string;
  cityState: string;
  postalCode: string;
  taxId: string;
  facebookUrl: string;
  xUrl: string;
  linkedinUrl: string;
  instagramUrl: string;
};

function getStorageKey() {
  const session = getAuthSession();
  return session?.user?.id ? `user-profile:${session.user.id}` : "user-profile:anonymous";
}

function getDefaultProfile(): UserProfile {
  const session = getAuthSession();
  const role = session?.user.role
    ? `${session.user.role[0].toUpperCase()}${session.user.role.slice(1)}`
    : "User";

  return {
    fullName: session?.user.fullName?.trim() || "InveXa User",
    email: session?.user.email?.trim() || "no-email@invexa.local",
    role,
    phone: "+09 363 398 46",
    bio: role,
    avatarUrl: "/images/user/owner.jpg",
    country: "United States",
    cityState: "Phoenix, Arizona, United States",
    postalCode: "ERT 2489",
    taxId: "AS4568384",
    facebookUrl: "https://www.facebook.com/PimjoHQ",
    xUrl: "https://x.com/PimjoHQ",
    linkedinUrl: "https://www.linkedin.com/company/pimjo",
    instagramUrl: "https://instagram.com/PimjoHQ",
  };
}

export function getUserProfile(): UserProfile {
  if (typeof window === "undefined") {
    return getDefaultProfile();
  }

  const defaults = getDefaultProfile();
  const raw = window.localStorage.getItem(getStorageKey());
  if (!raw) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function saveUserProfile(profile: UserProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getStorageKey(), JSON.stringify(profile));
  window.dispatchEvent(new Event("invexa-profile-updated"));
}
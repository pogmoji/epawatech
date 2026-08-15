export const appRoles = ["admin", "trainer", "student"] as const;
export const profileStatuses = [
  "pending",
  "active",
  "suspended",
  "rejected",
] as const;

export type AppRole = (typeof appRoles)[number];
export type ProfileStatus = (typeof profileStatuses)[number];

export type Profile = {
  id: string;
  full_name: string;
  username: string | null;
  phone_number: string | null;
  role: AppRole;
  status: ProfileStatus;
};

export const studentUsernamePattern = /^[A-Z][A-Z0-9-]{2,29}$/;

export function normalizeStudentUsername(username: string) {
  return username.trim().toUpperCase();
}

export function isValidStudentUsername(username: string) {
  return studentUsernamePattern.test(normalizeStudentUsername(username));
}

export function studentUsernameAuthEmail(username: string) {
  return `${normalizeStudentUsername(username).toLowerCase()}@students.ePawatech.invalid`;
}

export const phoneNumberPattern = /^\+[1-9][0-9]{7,14}$/;

export function normalizePhoneNumber(phoneNumber: string) {
  return phoneNumber.trim().replace(/[\s()-]/g, "");
}

export function isValidPhoneNumber(phoneNumber: string) {
  return phoneNumberPattern.test(normalizePhoneNumber(phoneNumber));
}

export function dashboardPath(profile: Pick<Profile, "role">) {
  return `/${profile.role}`;
}

export function profileStatusMessage(profile: Pick<Profile, "role" | "status">) {
  if (profile.status === "active") return null;

  if (profile.role === "trainer" && profile.status === "pending") {
    return "Your trainer account is awaiting admin approval. You can sign out or return after your access is approved.";
  }

  if (profile.status === "suspended") {
    return "This account has been suspended. Please contact an administrator for help.";
  }

  return "This account has not been approved. Please contact an administrator for help.";
}

export function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "The email or student username, or password, is incorrect.";
  }
  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "An account already exists for this email. Try signing in instead.";
  }
  if (normalized.includes("email") && normalized.includes("invalid")) {
    return "Enter a valid email address or student username.";
  }
  if (normalized.includes("password")) {
    return "Choose a password with at least 6 characters.";
  }

  return "We could not complete that request. Please try again.";
}

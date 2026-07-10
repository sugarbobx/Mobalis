"use client";

import { createContext, useContext } from "react";

export interface CurrentUser {
  id: string;
  nom: string;
  prenom: string;
}

const CurrentUserContext = createContext<CurrentUser | null>(null);

export function CurrentUserProvider({ value, children }: { value: CurrentUser; children: React.ReactNode }) {
  return <CurrentUserContext value={value}>{children}</CurrentUserContext>;
}

// Each role layout (admin/tutor/parent/student) resolves the signed-in
// user's own profile row server-side and provides it here — pages read
// "who am I" from this instead of a hardcoded id.
export function useCurrentUser(): CurrentUser {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error("useCurrentUser() must be called under a role layout (admin/tutor/parent/student)");
  return ctx;
}

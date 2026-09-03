/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pain-Pal Authentication Hook
 * Manages Firebase User session, token retrieval, and Google SSO actions.
 */

import { useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, signInWithGoogle, logout } from "../firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      setAuthError(null);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user") {
        setAuthError("Sign-in popup was closed before completion.");
      } else if (err?.code === "auth/popup-blocked") {
        setAuthError("Sign-in popup was blocked by browser. Please enable popups for this site.");
      } else {
        setAuthError("Could not sign in with Google. Please try again.");
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (err: any) {
      console.error("Sign-out error:", err);
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null;
    return user.getIdToken();
  };

  return {
    user,
    loading,
    authError,
    setAuthError,
    signIn: handleSignIn,
    signOut: handleSignOut,
    getIdToken
  };
}

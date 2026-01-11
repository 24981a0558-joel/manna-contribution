import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, USER_ROLES } from "../config/firebase";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Fetch user role from Firestore
        try {
          const userDoc = await getDoc(
            doc(db, "authorizedUsers", currentUser.email)
          );
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role || USER_ROLES.ADMIN);
          } else {
            // Default role for new users - ADMIN for now (change to VIEWER in production)
            setUserRole(USER_ROLES.ADMIN);
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
          setUserRole(USER_ROLES.ADMIN);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = userRole === USER_ROLES.ADMIN;
  const isEditor =
    userRole === USER_ROLES.EDITOR || userRole === USER_ROLES.ADMIN;
  const canEdit = isEditor;
  const canDelete = isAdmin;
  const canManageUsers = isAdmin;

  const value = {
    user,
    currentUser: user, // Alias for compatibility
    userRole,
    loading,
    isAdmin,
    isEditor,
    canEdit,
    canDelete,
    canManageUsers,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

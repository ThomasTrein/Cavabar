"use client";

import { useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
      const lightTheme = snap.exists() ? snap.data()?.lightTheme === true : false;
      if (lightTheme) {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      } else {
        document.documentElement.classList.remove("light");
        document.documentElement.classList.add("dark");
      }
    });
    return () => unsub();
  }, []);

  return <>{children}</>;
}

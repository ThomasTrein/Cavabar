"use client";

import { useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    function pasThemaToe(lightTheme: boolean) {
      if (lightTheme) {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      } else {
        document.documentElement.classList.remove("light");
        document.documentElement.classList.add("dark");
      }
    }

    const unsub = onSnapshot(
      doc(db, "settings", "global"),
      (snap) => {
        const lightTheme = snap.exists() ? snap.data()?.lightTheme === true : false;
        pasThemaToe(lightTheme);
      },
      (error) => {
        // Permission issues on settings should not break the app; fall back to dark theme.
        if (error.code === "permission-denied") {
          console.warn("Geen leesrechten op settings/global. Donker thema als fallback.");
          pasThemaToe(false);
          return;
        }
        console.error("Thema listener fout:", error);
      }
    );
    return () => unsub();
  }, []);

  return <>{children}</>;
}

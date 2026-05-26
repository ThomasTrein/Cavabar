"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface AlertOptions {
  title: string;
  message: string;
}

interface ModalContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
}

const ModalContext = createContext<ModalContextType>({
  confirm: async () => false,
  alert: async () => {},
});

export function useModal() {
  return useContext(ModalContext);
}

type ModalState =
  | { type: "confirm"; options: ConfirmOptions; resolve: (val: boolean) => void }
  | { type: "alert"; options: AlertOptions; resolve: () => void }
  | null;

export default function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalState>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModal({ type: "confirm", options, resolve });
    });
  }, []);

  const alert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setModal({ type: "alert", options, resolve });
    });
  }, []);

  function sluiten(result?: boolean) {
    if (!modal) return;
    if (modal.type === "confirm") modal.resolve(result ?? false);
    else modal.resolve();
    setModal(null);
  }

  return (
    <ModalContext.Provider value={{ confirm, alert }}>
      {children}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) sluiten(false); }}
        >
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4">
            <h3 className="text-white font-bold text-lg">{modal.options.title}</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{modal.options.message}</p>
            {modal.type === "confirm" ? (
              <div className="flex gap-3">
                <button
                  onClick={() => sluiten(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl transition"
                >
                  {modal.options.cancelLabel ?? "Annuleren"}
                </button>
                <button
                  onClick={() => sluiten(true)}
                  className={`flex-1 font-bold py-3 rounded-xl transition text-white ${
                    modal.options.danger
                      ? "bg-red-600 hover:bg-red-500"
                      : "bg-green-600 hover:bg-green-500"
                  }`}
                >
                  {modal.options.confirmLabel ?? "Bevestigen"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => sluiten()}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition"
              >
                OK
              </button>
            )}
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

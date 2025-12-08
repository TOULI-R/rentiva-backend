import React, { createContext, useCallback, useContext, useState } from "react";

type NotificationType = "success" | "error" | "info";

interface Notification {
  id: number;
  type: NotificationType;
  message: string;
}

interface NotificationsContextValue {
  notify: (message: string, type?: NotificationType) => void;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Notification[]>([]);

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((n) => n.id !== id));
  }, []);

  const push = useCallback(
    (message: string, type: NotificationType = "info") => {
      if (!message) return;
      const id = Date.now() + Math.random();
      setItems((current) => [...current, { id, type, message }]);
      // αυτόματο κλείσιμο μετά από 4"
      setTimeout(() => remove(id), 4000);
    },
    [remove]
  );

  const value: NotificationsContextValue = {
    notify: push,
    notifySuccess: (msg) => push(msg, "success"),
    notifyError: (msg) => push(msg, "error"),
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      {/* Container για τα toasts */}
      <div className="fixed inset-x-0 top-4 z-50 flex justify-center pointer-events-none">
        <div className="w-full max-w-md px-4 space-y-2">
          {items.map((n) => (
            <div
              key={n.id}
              className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-md ${
                n.type === "success"
                  ? "bg-green-50 border-green-200 text-green-900"
                  : n.type === "error"
                  ? "bg-red-50 border-red-200 text-red-900"
                  : "bg-slate-50 border-slate-200 text-slate-900"
              }`}
            >
              {n.message}
            </div>
          ))}
        </div>
      </div>
    </NotificationsContext.Provider>
  );
};

export const useNotifications = (): NotificationsContextValue => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
};

// Alias για παλιό κώδικα που κάνει import useNotification
export const useNotification = (): NotificationsContextValue => {
  return useNotifications();
};

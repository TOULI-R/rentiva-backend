import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type NotificationType = "success" | "error";

type NotificationItem = {
  id: number;
  type: NotificationType;
  message: string;
};

type NotificationContextValue = {
  notifySuccess: (msg: string) => void;
  notifyError: (msg: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const push = useCallback(
    (type: NotificationType, message: string) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, type, message }]);
      // auto-hide μετά από 3 δευτερόλεπτα
      setTimeout(() => remove(id), 3000);
    },
    [remove]
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifySuccess: (msg: string) => push("success", msg),
      notifyError: (msg: string) => push("error", msg),
    }),
    [push]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-xs">
        {items.map((n) => (
          <div
            key={n.id}
            className={`rounded-lg px-3 py-2 text-sm shadow-md cursor-pointer ${
              n.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
            }`}
            onClick={() => remove(n.id)}
          >
            {n.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return ctx;
}

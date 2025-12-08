import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type NotificationType = "success" | "error" | "info";

export interface NotificationState {
  type: NotificationType;
  message: string;
}

interface NotificationContextValue {
  notification: NotificationState | null;
  notifySuccess: (msg: string) => void;
  notifyError: (msg: string) => void;
  notifyInfo: (msg: string) => void;
  clear: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<NotificationState | null>(
    null
  );

  const show = useCallback((type: NotificationType, message: string) => {
    setNotification({ type, message });
  }, []);

  const notifySuccess = useCallback(
    (msg: string) => show("success", msg),
    [show]
  );
  const notifyError = useCallback(
    (msg: string) => show("error", msg),
    [show]
  );
  const notifyInfo = useCallback(
    (msg: string) => show("info", msg),
    [show]
  );

  useEffect(() => {
    if (!notification) return;
    const id = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(id);
  }, [notification]);

  const clear = () => setNotification(null);

  return (
    <NotificationContext.Provider
      value={{ notification, notifySuccess, notifyError, notifyInfo, clear }}
    >
      {children}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={
              "rounded-xl px-4 py-2 shadow-lg text-sm text-white " +
              (notification.type === "success"
                ? "bg-emerald-600"
                : notification.type === "error"
                ? "bg-red-600"
                : "bg-gray-800")
            }
          >
            {notification.message}
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return ctx;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type NotificationType = "success" | "error";

type NotificationItem = {
  id: number;
  type: NotificationType;
  message: string;
  count: number;
};

type NotificationContextValue = {
  notifySuccess: (msg: string) => void;
  notifyError: (msg: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

const TIMEOUT_MS: Record<NotificationType, number> = {
  success: 2500,
  error: 4500,
};

const DEDUPE_WINDOW_MS = 1500;
const MAX_TOASTS = 4;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);

  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const lastPush = useRef<{
    type: NotificationType;
    message: string;
    at: number;
    id: number;
  } | null>(null);

  const clearTimer = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const remove = useCallback(
    (id: number) => {
      clearTimer(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    },
    [clearTimer]
  );

  const scheduleRemove = useCallback(
    (id: number, ms: number) => {
      clearTimer(id);
      const t = setTimeout(() => remove(id), ms);
      timers.current.set(id, t);
    },
    [remove, clearTimer]
  );

  const push = useCallback(
    (type: NotificationType, message: string) => {
      const now = Date.now();
      const last = lastPush.current;

      // Dedupe: ίδιο type+message μέσα σε μικρό window => αύξηση count + reset timer
      if (
        last &&
        last.type === type &&
        last.message === message &&
        now - last.at <= DEDUPE_WINDOW_MS
      ) {
        const id = last.id;
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, count: i.count + 1 } : i))
        );
        lastPush.current = { type, message, at: now, id };
        scheduleRemove(id, TIMEOUT_MS[type]);
        return;
      }

      const id = now + Math.floor(Math.random() * 1000);

      setItems((prev) => {
        const next = [...prev, { id, type, message, count: 1 }];
        // cap αριθμού toasts (για να μη γίνει “χριστουγεννιάτικο δέντρο”)
        if (next.length > MAX_TOASTS) {
          const removed = next.shift();
          if (removed) clearTimer(removed.id);
        }
        return next;
      });

      lastPush.current = { type, message, at: now, id };
      scheduleRemove(id, TIMEOUT_MS[type]);
    },
    [scheduleRemove, clearTimer]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
    };
  }, []);

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

      {/* Toast container (mobile: top-center, desktop: bottom-right) */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-sm space-y-2 sm:top-auto sm:bottom-4 sm:left-auto sm:right-4 sm:translate-x-0">
        {items.map((n) => (
          <div
            key={n.id}
            role={n.type === "error" ? "alert" : "status"}
            aria-live={n.type === "error" ? "assertive" : "polite"}
            className={`relative rounded-xl px-4 py-3 text-sm shadow-lg border cursor-pointer select-none ${
              n.type === "success"
                ? "bg-emerald-600/95 text-white border-emerald-700"
                : "bg-red-600/95 text-white border-red-700"
            }`}
            onClick={() => remove(n.id)}
            title="Κλικ για κλείσιμο"
          >
            <div className="flex items-start gap-3">
              <div className="font-semibold">
                {n.type === "success" ? "ΟΚ" : "Σφάλμα"}
              </div>

              <div className="flex-1 leading-snug">{n.message}</div>

              {n.count > 1 && (
                <div className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                  x{n.count}
                </div>
              )}

              <button
                type="button"
                className="ml-1 shrink-0 rounded-md px-2 py-1 text-white/90 hover:text-white hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(n.id);
                }}
                aria-label="Κλείσιμο"
              >
                ✕
              </button>
            </div>
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

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

type NotificationType = "success" | "error" | "info" | "loading";

type NotificationItem = {
  id: number;
  type: NotificationType;
  message: string;
  count: number;
  createdAt: number;
  updatedAt: number;
  persist: boolean;
};

type NotifyOptions = {
  key?: string;          // σταθερό key για upsert (π.χ. loading toast)
  persist?: boolean;     // αν true, δεν κάνει auto-dismiss
  durationMs?: number;   // override duration
};

type UpdateOptions = {
  type?: NotificationType;
  message?: string;
  persist?: boolean;
  durationMs?: number;
};

type NotificationContextValue = {
  notifySuccess: (msg: string, opts?: NotifyOptions) => number;
  notifyError: (msg: string, opts?: NotifyOptions) => number;
  notifyInfo: (msg: string, opts?: NotifyOptions) => number;
  notifyLoading: (msg: string, opts?: NotifyOptions) => number;
  updateToast: (id: number, patch: UpdateOptions) => void;
  dismiss: (id: number) => void;
  dismissAll: () => void;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

const TIMEOUT_MS: Record<NotificationType, number> = {
  success: 2500,
  info: 2800,
  error: 4500,
  loading: 0, // persist από default
};

const DEDUPE_WINDOW_MS = 1500;
const MAX_TOASTS = 4;

function labelForType(t: NotificationType) {
  if (t === "success") return "ΟΚ";
  if (t === "error") return "Σφάλμα";
  if (t === "info") return "Info";
  return "Φόρτωση";
}

function classesForType(t: NotificationType) {
  if (t === "success") return "bg-emerald-600/95 text-white border-emerald-700";
  if (t === "error") return "bg-red-600/95 text-white border-red-700";
  if (t === "info") return "bg-slate-800/95 text-white border-slate-900";
  return "bg-slate-900/95 text-white border-slate-950";
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);

  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const dedupe = useRef(new Map<string, { id: number; at: number }>());
  const keyToId = useRef(new Map<string, number>());
  const seq = useRef(1);

  const clearTimer = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const purgeRefsForId = useCallback((id: number) => {
    // καθάρισμα dedupe refs
    for (const [k, v] of dedupe.current.entries()) {
      if (v.id === id) dedupe.current.delete(k);
    }
    // καθάρισμα key refs
    for (const [k, v] of keyToId.current.entries()) {
      if (v === id) keyToId.current.delete(k);
    }
  }, []);

  const dismiss = useCallback(
    (id: number) => {
      clearTimer(id);
      purgeRefsForId(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    },
    [clearTimer, purgeRefsForId]
  );

  const dismissAll = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current.clear();
    dedupe.current.clear();
    keyToId.current.clear();
    setItems([]);
  }, []);

  const scheduleRemove = useCallback(
    (id: number, ms: number) => {
      if (!ms || ms <= 0) return;
      clearTimer(id);
      const t = setTimeout(() => dismiss(id), ms);
      timers.current.set(id, t);
    },
    [dismiss, clearTimer]
  );

  const capToasts = useCallback(
    (arr: NotificationItem[]) => {
      const next = [...arr];

      while (next.length > MAX_TOASTS) {
        // προτίμηση: βγάζουμε πρώτα non-loading & non-persist
        let idx = next.findIndex((n) => n.type !== "loading" && !n.persist);
        if (idx === -1) idx = next.findIndex((n) => n.type !== "loading");
        if (idx === -1) idx = 0;

        const removed = next.splice(idx, 1)[0];
        if (removed) {
          clearTimer(removed.id);
          purgeRefsForId(removed.id);
        }
      }

      return next;
    },
    [clearTimer, purgeRefsForId]
  );

  const emit = useCallback(
    (type: NotificationType, message: string, opts: NotifyOptions = {}) => {
      const now = Date.now();

      const persist = opts.persist ?? (type === "loading");
      const duration = opts.durationMs ?? TIMEOUT_MS[type];

      const dedupeKey = `${type}:${message}`;

      // 1) Upsert by key (ιδανικό για loading -> success/error update)
      if (opts.key) {
        const existingId = keyToId.current.get(opts.key);
        if (existingId) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === existingId
                ? {
                    ...i,
                    type,
                    message,
                    persist,
                    updatedAt: now,
                  }
                : i
            )
          );

          dedupe.current.set(dedupeKey, { id: existingId, at: now });

          if (persist) clearTimer(existingId);
          else scheduleRemove(existingId, duration);

          return existingId;
        }
      }

      // 2) Dedupe: ίδιο type+message μέσα σε μικρό window -> count++ + reset timer
      const last = dedupe.current.get(dedupeKey);
      if (last && now - last.at <= DEDUPE_WINDOW_MS) {
        const id = last.id;

        setItems((prev) => {
          const exists = prev.some((i) => i.id === id);
          if (!exists) return prev;
          return prev.map((i) =>
            i.id === id ? { ...i, count: i.count + 1, updatedAt: now } : i
          );
        });

        dedupe.current.set(dedupeKey, { id, at: now });

        if (!persist) scheduleRemove(id, duration);

        return id;
      }

      // 3) Create new
      const id = seq.current++;
      const item: NotificationItem = {
        id,
        type,
        message,
        count: 1,
        createdAt: now,
        updatedAt: now,
        persist,
      };

      setItems((prev) => capToasts([...prev, item]));

      if (opts.key) keyToId.current.set(opts.key, id);
      dedupe.current.set(dedupeKey, { id, at: now });

      if (!persist) scheduleRemove(id, duration);

      return id;
    },
    [scheduleRemove, clearTimer, capToasts]
  );

  const updateToast = useCallback(
    (id: number, patch: UpdateOptions) => {
      const now = Date.now();

      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i;

          const nextType = patch.type ?? i.type;
          const nextPersist = patch.persist ?? (nextType === "loading");
          const nextMsg = patch.message ?? i.message;

          return {
            ...i,
            type: nextType,
            message: nextMsg,
            persist: nextPersist,
            updatedAt: now,
          };
        })
      );

      // Timer management (best-effort)
      const nextType = patch.type ?? "success";
      const nextPersist = patch.persist ?? (nextType === "loading");
      const duration = patch.durationMs ?? TIMEOUT_MS[nextType];

      if (nextPersist) clearTimer(id);
      else scheduleRemove(id, duration);
    },
    [clearTimer, scheduleRemove]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
      dedupe.current.clear();
      keyToId.current.clear();
    };
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifySuccess: (msg: string, opts?: NotifyOptions) =>
        emit("success", msg, opts),
      notifyError: (msg: string, opts?: NotifyOptions) => emit("error", msg, opts),
      notifyInfo: (msg: string, opts?: NotifyOptions) => emit("info", msg, opts),
      notifyLoading: (msg: string, opts?: NotifyOptions) =>
        emit("loading", msg, { ...opts, persist: opts?.persist ?? true }),
      updateToast,
      dismiss,
      dismissAll,
    }),
    [emit, updateToast, dismiss, dismissAll]
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
            className={`relative rounded-xl px-4 py-3 text-sm shadow-lg border cursor-pointer select-none ${classesForType(
              n.type
            )}`}
            onClick={() => dismiss(n.id)}
            title="Κλικ για κλείσιμο"
          >
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-2 font-semibold">
                {n.type === "loading" && (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                )}
                <span>{labelForType(n.type)}</span>
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
                  dismiss(n.id);
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

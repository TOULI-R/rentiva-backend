import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import api, {
type Property,
  type PropertyEvent,
  type PropertyEventKind,
  type HeatingType,
  type EnergyClass,
  type ParkingType,
  type FurnishedType,
  type TenantPrefsV1,
  type TenantAnswersV1,
  type CompatibilityResultV1,
}
from "../lib/api";
import { useNotification } from "../lib/notifications";

function formatNumber(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return String(n);
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("el-GR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayKey(iso?: string | null): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  // local date (so "Σήμερα/Χθες" matches user's timezone)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function groupLabelFromDayKey(key: string): string {
  if (key === "unknown") return "Άγνωστη ημερομηνία";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const d = new Date(key + "T00:00:00");
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (dd.getTime() === today.getTime()) return "Σήμερα";
  if (dd.getTime() === yesterday.getTime()) return "Χθες";

  return dd.toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}


function highlightText(text: string, q: string): ReactNode[] {
  const query = q.trim();
  if (query.length < 2) return [text];
  const lower = text.toLowerCase();
  const ql = query.toLowerCase();

  const out: ReactNode[] = [];
  let i = 0;
  let hit = 0;

  while (i < text.length) {
    const idx = lower.indexOf(ql, i);
    if (idx === -1) {
      out.push(text.slice(i));
      break;
    }
    if (idx > i) out.push(text.slice(i, idx));
    out.push(
      <mark
        key={"h-" + hit++}
        className="rounded bg-yellow-100 px-0.5 text-gray-900"
      >
        {text.slice(idx, idx + query.length)}
      </mark>
    );
    i = idx + query.length;
  }

  return out.length ? out : [text];
}


const heatingLabels: Record<HeatingType, string> = {
  none: "Χωρίς θέρμανση",
  central_oil: "Κεντρική πετρέλαιο",
  central_gas: "Κεντρική φυσικό αέριο",
  autonomous_gas: "Ατομική φυσικό αέριο",
  autonomous_oil: "Ατομική πετρέλαιο",
  heat_pump: "Αντλία θερμότητας",
  electric: "Ηλεκτρική / A/C",
  other: "Άλλη θέρμανση",
};

const parkingLabels: Record<ParkingType, string> = {
  none: "Χωρίς parking",
  street: "Στάθμευση στο δρόμο",
  open: "Θέση parking (ανοιχτή)",
  closed: "Κλειστή θέση parking",
  garage: "Ιδιωτικό γκαράζ",
};

const furnishedLabels: Record<FurnishedType, string> = {
  none: "Μη επιπλωμένο",
  partial: "Μερικώς επιπλωμένο",
  full: "Πλήρως επιπλωμένο",
};

function getHeatingLabel(type?: HeatingType): string {
  if (!type) return "—";
  return heatingLabels[type] ?? "—";
}

function getParkingLabel(type?: ParkingType): string {
  if (!type) return "—";
  return parkingLabels[type] ?? "—";
}

function getFurnishedLabel(type?: FurnishedType): string {
  if (!type || type === "none") return "Μη επιπλωμένο";
  return furnishedLabels[type] ?? "Μη επιπλωμένο";
}

export default function PropertyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [timelineFilter, setTimelineFilter] = useState<"all" | "note" | "updated">(() => {
    const tf = searchParams.get("tf");
    return tf === "note" || tf === "updated" ? tf : "all";
  });

  const [timelineQuery, setTimelineQuery] = useState(() => searchParams.get("tq") || "");

  // sync timeline controls from URL (refresh + back/forward)
  useEffect(() => {
    const tf = searchParams.get("tf");
    const nextTf: "all" | "note" | "updated" =
      tf === "note" || tf === "updated" ? tf : "all";
    const nextTq = searchParams.get("tq") || "";

    if (nextTf !== timelineFilter) setTimelineFilter(nextTf);
    if (nextTq !== timelineQuery) setTimelineQuery(nextTq);
  }, [searchParams]); 

  // sync timeline controls to URL (so refresh keeps state)
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tf", timelineFilter);

      const q = timelineQuery.trim();
      if (q) next.set("tq", q);
      else next.delete("tq");

      return next;
    }, { replace: true });
  }, [timelineFilter, timelineQuery, setSearchParams]);
  const { notifyError, notifySuccess } = useNotification();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  
  const [shareKey, setShareKey] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);

  const effectiveShareKey = shareKey || property?.shareKey || null;

  const shareUrl = effectiveShareKey
    ? `${window.location.origin}/tairiazoume/${effectiveShareKey}`
    : "";

  
  const [prefsDraft, setPrefsDraft] = useState<TenantPrefsV1>({});
  const [prefsSaving, setPrefsSaving] = useState(false);

  // Compatibility quick test (internal)
  const [compatOpen, setCompatOpen] = useState(false);
  const [tenantDraft, setTenantDraft] = useState<TenantAnswersV1>({});
  const [compatBusy, setCompatBusy] = useState(false);
  const [compatResult, setCompatResult] = useState<CompatibilityResultV1 | null>(null);

  // Modal scroll lock
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    if (compatOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [compatOpen]);


  const onOpenCompatModal = () => {
    setCompatResult(null);

    // Prefill με "λογικές" τιμές από owner prefs (αν υπάρχουν)
    const owner: any = (property as any)?.tenantPrefs || {};

    const smoking =
      owner.smoking === "yes" || owner.smoking === "no" ? (owner.smoking as any) : undefined;
    const pets =
      owner.pets === "yes" || owner.pets === "no" ? (owner.pets as any) : undefined;

    const usage = Array.isArray(owner.usage) && owner.usage.length ? owner.usage : undefined;

    const quietHoursAfter =
      typeof owner.quietHoursAfter === "number" ? owner.quietHoursAfter : undefined;

    // Default occupants: αν έχει maxOccupants, βάλε κάτι "λογικό" (<=2), αλλιώς άφησε κενό
    const occupants =
      typeof owner.maxOccupants === "number"
        ? Math.max(1, Math.min(2, owner.maxOccupants))
        : undefined;

    setTenantDraft({
      smoking,
      pets,
      usage,
      quietHoursAfter,
      occupants,
    });

    setCompatOpen(true);
  };

  const onRunCompatibilityTest = async () => {
    if (!id) return;
    if (!hasTenantPrefs) {
      notifyError("Δεν έχουν οριστεί προτιμήσεις ιδιοκτήτη ακόμα.");
      return;
    }

    try {
      setCompatBusy(true);
      const payload: TenantAnswersV1 = {
        smoking: tenantDraft.smoking,
        pets: tenantDraft.pets,
        usage: Array.isArray(tenantDraft.usage) ? tenantDraft.usage : undefined,
        quietHoursAfter:
          tenantDraft.quietHoursAfter == null || tenantDraft.quietHoursAfter === ("" as any)
            ? undefined
            : Number(tenantDraft.quietHoursAfter),
        occupants:
          tenantDraft.occupants == null || tenantDraft.occupants === ("" as any)
            ? undefined
            : Number(tenantDraft.occupants),
      };

      const res = await api.checkCompatibility(id, payload);
      setCompatResult(res);
      notifySuccess("Έγινε έλεγχος compatibility.");
    } catch (e: any) {
      notifyError(e?.message || "Αποτυχία ελέγχου compatibility.");
    } finally {
      setCompatBusy(false);
    }
  };

  const onResetCompatibilityTest = () => {
    setTenantDraft({});
    setCompatResult(null);
  };


  const hasTenantPrefs = (() => {
    const tp: any = property?.tenantPrefs;
    if (!tp) return false;
    const keys = Object.keys(tp).filter((k) => k !== "updatedAt");
    return keys.length > 0;
  })();

  useEffect(() => {
    setShareKey(property?.shareKey ?? null);

    const tp: any = property?.tenantPrefs || {};
    setPrefsDraft({
      smoking: tp.smoking,
      pets: tp.pets,
      usage: Array.isArray(tp.usage) ? tp.usage : undefined,
      quietHoursAfter: tp.quietHoursAfter ?? null,
      quietHoursStrict: !!tp.quietHoursStrict,
      maxOccupants: tp.maxOccupants ?? null,
    });
}, [property?._id]);

  const onSaveTenantPrefs = async () => {
    if (!id) return;

    try {
      setPrefsSaving(true);

      const usageArr = Array.isArray(prefsDraft.usage) ? prefsDraft.usage : [];
      const payload: TenantPrefsV1 = {
        ...prefsDraft,
        usage: usageArr.length ? usageArr : undefined,
quietHoursAfter:
          prefsDraft.quietHoursAfter == null ? null : Number(prefsDraft.quietHoursAfter),
        maxOccupants:
          prefsDraft.maxOccupants == null ? null : Number(prefsDraft.maxOccupants),
      };

      const res = await api.updateTenantPrefs(id, payload);
      setProperty((prev) => (prev ? { ...prev, tenantPrefs: res.tenantPrefs } : prev));
      notifySuccess("Αποθηκεύτηκαν τα Προτιμήσεις Ιδιοκτήτη.");
    } catch (e: any) {
      notifyError(e?.message || "Αποτυχία αποθήκευσης prefs.");
    } finally {
      setPrefsSaving(false);
    }
  };
const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  };

  const ensureShareKey = async (opts?: { rotate?: boolean }) => {
    if (!id) return null;
    const res = await api.getShareKey(id, opts);
    const next = res.shareKey;
    setShareKey(next);
    setProperty((prev) => (prev ? { ...prev, shareKey: next } : prev));
    return next;
  };

  const onGenerateOrCopyShareLink = async () => {
    try {
      setShareBusy(true);

      const sk = effectiveShareKey ?? (await ensureShareKey());
      if (!sk) return;

      const url = `${window.location.origin}/tairiazoume/${sk}`;
      const ok = await copyText(url);

      if (ok) notifySuccess("Αντιγράφηκε το share link.");
      else {
        notifyError("Το browser μπλόκαρε την αντιγραφή. Αντιγραφή χειροκίνητα από το πεδίο.");
        try { window.prompt("Αντιγραφή link:", url); } catch {}
      }
    } catch (e: any) {
      notifyError(e?.message || "Αποτυχία δημιουργίας share link.");
    } finally {
      setShareBusy(false);
    }
  };

  const onΆνοιγμαPublicCompatibility = async () => {
    try {
      setShareBusy(true);

      const sk = effectiveShareKey ?? (await ensureShareKey());
      if (!sk) return;

      const url = `${window.location.origin}/tairiazoume/${sk}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      notifyError(e?.message || "Αποτυχία ανοίγματος public σελίδας.");
    } finally {
      setShareBusy(false);
    }
  };

  const onRotateShareLink = async () => {
    try {
      setShareBusy(true);

      const sk = await ensureShareKey({ rotate: true });
      if (!sk) return;

      const url = `${window.location.origin}/tairiazoume/${sk}`;
      const ok = await copyText(url);

      if (ok) notifySuccess("Έγινε rotate και αντιγράφηκε το νέο link.");
      else notifySuccess("Έγινε rotate το link.");
    } catch (e: any) {
      notifyError(e?.message || "Αποτυχία rotate share link.");
    } finally {
      setShareBusy(false);
    }
  };

const [events, setEvents] = useState<PropertyEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsLoadingMore, setEventsLoadingMore] = useState(false);
  const [eventsNextBefore, setEventsNextBefore] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [noteTitle, setΌχιteTitle] = useState("");
  const [noteMessage, setΌχιteMessage] = useState("");
  const [noteSaving, setΌχιteSaving] = useState(false);
  const [noteSaved, setΌχιteSaved] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const filteredEvents = events;


  useEffect(() => {
    const keys: string[] = [];
    for (const ev of filteredEvents) {
      const k = dayKey(ev.createdAt);
      if (keys[keys.length - 1] !== k) keys.push(k);
    }

    setCollapsedGroups(() => {
      const next: Record<string, boolean> = {};
      keys.forEach((k, i) => (next[k] = i !== 0));
      return next;
    });
  }, [timelineFilter, filteredEvents.length]);

  useEffect(() => {
    if (!id) {
      notifyError("Δεν βρέθηκε ID ακινήτου.");
      navigate("/properties");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const p = await api.getProperty(id);
        if (!cancelled) {
          setProperty(p);
        }
      } catch (e: any) {
        if (!cancelled) {
          notifyError(e?.message || "Αποτυχία φόρτωσης ακινήτου.");
          navigate("/properties");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, navigate, notifyError]);

  
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const serverKind =
      timelineFilter === "note"
        ? "note"
        : timelineFilter === "updated"
        ? "created,updated,deleted,restored"
        : "";

    const serverQ = timelineQuery.trim();

    setEventsLoading(true);
    setEventsError(null);

    (async () => {
      try {
        const res = await api.listPropertyEvents(id, {
          limit: 30,
          kind: serverKind || undefined,
          q: serverQ || undefined,
        });

        if (!cancelled) {
          setEvents(res.items);
          setEventsNextBefore(res.nextBefore ?? null);
        }
      } catch (e: any) {
        if (!cancelled)
          setEventsError((e as any)?.message || "Αποτυχία φόρτωσης timeline.");
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, timelineFilter, timelineQuery]);

  const loadMoreEvents = async () => {
    if (!id) return;
    if (!eventsNextBefore) return;
    if (eventsLoadingMore) return;

    const serverKind =
      timelineFilter === "note"
        ? "note"
        : timelineFilter === "updated"
        ? "created,updated,deleted,restored"
        : "";

    const serverQ = timelineQuery.trim();

    setEventsLoadingMore(true);
    setEventsError(null);

    try {
      const res = await api.listPropertyEvents(id, {
        limit: 30,
        kind: serverKind || undefined,
        q: serverQ || undefined,
        before: eventsNextBefore,
      });

      setEvents((prev) => [...prev, ...res.items]);
      setEventsNextBefore(res.nextBefore ?? null);
    } catch (e: any) {
      setEventsError((e as any)?.message || "Αποτυχία φόρτωσης παλαιότερων events.");
    } finally {
      setEventsLoadingMore(false);
    }
  };
if (loading) {

  return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-6">
          <div className="animate-pulse bg-white rounded-xl shadow h-48" />
        </main>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
          <button
            type="button"
            onClick={() => navigate("/properties")}
            className="text-sm text-gray-600 hover:underline"
          >
            ← Επιστροφή στη λίστα
          </button>
          <div className="bg-white rounded-xl shadow p-4 text-sm text-gray-700">
            Δεν βρέθηκε το ακίνητο.
          </div>
        </main>
      </div>
    );
  }

  const p = property;
  const isDeleted = !!p.deletedAt;

  const baseRent =
    typeof p.rent === "number" && !Number.isNaN(p.rent) ? p.rent : null;
  const commonCharges =
    typeof p.commonCharges === "number" && !Number.isNaN(p.commonCharges)
      ? p.commonCharges
      : null;
  const otherFixed =
    typeof p.otherFixedCosts === "number" && !Number.isNaN(p.otherFixedCosts)
      ? p.otherFixedCosts
      : null;

  let approxTotal: number | null = null;
  if (baseRent !== null) {
    approxTotal =
      baseRent + (commonCharges ?? 0) + (otherFixed ?? 0);
  }

  const heatingLabel = getHeatingLabel(p.heatingType);
  const parkingLabel = getParkingLabel(p.parking);
  const furnishedLabel = getFurnishedLabel(p.furnished);
  const kindLabel = (kind: PropertyEventKind): string => {
    switch (kind) {
      case "created":
        return "Δημιουργήθηκε";
      case "updated":
        return "Ενημερώθηκε";
      case "deleted":
        return "Έγινε soft delete";
      case "restored":
        return "Έγινε επαναφορά";
      case "note":
        return "Σημείωση";
      default:
        return "Γεγονός";
    }
  };

  const dotClass = (kind: PropertyEventKind) =>
    kind === "deleted"
      ? "bg-red-500"
      : kind === "updated"
      ? "bg-amber-500"
      : kind === "restored"
      ? "bg-sky-500"
      : kind === "note"
      ? "bg-gray-500"
      : "bg-emerald-500";

  const formatChangedFields = (meta: any): string[] | null => {
    const fields = meta?.changedFields;
    if (!Array.isArray(fields) || fields.length === 0) return null;

    const labels: Record<string, string> = {
      title: "Τίτλος",
      address: "Διεύθυνση",
      rent: "Ενοίκιο",
      commonCharges: "Κοινόχρηστα",
      otherFixedCosts: "Άλλα πάγια",
      billsIncluded: "Λογαριασμοί",
      depositMonths: "Εγγύηση (μήνες)",
      minimumContractMonths: "Ελάχιστη διάρκεια",
      size: "Τ.μ.",
      floor: "Όροφος",
      bedrooms: "Υπνοδωμάτια",
      bathrooms: "Μπάνια",
      yearBuilt: "Έτος κατασκευής",
      yearRenovated: "Έτος ανακαίνισης",
      heatingType: "Θέρμανση",
      energyClass: "Ενεργειακή κλάση",
      parking: "Parking",
      elevator: "Ασανσέρ",
      furnished: "Επίπλωση",
      petsAllowed: "Κατοικίδια",
      description: "Περιγραφή",
      status: "Κατάσταση",
    };

    const nice = fields.map((f) => labels[String(f)] ?? String(f));
    return nice;
  };

  const onSubmitΌχιte = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const title = noteTitle.trim();
    const message = noteMessage.trim();
    if (!title) return;

    setΌχιteSaving(true);
    try {
      const created = await api.addPropertyEventNote(id, {
        title,
        message: message ? message : undefined,
      });

      setEvents((prev) => {
      const q = timelineQuery.trim().toLowerCase();
      const kindOk =
        timelineFilter === "note"
          ? created.kind === "note"
          : timelineFilter === "updated"
          ? created.kind !== "note"
          : true;

      if (!kindOk) return prev;

      if (q) {
        const hay = ((created.title ?? "") + " " + (created.message ?? "")).toLowerCase();
        if (!hay.includes(q)) return prev;
      }

      return [created, ...prev];
    });
setΌχιteTitle("");
      setΌχιteMessage("");
      setΌχιteSaved(true);
      setTimeout(() => setΌχιteSaved(false), 1800);
    } catch (err: any) {
      notifyError((err as any)?.message || "Αποτυχία αποθήκευσης σημείωσης.");
    } finally {
      setΌχιteSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <button
          type="button"
          onClick={() => navigate("/properties")}
          className="text-sm text-gray-600 hover:underline"
        >
          ← Επιστροφή στη λίστα
        </button>

        <div className="bg-white rounded-xl shadow p-4 sm:p-6 space-y-4">
          {/* Τίτλος / διεύθυνση / status */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                {p.title || "Χωρίς τίτλο"}
              </h1>
              <div className="text-sm text-gray-600">
                {p.address || "Χωρίς διεύθυνση"}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                ID: {p._id}
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <span
                className={`inline-block text-xs px-2 py-1 rounded-full ${
                  isDeleted
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {isDeleted ? "Deleted" : "Active"}
              </span>
              {baseRent !== null && (
                <div className="text-right">
                  <div className="text-sm text-gray-600">Ενοίκιο</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {baseRent} € / μήνα
                  </div>
                  {(commonCharges !== null || otherFixed !== null) && (
                    <div className="mt-1 text-xs text-gray-500">
                      {commonCharges !== null &&
                        `Κοιν: ${commonCharges}€`}
                      {commonCharges !== null &&
                        otherFixed !== null &&
                        " · "}
                      {otherFixed !== null &&
                        `Άλλα: ${otherFixed}€`}
                    </div>
                  )}
                  {approxTotal !== null &&
                    (commonCharges !== null || otherFixed !== null) && (
                      <div className="text-xs text-gray-800 font-medium">
                        ≈ {approxTotal} €/μήνα συνολικά
                      </div>
                    )}
                  {p.billsIncluded && (
                    <div className="text-[11px] text-emerald-600 mt-1">
                      Περιλαμβάνονται λογαριασμοί
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Βασικά στοιχεία + κτίριο */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm text-gray-800">
              <div className="font-semibold text-gray-900">Βασικά</div>
              <div>
                <span className="font-medium">Τ.μ.:</span>{" "}
                {formatNumber(p.size)}
              </div>
              <div>
                <span className="font-medium">Όροφος:</span>{" "}
                {p.floor != null && !Number.isNaN(p.floor)
                  ? `Όροφος ${p.floor}`
                  : "—"}
              </div>
              <div>
                <span className="font-medium">Υπνοδωμάτια:</span>{" "}
                {p.bedrooms != null && !Number.isNaN(p.bedrooms)
                  ? p.bedrooms
                  : "—"}
              </div>
              <div>
                <span className="font-medium">Μπάνια:</span>{" "}
                {p.bathrooms != null && !Number.isNaN(p.bathrooms)
                  ? p.bathrooms
                  : "—"}
              </div>
            </div>

            <div className="space-y-1 text-sm text-gray-800">
              <div className="font-semibold text-gray-900">Κτίριο</div>
              <div>
                <span className="font-medium">Έτος κατασκευής:</span>{" "}
                {p.yearBuilt && !Number.isNaN(p.yearBuilt)
                  ? p.yearBuilt
                  : "—"}
              </div>
              <div>
                <span className="font-medium">Έτος ανακαίνισης:</span>{" "}
                {p.yearRenovated && !Number.isNaN(p.yearRenovated)
                  ? p.yearRenovated
                  : "—"}
              </div>
              <div>
                <span className="font-medium">Θέρμανση:</span>{" "}
                {heatingLabel}
              </div>
              <div>
                <span className="font-medium">Ενεργειακή κλάση:</span>{" "}
                {p.energyClass && p.energyClass !== "unknown"
                  ? (p.energyClass as EnergyClass)
                  : "—"}
              </div>
              <div>
                <span className="font-medium">Parking:</span>{" "}
                {parkingLabel || "—"}
              </div>
              <div>
                <span className="font-medium">Ασανσέρ:</span>{" "}
                {p.elevator ? "Ναι" : "Όχι"}
              </div>
            </div>
          </div>

          {/* Επίπλωση / λοιπά */}
          <div className="space-y-1 text-sm text-gray-800">
            <div className="font-semibold text-gray-900">
              Επίπλωση & λοιπά
            </div>
            <div>
              <span className="font-medium">Επίπλωση:</span>{" "}
              {furnishedLabel}
            </div>
            <div>
              <span className="font-medium">Κατοικίδια:</span>{" "}
              {p.petsAllowed ? "Επιτρέπονται" : "Δεν επιτρέπονται"}
            </div>
          </div>

          {/* Περιγραφή */}
          {p.description && (
            <div className="pt-3 border-t text-sm text-gray-800">
              <div className="font-semibold mb-1">Περιγραφή</div>
              <p>{p.description}</p>
            </div>
          )}

          {/* Compatibility / Ταιριάζουμε; */}
          <div className="pt-3 border-t">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-gray-900 text-sm">
                  Compatibility / Ταιριάζουμε;
                </div>
                <div className="text-xs text-gray-500">
                  Δημόσιο link για απαντήσεις ενοικιαστή (χωρίς login) + προτιμήσεις ιδιοκτήτη.
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={onGenerateOrCopyShareLink}
                  disabled={shareBusy}
                  className={
                    "text-xs px-3 py-2 rounded-lg font-semibold " +
                    (shareBusy
                      ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                      : "bg-gray-900 text-white hover:bg-gray-800")
                  }
                  title={effectiveShareKey ? "Αντιγραφή link" : "Δημιουργία & αντιγραφή link"}
                >
                  {effectiveShareKey ? "Αντιγραφή link" : "Δημιουργία link"}
                </button>

                <button
                  type="button"
                  onClick={onΆνοιγμαPublicCompatibility}
                  disabled={shareBusy}
                  className={
                    "text-xs px-3 py-2 rounded-lg border font-semibold " +
                    (shareBusy
                      ? "border-gray-200 text-gray-500 cursor-not-allowed"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50")
                  }
                  title="Άνοιγμα public σελίδας"
                >
                  Άνοιγμα
                </button>

                
                <button
                  type="button"
                  onClick={onOpenCompatModal}
                  disabled={shareBusy}
                  className={
                    "text-xs px-3 py-2 rounded-lg border font-semibold " +
                    (shareBusy
                      ? "border-gray-200 text-gray-500 cursor-not-allowed"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50")
                  }
                  title="Γρήγορη δοκιμή compatibility (internal)"
                >
                  Δοκιμή
                </button>
{effectiveShareKey && (
                  <button
                    type="button"
                    onClick={onRotateShareLink}
                    disabled={shareBusy}
                    className={
                      "text-xs px-3 py-2 rounded-lg border font-semibold " +
                      (shareBusy
                        ? "border-gray-200 text-gray-500 cursor-not-allowed"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50")
                    }
                    title="Αλλαγή link share key"
                  >
                    Αλλαγή link
                  </button>
                )}
              </div>
            </div>

            <div className="mt-2 space-y-2">
              {effectiveShareKey ? (
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-2 text-xs text-gray-800 break-all">
                  {shareUrl}
                </div>
              ) : (
                <div className="text-xs text-gray-600">
                  Δεν υπάρχει ακόμη share link για αυτό το ακίνητο.
                </div>
              )}
            </div>

            <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Προτιμήσεις Ιδιοκτήτη</div>
                  <div className="text-xs text-gray-500">
                    Αυτά καθορίζουν πώς “μετράει” το compatibility.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onSaveTenantPrefs}
                  disabled={prefsSaving}
                  className={
                    "text-xs px-3 py-2 rounded-lg font-semibold " +
                    (prefsSaving
                      ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                      : "bg-emerald-600 text-white hover:bg-emerald-700")
                  }
                >
                  {prefsSaving ? "Αποθήκευση..." : "Αποθήκευση"}
                </button>
              </div>

              {!hasTenantPrefs && (
                <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
                  Δεν έχουν οριστεί prefs ακόμα. Συμπλήρωσε και πάτα “Αποθήκευση”.
                </div>
              )}

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <div className="text-[11px] font-semibold text-gray-700 mb-1">Κάπνισμα</div>
                  <select
                    value={(prefsDraft.smoking as any) ?? ""}
                    onChange={(e) =>
                      setPrefsDraft((p) => ({
                        ...p,
                        smoking: e.target.value ? (e.target.value as any) : undefined,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">— (δεν ορίστηκε)</option>
                    <option value="either">Αδιάφορο</option>
                    <option value="no">Όχι</option>
                    <option value="yes">Ναι</option>
                  </select>
                </label>

                <label className="block">
                  <div className="text-[11px] font-semibold text-gray-700 mb-1">Κατοικίδια</div>
                  <select
                    value={(prefsDraft.pets as any) ?? ""}
                    onChange={(e) =>
                      setPrefsDraft((p) => ({
                        ...p,
                        pets: e.target.value ? (e.target.value as any) : undefined,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">— (δεν ορίστηκε)</option>
                    <option value="either">Αδιάφορο</option>
                    <option value="no">Όχι</option>
                    <option value="yes">Ναι</option>
                  </select>
                </label>

                
                <div className="block sm:col-span-2">
                  <div className="text-[11px] font-semibold text-gray-700 mb-2">
                    Χρήση (επιλογές)
                  </div>

                  {(() => {
                    const opts: Array<{ key: string; label: string }> = [
                      { key: "family", label: "Οικογένεια" },
                      { key: "remote_work", label: "Τηλεργασία" },
                      { key: "students", label: "Φοιτητές" },
                      { key: "single", label: "Μόνος/η" },
                      { key: "couple", label: "Ζευγάρι" },
                      { key: "shared", label: "Συγκατοίκηση" },
                    ];

                    const selected = new Set(Array.isArray(prefsDraft.usage) ? prefsDraft.usage : []);

                    const toggle = (k: string) => {
                      setPrefsDraft((p) => {
                        const cur = new Set(Array.isArray(p.usage) ? p.usage : []);
                        if (cur.has(k)) cur.delete(k);
                        else cur.add(k);
                        return { ...p, usage: Array.from(cur) };
                      });
                    };

                    return (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {opts.map((o) => (
                          <label key={o.key} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selected.has(o.key)}
                              onChange={() => toggle(o.key)}
                            />
                            <span className="text-sm text-gray-800">{o.label}</span>
                          </label>
                        ))}
                      </div>
                    );
                  })()}
                </div>


                <label className="block">
                  <div className="text-[11px] font-semibold text-gray-700 mb-1">
                    Ώρες ησυχίας μετά (0-23)
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={prefsDraft.quietHoursAfter ?? ""}
                    onChange={(e) =>
                      setPrefsDraft((p) => ({
                        ...p,
                        quietHoursAfter: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <div className="text-[11px] font-semibold text-gray-700 mb-1">Μέγιστοι ένοικοι</div>
                  <input
                    type="number"
                    min="1"
                    value={prefsDraft.maxOccupants ?? ""}
                    onChange={(e) =>
                      setPrefsDraft((p) => ({
                        ...p,
                        maxOccupants: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={!!prefsDraft.quietHoursStrict}
                    onChange={(e) =>
                      setPrefsDraft((p) => ({ ...p, quietHoursStrict: e.target.checked }))
                    }
                  />
                  <span className="text-sm text-gray-800">Αυστηρή τήρηση ωρών ησυχίας</span>
                </label>
              </div>
            </div>
          </div>



          
          {/* Compatibility test modal */}
          {compatOpen && (
            <div
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
              onClick={() => setCompatOpen(false)}
            >
              <div
                className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200 p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Δοκιμή Compatibility
                    </div>
                    <div className="text-xs text-gray-500">
                      Γρήγορος εσωτερικός έλεγχος με tenant answers (γράφει και timeline event).
                    </div>
                  </div>

                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-gray-600 hover:bg-gray-100"
                    onClick={() => setCompatOpen(false)}
                    aria-label="Κλείσιμο"
                    title="Κλείσιμο"
                  >
                    ✕
                  </button>
                </div>

                {!hasTenantPrefs && (
                  <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
                    Δεν έχουν οριστεί προτιμήσεις ιδιοκτήτη. Πρώτα “Αποθήκευση” στις Προτιμήσεις Ιδιοκτήτη.
                  </div>
                )}

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <div className="text-[11px] font-semibold text-gray-700 mb-1">Κάπνισμα (tenant)</div>
                    <select
                      value={(tenantDraft.smoking as any) ?? ""}
                      onChange={(e) =>
                        setTenantDraft((p) => ({
                          ...p,
                          smoking: e.target.value ? (e.target.value as any) : undefined,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">— (δεν απαντήθηκε)</option>
                      <option value="no">Όχι</option>
                      <option value="yes">Ναι</option>
                    </select>
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => setTenantDraft((p) => ({ ...p, smoking: undefined }))}
                        className="text-[11px] text-gray-600 hover:underline"
                      >
                        Χωρίς απάντηση
                      </button>
                    </div>
                  </label>

                  <label className="block">
                    <div className="text-[11px] font-semibold text-gray-700 mb-1">Κατοικίδια (tenant)</div>
                    <select
                      value={(tenantDraft.pets as any) ?? ""}
                      onChange={(e) =>
                        setTenantDraft((p) => ({
                          ...p,
                          pets: e.target.value ? (e.target.value as any) : undefined,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">— (δεν απαντήθηκε)</option>
                      <option value="no">Όχι</option>
                      <option value="yes">Ναι</option>
                    </select>
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => setTenantDraft((p) => ({ ...p, pets: undefined }))}
                        className="text-[11px] text-gray-600 hover:underline"
                      >
                        Χωρίς απάντηση
                      </button>
                    </div>
                  </label>

                  <label className="block">
                    <div className="text-[11px] font-semibold text-gray-700 mb-1">Ώρα ησυχίας μετά (0-23)</div>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={(tenantDraft.quietHoursAfter as any) ?? ""}
                      onChange={(e) =>
                        setTenantDraft((p) => ({
                          ...p,
                          quietHoursAfter: e.target.value === "" ? undefined : Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    />
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => setTenantDraft((p) => ({ ...p, quietHoursAfter: undefined }))}
                        className="text-[11px] text-gray-600 hover:underline"
                      >
                        Χωρίς απάντηση
                      </button>
                    </div>
                  </label>

                  <label className="block">
                    <div className="text-[11px] font-semibold text-gray-700 mb-1">Άτομα (occupants)</div>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={(tenantDraft.occupants as any) ?? ""}
                      onChange={(e) =>
                        setTenantDraft((p) => ({
                          ...p,
                          occupants: e.target.value === "" ? undefined : Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    />
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => setTenantDraft((p) => ({ ...p, occupants: undefined }))}
                        className="text-[11px] text-gray-600 hover:underline"
                      >
                        Χωρίς απάντηση
                      </button>
                    </div>
                  </label>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] font-semibold text-gray-700">Χρήση (tenant)</div>
                      <button
                        type="button"
                        onClick={() => setTenantDraft((p) => ({ ...p, usage: undefined }))}
                        className="text-[11px] text-gray-600 hover:underline"
                        title="Καθαρισμός επιλογών χρήσης"
                      >
                        Χωρίς απάντηση
                      </button>
                    </div>

                    {(() => {
                      const opts = [
                        { key: "family", label: "Οικογένεια" },
                        { key: "remote_work", label: "Τηλεργασία" },
                        { key: "students", label: "Φοιτητές" },
                        { key: "single", label: "Μόνος/η" },
                        { key: "couple", label: "Ζευγάρι" },
                        { key: "shared", label: "Συγκατοίκηση" },
                      ];

                      const selected = new Set(Array.isArray(tenantDraft.usage) ? tenantDraft.usage : []);

                      const toggle = (k: string) => {
                        setTenantDraft((p) => {
                          const cur = new Set(Array.isArray(p.usage) ? p.usage : []);
                          if (cur.has(k)) cur.delete(k);
                          else cur.add(k);
                          return { ...p, usage: Array.from(cur) };
                        });
                      };

                      return (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {opts.map((o) => (
                            <label
                              key={o.key}
                              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                            >
                              <input
                                type="checkbox"
                                checked={selected.has(o.key)}
                                onChange={() => toggle(o.key)}
                              />
                              <span className="text-sm text-gray-800">{o.label}</span>
                            </label>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {compatResult && (
                  <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-gray-900">Αποτέλεσμα</div>
                      <div className="text-sm font-semibold text-gray-900">
                        Score: <span className="tabular-nums">{compatResult.score}</span>/100
                      </div>
                    </div>

                    {Array.isArray(compatResult.conflicts) && compatResult.conflicts.length > 0 ? (
                      <ul className="mt-2 list-disc pl-5 text-xs text-gray-700 space-y-1">
                        {compatResult.conflicts.slice(0, 10).map((c, i) => (
                          <li key={i}>{(c && (c.message || c.key)) ? String(c.message || c.key) : "Conflict"}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-2 text-xs text-emerald-700 font-medium">
                        Δεν βρέθηκαν conflicts.
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={onResetCompatibilityTest}
                    className="text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
                  >
                    Reset
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCompatOpen(false)}
                      className="text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
                    >
                      Κλείσιμο
                    </button>

                    <button
                      type="button"
                      onClick={onRunCompatibilityTest}
                      disabled={compatBusy}
                      className={
                        "text-xs px-3 py-2 rounded-lg font-semibold " +
                        (compatBusy
                          ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                          : "bg-gray-900 text-white hover:bg-gray-800")
                      }
                    >
                      {compatBusy ? "Έλεγχος..." : "Τρέξε έλεγχο"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Timeline</div>
                <div className="text-xs text-gray-500">Radical Transparency</div>
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setTimelineFilter("all")}
                  className={
                    "px-2 py-1 text-[11px] rounded-md " +
                    (timelineFilter === "all"
                      ? "bg-white shadow text-gray-900"
                      : "text-gray-600")
                  }
                >
                  Όλα
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineFilter("updated")}
                  className={
                    "px-2 py-1 text-[11px] rounded-md " +
                    (timelineFilter === "updated"
                      ? "bg-white shadow text-gray-900"
                      : "text-gray-600")
                  }
                >
                  Updates
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineFilter("note")}
                  className={
                    "px-2 py-1 text-[11px] rounded-md " +
                    (timelineFilter === "note"
                      ? "bg-white shadow text-gray-900"
                      : "text-gray-600")
                  }
                >
                  Όχιtes
                </button>
              </div>
            </div>

            <div className="mt-2">

              <div className="relative">

                <input

                  value={timelineQuery}

                  onChange={(e) => setTimelineQuery(e.target.value)}

                  placeholder="Αναζήτηση στο timeline…"

                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"

                />

                {timelineQuery.trim() && (

                  <button

                    type="button"

                    onClick={() => setTimelineQuery("")}

                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm"

                    aria-label="Clear"

                    title="Clear"

                  >

                    ×

                  </button>

                )}

              </div>

            </div>


            <div className="mt-3 space-y-3">
              {eventsLoading ? (
                <div className="space-y-2">
                  <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                  <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                  <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                </div>
              ) : eventsError ? (
                <div className="text-xs text-red-600">{eventsError}</div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-xs text-gray-500">
                  Δεν υπάρχουν ακόμα γεγονότα για αυτό το ακίνητο.
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const groups: Array<{ key: string; label: string; items: typeof filteredEvents }> = [];
                    for (const ev of filteredEvents) {
                      const key = dayKey(ev.createdAt);
                      const label = groupLabelFromDayKey(key);
                      const last = groups[groups.length - 1];
                      if (!last || last.key !== key) {
                        groups.push({ key, label, items: [ev] as any });
                      } else {
                        (last.items as any).push(ev);
                      }
                    }

                    return groups.map((g) => (
                      <div key={g.key} className="space-y-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCollapsedGroups((prev) => ({
                              ...prev,
                              [g.key]: !prev[g.key],
                            }))
                          }
                          className="w-full flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-2 py-1"
                        >
                          <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
                            {g.label}
                          </span>
                          <span className="text-xs text-gray-500">
                            {collapsedGroups[g.key] ? "▼" : "▲"}
                          </span>
                        </button>

                          {!collapsedGroups[g.key] && (
                            <div className="space-y-3">
                              {g.items.map((ev, idx) => {
                            const changed =
                              ev.kind === "updated" ? formatChangedFields(ev.meta) : null;

                            return (
                              <div key={ev._id || ev.kind + "-" + idx} className="relative pl-6">
                                <div
                                  className={
                                    "absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full " +
                                    dotClass(ev.kind as PropertyEventKind)
                                  }
                                />
                                {idx !== g.items.length - 1 && (
                                  <div className="absolute left-[4px] top-4 h-full w-px bg-gray-200" />
                                )}

                                <div className="text-sm text-gray-800">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="font-medium">
                                      {ev.title ? highlightText(ev.title, timelineQuery) : kindLabel(ev.kind as PropertyEventKind)}
                                    </div>
                                    <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                      {kindLabel(ev.kind as PropertyEventKind)}
                                    </span>
                                  </div>

                                  <div className="text-xs text-gray-500">
                                    {formatDateTime(ev.createdAt)}
                                  </div>

                                  {changed && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {changed.slice(0, 6).map((label, i) => (
                                        <span
                                          key={label + "-" + i}
                                          className="inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-100 px-2 py-0.5 text-[11px] font-medium"
                                        >
                                          {label}
                                        </span>
                                      ))}
                                      {changed.length > 6 && (
                                        <span className="text-[11px] text-gray-600">
                                          +{changed.length - 6} ακόμη
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {ev.message && (
                                    <div className="mt-1 text-xs text-gray-700 whitespace-pre-wrap">
                                      {highlightText(ev.message, timelineQuery)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                              })}
                            </div>
                          )}
                      </div>
                    ));
                  })()}                </div>
              )}

              {/* Add note */}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">
                    Προσθήκη σημείωσης
                  </div>
                  {noteSaved && (
                    <div className="text-xs text-emerald-600 font-medium">
                      Αποθηκεύτηκε ✓
                    </div>
                  )}
                </div>

                <form onSubmit={onSubmitΌχιte} className="mt-2 space-y-2">
                  <input
                    value={noteTitle}
                    onChange={(e) => setΌχιteTitle(e.target.value)}
                    placeholder="Τίτλος"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                  <textarea
                    value={noteMessage}
                    onChange={(e) => setΌχιteMessage(e.target.value)}
                    placeholder="Μήνυμα (προαιρετικό)"
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                  <button
                    type="submit"
                    disabled={noteSaving || !noteTitle.trim()}
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {noteSaving ? "Αποθήκευση..." : "Αποθήκευση σημείωσης"}
                  </button>
                </form>
              </div>
            </div>
          
                  {/* Load more (cursor pagination) */}
                  <div className="pt-2">
                    {eventsNextBefore ? (
                      <button
                        type="button"
                        onClick={loadMoreEvents}
                        disabled={eventsLoadingMore}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
                      >
                        {eventsLoadingMore ? "Φορτώνω…" : "Φόρτωσε παλιότερα"}
                      </button>
                    ) : (
                      <div className="text-center text-xs text-gray-500">Τέλος timeline.</div>
                    )}
                  </div>
</div>

{/* Ημερομηνίες */}

          <div className="pt-3 border-t text-xs text-gray-500 space-y-1">
            <div>Δημιουργήθηκε: {formatDateTime(p.createdAt)}</div>
            {p.updatedAt && p.updatedAt !== p.createdAt && (
              <div>
                Τελευταία ενημέρωση: {formatDateTime(p.updatedAt)}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

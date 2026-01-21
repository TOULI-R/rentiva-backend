import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import api, {
  type Property,
  type HeatingType,
  type EnergyClass,
  type ParkingType,
  type FurnishedType,
  type CreatePayload,
} from "../lib/api";
import { useNotification } from "../lib/notifications";

function formatNumber(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return String(n);
}

function Properties() {
  const { notifyError, notifySuccess } = useNotification();
  const navigate = useNavigate();

  // data
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // filters – controls
  const [q, setQ] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // pagination (server-side style)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // add form
  const [newTitle, setNewTitle] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newRent, setNewRent] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newFloor, setNewFloor] = useState("");
  const [newBedrooms, setNewBedrooms] = useState("");
  const [newBathrooms, setNewBathrooms] = useState("");

  const [newYearBuilt, setNewYearBuilt] = useState("");
  const [newYearRenovated, setNewYearRenovated] = useState("");

  // Health Passport (v1)
  const [newWindowsYear, setNewWindowsYear] = useState("");
  const [newAcYear, setNewAcYear] = useState("");
  const [newRoofInsulationYear, setNewRoofInsulationYear] = useState("");
  const [newPlumbingYear, setNewPlumbingYear] = useState("");
  const [newElectricalYear, setNewElectricalYear] = useState("");
  const [newHpNotes, setNewHpNotes] = useState("");
  const [newHeatingType, setNewHeatingType] =
    useState<HeatingType>("none");
  const [newEnergyClass, setNewEnergyClass] =
    useState<EnergyClass>("unknown");
  const [newParking, setNewParking] =
    useState<ParkingType>("none");
  const [newElevator, setNewElevator] = useState(false);

  const [newBalcony, setNewBalcony] = useState(false);
  const [newFurnished, setNewFurnished] =
    useState<FurnishedType>("none");
  const [newPetsAllowed, setNewPetsAllowed] = useState(false);
  const [newDescription, setNewDescription] = useState("");

  const [newCommonCharges, setNewCommonCharges] = useState("");
  const [newOtherFixedCosts, setNewOtherFixedCosts] = useState("");
  const [newDepositMonths, setNewDepositMonths] = useState("");
  const [newMinimumContractMonths, setNewMinimumContractMonths] =
    useState("");
  const [newBillsIncluded, setNewBillsIncluded] = useState(false);

  // inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editRent, setEditRent] = useState("");
  const [editSize, setEditSize] = useState("");
  const [editFloor, setEditFloor] = useState("");
  const [editBedrooms, setEditBedrooms] = useState("");
  const [editBathrooms, setEditBathrooms] = useState("");

  const [editYearBuilt, setEditYearBuilt] = useState("");
  const [editYearRenovated, setEditYearRenovated] = useState("");

  // Health Passport (v1) - edit
  const [editWindowsYear, setEditWindowsYear] = useState("");
  const [editAcYear, setEditAcYear] = useState("");
  const [editRoofInsulationYear, setEditRoofInsulationYear] = useState("");
  const [editPlumbingYear, setEditPlumbingYear] = useState("");
  const [editElectricalYear, setEditElectricalYear] = useState("");
  const [editHpNotes, setEditHpNotes] = useState("");
  const [editHeatingType, setEditHeatingType] =
    useState<HeatingType>("none");
  const [editEnergyClass, setEditEnergyClass] =
    useState<EnergyClass>("unknown");
  const [editParking, setEditParking] =
    useState<ParkingType>("none");
  const [editElevator, setEditElevator] = useState(false);

  const [editBalcony, setEditBalcony] = useState(false);
  const [editFurnished, setEditFurnished] =
    useState<FurnishedType>("none");
  const [editPetsAllowed, setEditPetsAllowed] = useState(false);
  const [editDescription, setEditDescription] = useState("");

  const [editCommonCharges, setEditCommonCharges] = useState("");
  const [editOtherFixedCosts, setEditOtherFixedCosts] = useState("");
  const [editDepositMonths, setEditDepositMonths] = useState("");
  const [editMinimumContractMonths, setEditMinimumContractMonths] =
    useState("");
  const [editBillsIncluded, setEditBillsIncluded] = useState(false);

  async function fetchList() {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.listProperties({
        includeDeleted,
        page,
        pageSize,
        q,
      });
      setItems(res.items || []);
      setTotalItems(res.totalItems ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch (e: any) {
      const msg = e?.message || "Αποτυχία φόρτωσης.";
      setErr(msg);
      notifyError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeDeleted, page, pageSize, q]);

  // ---------- helpers για parse numbers ----------
  const parseOptionalNumber = (raw: string) => {
    const t = raw.trim();
    if (!t) return undefined;
    const n = Number(t);
    if (Number.isNaN(n)) return NaN;
    return n;
  };

  // ---------- Add ----------
  const onAdd = async () => {
    if (!newTitle.trim()) {
      notifyError("Ο τίτλος είναι υποχρεωτικός.");
      return;
    }
    if (!newAddress.trim()) {
      notifyError("Η διεύθυνση είναι υποχρεωτική.");
      return;
    }

    const rentNumber = parseOptionalNumber(newRent);
    if (rentNumber === undefined || Number.isNaN(rentNumber)) {
      notifyError("Το ενοίκιο είναι υποχρεωτικό και πρέπει να είναι αριθμός.");
      return;
    }

    const sizeNumber = parseOptionalNumber(newSize);
    if (sizeNumber === undefined || Number.isNaN(sizeNumber)) {
      notifyError("Τα τετραγωνικά είναι υποχρεωτικά και πρέπει να είναι αριθμός.");
      return;
    }

    const floorNumber = parseOptionalNumber(newFloor);
    if (Number.isNaN(floorNumber)) {
      notifyError("Ο όροφος πρέπει να είναι αριθμός.");
      return;
    }

    const bedroomsNumber = parseOptionalNumber(newBedrooms);
    if (Number.isNaN(bedroomsNumber)) {
      notifyError("Τα υπνοδωμάτια πρέπει να είναι αριθμός.");
      return;
    }

    const bathroomsNumber = parseOptionalNumber(newBathrooms);
    if (Number.isNaN(bathroomsNumber)) {
      notifyError("Τα μπάνια πρέπει να είναι αριθμός.");
      return;
    }

    const yearBuiltNumber = parseOptionalNumber(newYearBuilt);
    if (Number.isNaN(yearBuiltNumber)) {
      notifyError("Το έτος κατασκευής πρέπει να είναι αριθμός.");
      return;
    }

    const yearRenovatedNumber = parseOptionalNumber(newYearRenovated);
    if (Number.isNaN(yearRenovatedNumber)) {
      notifyError("Το έτος ανακαίνισης πρέπει να είναι αριθμός.");
      return;
    }

    const commonChargesNumber = parseOptionalNumber(newCommonCharges);
    if (Number.isNaN(commonChargesNumber)) {
      notifyError("Τα κοινόχρηστα πρέπει να είναι αριθμός.");
      return;
    }

    const otherFixedCostsNumber = parseOptionalNumber(newOtherFixedCosts);
    if (Number.isNaN(otherFixedCostsNumber)) {
      notifyError("Τα άλλα σταθερά έξοδα πρέπει να είναι αριθμός.");
      return;
    }

    const depositMonthsNumber = parseOptionalNumber(newDepositMonths);
    if (Number.isNaN(depositMonthsNumber)) {
      notifyError("Η εγγύηση (μήνες) πρέπει να είναι αριθμός.");
      return;
    }

    const minimumContractMonthsNumber = parseOptionalNumber(
      newMinimumContractMonths
    );
    if (Number.isNaN(minimumContractMonthsNumber)) {
      notifyError("Η ελάχιστη διάρκεια (μήνες) πρέπει να είναι αριθμός.");
      return;
    }

    const windowsYearNumber = parseOptionalNumber(newWindowsYear);
    if (Number.isNaN(windowsYearNumber)) {
      notifyError("Το έτος κουφωμάτων πρέπει να είναι αριθμός.");
      return;
    }

    const acYearNumber = parseOptionalNumber(newAcYear);
    if (Number.isNaN(acYearNumber)) {
      notifyError("Το έτος A/C πρέπει να είναι αριθμός.");
      return;
    }

    const roofInsulationYearNumber = parseOptionalNumber(newRoofInsulationYear);
    if (Number.isNaN(roofInsulationYearNumber)) {
      notifyError("Το έτος μόνωσης ταράτσας πρέπει να είναι αριθμός.");
      return;
    }

    const plumbingYearNumber = parseOptionalNumber(newPlumbingYear);
    if (Number.isNaN(plumbingYearNumber)) {
      notifyError("Το έτος υδραυλικών πρέπει να είναι αριθμός.");
      return;
    }

    const electricalYearNumber = parseOptionalNumber(newElectricalYear);
    if (Number.isNaN(electricalYearNumber)) {
      notifyError("Το έτος ηλεκτρολογικών πρέπει να είναι αριθμός.");
      return;
    }

    const payload: CreatePayload = {
      title: newTitle.trim(),
      address: newAddress.trim(),
      rent: rentNumber as number,
      size: sizeNumber as number,
    };

    if (floorNumber !== undefined) payload.floor = floorNumber as number;
    if (bedroomsNumber !== undefined)
      payload.bedrooms = bedroomsNumber as number;
    if (bathroomsNumber !== undefined)
      payload.bathrooms = bathroomsNumber as number;
    if (yearBuiltNumber !== undefined)
      payload.yearBuilt = yearBuiltNumber as number;
    if (yearRenovatedNumber !== undefined)
      payload.yearRenovated = yearRenovatedNumber as number;
    if (commonChargesNumber !== undefined)
      payload.commonCharges = commonChargesNumber as number;
    if (otherFixedCostsNumber !== undefined)
      payload.otherFixedCosts = otherFixedCostsNumber as number;
    if (depositMonthsNumber !== undefined)
      payload.depositMonths = depositMonthsNumber as number;
    if (minimumContractMonthsNumber !== undefined)
      payload.minimumContractMonths = minimumContractMonthsNumber as number;

    if (newDescription.trim()) payload.description = newDescription.trim();

    payload.heatingType = newHeatingType;
    payload.energyClass = newEnergyClass;
    payload.parking = newParking;
    payload.elevator = newElevator;
    payload.balcony = newBalcony;
    payload.furnished = newFurnished;
    payload.petsAllowed = newPetsAllowed;
    payload.billsIncluded = newBillsIncluded;

    // Health Passport payload (v1)
    const hp: any = {};
    if (windowsYearNumber !== undefined) hp.windowsYear = windowsYearNumber as number;
    if (acYearNumber !== undefined) hp.acYear = acYearNumber as number;
    if (roofInsulationYearNumber !== undefined) hp.roofInsulationYear = roofInsulationYearNumber as number;
    if (plumbingYearNumber !== undefined) hp.plumbingYear = plumbingYearNumber as number;
    if (electricalYearNumber !== undefined) hp.electricalYear = electricalYearNumber as number;
    if (newHpNotes.trim()) hp.notes = newHpNotes.trim();
    if (Object.keys(hp).length) payload.healthPassport = hp;

    try {
      await api.createProperty(payload);
      // καθαρισμός
      setNewTitle("");
      setNewAddress("");
      setNewRent("");
      setNewSize("");
      setNewFloor("");
      setNewBedrooms("");
      setNewBathrooms("");
      setNewYearBuilt("");
      setNewYearRenovated("");

      setNewWindowsYear("");
      setNewAcYear("");
      setNewRoofInsulationYear("");
      setNewPlumbingYear("");
      setNewElectricalYear("");
      setNewHpNotes("");
      setNewHeatingType("none");
      setNewEnergyClass("unknown");
      setNewParking("none");
      setNewElevator(false);
      setNewBalcony(false);
      setNewFurnished("none");
      setNewPetsAllowed(false);
      setNewDescription("");
      setNewCommonCharges("");
      setNewOtherFixedCosts("");
      setNewDepositMonths("");
      setNewMinimumContractMonths("");
      setNewBillsIncluded(false);

      setPage(1);
      await fetchList();
      notifySuccess("Το ακίνητο δημιουργήθηκε με επιτυχία.");
    } catch (e: any) {
      notifyError(e?.message || "Αποτυχία δημιουργίας.");
    }
  };

  // ---------- Delete / Restore ----------
  const onDelete = async (id: string) => {
    if (!confirm("Να γίνει soft delete;")) return;
    try {
      await api.delProperty(id);
      await fetchList();
      notifySuccess("Το ακίνητο διαγράφηκε (soft delete).");
    } catch (e: any) {
      notifyError(e?.message || "Αποτυχία διαγραφής.");
    }
  };

  const onRestore = async (id: string) => {
    try {
      await api.restoreProperty(id);
      await fetchList();
      notifySuccess("Το ακίνητο επανήλθε.");
    } catch (e: any) {
      notifyError(e?.message || "Αποτυχία restore.");
    }
  };

  // ---------- View ----------
  const goToDetails = (p: Property) => {
    navigate(`/properties/${p._id}`, { state: { property: p } });
  };

  // ---------- Edit helpers ----------
  const startEdit = (p: Property) => {
    setEditingId(p._id);
    setEditTitle(p.title || "");
    setEditAddress(p.address || "");
    setEditRent(
      p.rent != null && !Number.isNaN(p.rent) ? String(p.rent) : ""
    );
    setEditSize(
      p.size != null && !Number.isNaN(p.size) ? String(p.size) : ""
    );
    setEditFloor(
      p.floor != null && !Number.isNaN(p.floor) ? String(p.floor) : ""
    );
    setEditBedrooms(
      p.bedrooms != null && !Number.isNaN(p.bedrooms)
        ? String(p.bedrooms)
        : ""
    );
    setEditBathrooms(
      p.bathrooms != null && !Number.isNaN(p.bathrooms)
        ? String(p.bathrooms)
        : ""
    );

    setEditYearBuilt(
      p.yearBuilt != null && !Number.isNaN(p.yearBuilt)
        ? String(p.yearBuilt)
        : ""
    );
    setEditYearRenovated(
      p.yearRenovated != null && !Number.isNaN(p.yearRenovated)
        ? String(p.yearRenovated)
        : ""
    );

    // Health Passport (v1)
    setEditWindowsYear(p.healthPassport?.windowsYear != null && !Number.isNaN(p.healthPassport.windowsYear) ? String(p.healthPassport.windowsYear) : "");
    setEditAcYear(p.healthPassport?.acYear != null && !Number.isNaN(p.healthPassport.acYear) ? String(p.healthPassport.acYear) : "");
    setEditRoofInsulationYear(p.healthPassport?.roofInsulationYear != null && !Number.isNaN(p.healthPassport.roofInsulationYear) ? String(p.healthPassport.roofInsulationYear) : "");
    setEditPlumbingYear(p.healthPassport?.plumbingYear != null && !Number.isNaN(p.healthPassport.plumbingYear) ? String(p.healthPassport.plumbingYear) : "");
    setEditElectricalYear(p.healthPassport?.electricalYear != null && !Number.isNaN(p.healthPassport.electricalYear) ? String(p.healthPassport.electricalYear) : "");
    setEditHpNotes(p.healthPassport?.notes || "");
    setEditHeatingType(p.heatingType ?? "none");
    setEditEnergyClass(p.energyClass ?? "unknown");
    setEditParking(p.parking ?? "none");
    setEditElevator(!!p.elevator);
    setEditBalcony(!!p.balcony);


    setEditFurnished(p.furnished ?? "none");
    setEditPetsAllowed(!!p.petsAllowed);
    setEditDescription(p.description || "");

    setEditCommonCharges(
      p.commonCharges != null && !Number.isNaN(p.commonCharges)
        ? String(p.commonCharges)
        : ""
    );
    setEditOtherFixedCosts(
      p.otherFixedCosts != null && !Number.isNaN(p.otherFixedCosts)
        ? String(p.otherFixedCosts)
        : ""
    );
    setEditDepositMonths(
      p.depositMonths != null && !Number.isNaN(p.depositMonths)
        ? String(p.depositMonths)
        : ""
    );
    setEditMinimumContractMonths(
      p.minimumContractMonths != null &&
      !Number.isNaN(p.minimumContractMonths)
        ? String(p.minimumContractMonths)
        : ""
    );
    setEditBillsIncluded(!!p.billsIncluded);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditAddress("");
    setEditRent("");
    setEditSize("");
    setEditFloor("");
    setEditBedrooms("");
    setEditBathrooms("");
    setEditYearBuilt("");
    setEditYearRenovated("");

    // Health Passport (v1)
    setEditWindowsYear("");
    setEditAcYear("");
    setEditRoofInsulationYear("");
    setEditPlumbingYear("");
    setEditElectricalYear("");
    setEditHpNotes("");
    setEditHeatingType("none");
    setEditEnergyClass("unknown");
    setEditParking("none");
    setEditElevator(false);
    setEditBalcony(false);
    setEditFurnished("none");
    setEditPetsAllowed(false);
    setEditDescription("");
    setEditCommonCharges("");
    setEditOtherFixedCosts("");
    setEditDepositMonths("");
    setEditMinimumContractMonths("");
    setEditBillsIncluded(false);
  };

  const saveEdit = async () => {
    if (!editingId) return;

    if (!editTitle.trim()) {
      notifyError("Ο τίτλος είναι υποχρεωτικός.");
      return;
    }
    if (!editAddress.trim()) {
      notifyError("Η διεύθυνση είναι υποχρεωτική.");
      return;
    }
    if (!editRent.trim()) {
      notifyError("Το ενοίκιο είναι υποχρεωτικό.");
      return;
    }
    if (!editSize.trim()) {
      notifyError("Τα τετραγωνικά είναι υποχρεωτικά.");
      return;
    }

    const rentNumber = parseOptionalNumber(editRent);
    if (rentNumber === undefined || Number.isNaN(rentNumber)) {
      notifyError("Το ενοίκιο πρέπει να είναι αριθμός.");
      return;
    }

    const sizeNumber = parseOptionalNumber(editSize);
    if (sizeNumber === undefined || Number.isNaN(sizeNumber)) {
      notifyError("Τα τετραγωνικά πρέπει να είναι αριθμός.");
      return;
    }

    const floorNumber = parseOptionalNumber(editFloor);
    if (Number.isNaN(floorNumber)) {
      notifyError("Ο όροφος πρέπει να είναι αριθμός.");
      return;
    }

    const bedroomsNumber = parseOptionalNumber(editBedrooms);
    if (Number.isNaN(bedroomsNumber)) {
      notifyError("Τα υπνοδωμάτια πρέπει να είναι αριθμός.");
      return;
    }

    const bathroomsNumber = parseOptionalNumber(editBathrooms);
    if (Number.isNaN(bathroomsNumber)) {
      notifyError("Τα μπάνια πρέπει να είναι αριθμός.");
      return;
    }

    const yearBuiltNumber = parseOptionalNumber(editYearBuilt);
    if (Number.isNaN(yearBuiltNumber)) {
      notifyError("Το έτος κατασκευής πρέπει να είναι αριθμός.");
      return;
    }

    const yearRenovatedNumber = parseOptionalNumber(editYearRenovated);
    if (Number.isNaN(yearRenovatedNumber)) {
      notifyError("Το έτος ανακαίνισης πρέπει να είναι αριθμός.");
      return;
    }

    const commonChargesNumber = parseOptionalNumber(editCommonCharges);
    if (Number.isNaN(commonChargesNumber)) {
      notifyError("Τα κοινόχρηστα πρέπει να είναι αριθμός.");
      return;
    }

    const otherFixedCostsNumber = parseOptionalNumber(editOtherFixedCosts);
    if (Number.isNaN(otherFixedCostsNumber)) {
      notifyError("Τα άλλα σταθερά έξοδα πρέπει να είναι αριθμός.");
      return;
    }

    const depositMonthsNumber = parseOptionalNumber(editDepositMonths);
    if (Number.isNaN(depositMonthsNumber)) {
      notifyError("Η εγγύηση (μήνες) πρέπει να είναι αριθμός.");
      return;
    }

    const minimumContractMonthsNumber = parseOptionalNumber(
      editMinimumContractMonths
    );
    if (Number.isNaN(minimumContractMonthsNumber)) {
      notifyError("Η ελάχιστη διάρκεια (μήνες) πρέπει να είναι αριθμός.");
      return;
    }

    const windowsYearNumber = parseOptionalNumber(editWindowsYear);
    if (Number.isNaN(windowsYearNumber)) {
      notifyError("Το έτος κουφωμάτων πρέπει να είναι αριθμός.");
      return;
    }

    const acYearNumber = parseOptionalNumber(editAcYear);
    if (Number.isNaN(acYearNumber)) {
      notifyError("Το έτος A/C πρέπει να είναι αριθμός.");
      return;
    }

    const roofInsulationYearNumber = parseOptionalNumber(editRoofInsulationYear);
    if (Number.isNaN(roofInsulationYearNumber)) {
      notifyError("Το έτος μόνωσης ταράτσας πρέπει να είναι αριθμός.");
      return;
    }

    const plumbingYearNumber = parseOptionalNumber(editPlumbingYear);
    if (Number.isNaN(plumbingYearNumber)) {
      notifyError("Το έτος υδραυλικών πρέπει να είναι αριθμός.");
      return;
    }

    const electricalYearNumber = parseOptionalNumber(editElectricalYear);
    if (Number.isNaN(electricalYearNumber)) {
      notifyError("Το έτος ηλεκτρολογικών πρέπει να είναι αριθμός.");
      return;
    }

    const payload: Partial<CreatePayload> = {
      title: editTitle.trim(),
      address: editAddress.trim(),
      rent: rentNumber as number,
      size: sizeNumber as number,
    };

    if (floorNumber !== undefined) payload.floor = floorNumber as number;
    if (bedroomsNumber !== undefined)
      payload.bedrooms = bedroomsNumber as number;
    if (bathroomsNumber !== undefined)
      payload.bathrooms = bathroomsNumber as number;
    if (yearBuiltNumber !== undefined)
      payload.yearBuilt = yearBuiltNumber as number;

    // Health Passport payload (v1)
    const hp: any = {};
    if (windowsYearNumber !== undefined) hp.windowsYear = windowsYearNumber as number;
    if (acYearNumber !== undefined) hp.acYear = acYearNumber as number;
    if (roofInsulationYearNumber !== undefined) hp.roofInsulationYear = roofInsulationYearNumber as number;
    if (plumbingYearNumber !== undefined) hp.plumbingYear = plumbingYearNumber as number;
    if (electricalYearNumber !== undefined) hp.electricalYear = electricalYearNumber as number;
    if (editHpNotes.trim()) hp.notes = editHpNotes.trim();
    if (Object.keys(hp).length) (payload as any).healthPassport = hp;
    if (yearRenovatedNumber !== undefined)
      payload.yearRenovated = yearRenovatedNumber as number;
    if (commonChargesNumber !== undefined)
      payload.commonCharges = commonChargesNumber as number;
    if (otherFixedCostsNumber !== undefined)
      payload.otherFixedCosts = otherFixedCostsNumber as number;
    if (depositMonthsNumber !== undefined)
      payload.depositMonths = depositMonthsNumber as number;
    if (minimumContractMonthsNumber !== undefined)
      payload.minimumContractMonths =
        minimumContractMonthsNumber as number;

    payload.description = editDescription.trim() || undefined;
    payload.heatingType = editHeatingType;
    payload.energyClass = editEnergyClass;
    payload.parking = editParking;
    payload.elevator = editElevator;
    payload.balcony = editBalcony;
    payload.furnished = editFurnished;
    payload.petsAllowed = editPetsAllowed;
    payload.billsIncluded = editBillsIncluded;

    try {
      await api.updateProperty(editingId, payload);
      cancelEdit();
      await fetchList();
      notifySuccess("Το ακίνητο ενημερώθηκε με επιτυχία.");
    } catch (e: any) {
      notifyError(e?.message || "Αποτυχία ενημέρωσης.");
    }
  };

  // labels
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        <h2 className="text-xl font-semibold">Properties</h2>

        {/* Add property */}
        <div className="bg-white p-4 rounded-xl shadow flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-700">
                Τίτλος *
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="π.χ. Διαμέρισμα Κέντρο"
                />
              </label>
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-700">
                Διεύθυνση *
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="π.χ. Πανεπιστημίου 10"
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="w-24">
              <label className="block text-sm text-gray-700">
                Τ.μ. *
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  placeholder="80"
                />
              </label>
            </div>
            <div className="w-28">
              <label className="block text-sm text-gray-700">
                Ενοίκιο (€) *
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newRent}
                  onChange={(e) => setNewRent(e.target.value)}
                  placeholder="700"
                />
              </label>
            </div>
            <div className="w-24">
              <label className="block text-sm text-gray-700">
                Όροφος
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newFloor}
                  onChange={(e) => setNewFloor(e.target.value)}
                  placeholder="3"
                />
              </label>
            </div>
            <div className="w-20">
              <label className="block text-sm text-gray-700">
                Υ/Δ
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newBedrooms}
                  onChange={(e) => setNewBedrooms(e.target.value)}
                  placeholder="2"
                />
              </label>
            </div>
            <div className="w-20">
              <label className="block text-sm text-gray-700">
                Μπάνια
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newBathrooms}
                  onChange={(e) => setNewBathrooms(e.target.value)}
                  placeholder="1"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={onAdd}
              className="sm:self-end whitespace-nowrap border rounded-xl px-4 py-2 bg-black text-white"
            >
              Προσθήκη
            </button>
          </div>

          {/* Κτίριο */}
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
            <div>
              <label className="block text-sm text-gray-700">
                Έτος κατασκευής
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newYearBuilt}
                  onChange={(e) => setNewYearBuilt(e.target.value)}
                  placeholder="1995"
                />
              </label>
            </div>
            <div>
              <label className="block text-sm text-gray-700">
                Έτος ανακαίνισης
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newYearRenovated}
                  onChange={(e) => setNewYearRenovated(e.target.value)}
                  placeholder="2018"
                />
              </label>
            </div>
            <div>
              <label className="block text-sm text-gray-700">
                Θέρμανση
                <select
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newHeatingType}
                  onChange={(e) =>
                    setNewHeatingType(e.target.value as HeatingType)
                  }
                >
                  <option value="none">Χωρίς θέρμανση</option>
                  <option value="central_oil">Κεντρική πετρέλαιο</option>
                  <option value="central_gas">
                    Κεντρική φυσικό αέριο
                  </option>
                  <option value="autonomous_gas">
                    Ατομική φυσικό αέριο
                  </option>
                  <option value="autonomous_oil">
                    Ατομική πετρέλαιο
                  </option>
                  <option value="heat_pump">Αντλία θερμότητας</option>
                  <option value="electric">Ηλεκτρική / A/C</option>
                  <option value="other">Άλλο</option>
                </select>
              </label>
            </div>
            <div>
              <label className="block text-sm text-gray-700">
                Ενεργειακή κλάση
                <select
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newEnergyClass}
                  onChange={(e) =>
                    setNewEnergyClass(e.target.value as EnergyClass)
                  }
                >
                  <option value="unknown">Άγνωστη</option>
                  <option value="A+">A+</option>
                  <option value="A">A</option>
                  <option value="B+">B+</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                  <option value="Z">Ζ</option>
                  <option value="H">Η</option>
                </select>
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="w-48">
              <label className="block text-sm text-gray-700">
                Parking
                <select
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newParking}
                  onChange={(e) =>
                    setNewParking(e.target.value as ParkingType)
                  }
                >
                  <option value="none">Χωρίς parking</option>
                  <option value="street">Στάθμευση στο δρόμο</option>
                  <option value="open">Ανοιχτή θέση</option>
                  <option value="closed">Κλειστή θέση</option>
                  <option value="garage">Ιδιωτικό γκαράζ</option>
                </select>
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm mt-1 sm:mt-6">
              <input
                type="checkbox"
                checked={newElevator}
                onChange={(e) => setNewElevator(e.target.checked)}
              />
              Με ασανσέρ
            </label> <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!newBalcony}
                  onChange={(e) => setNewBalcony(e.target.checked)}
                />
                <span>Μπαλκόνι</span>
              </label>

          </div>


          {/* Βιβλιάριο Υγείας Ακινήτου (v1) */}
          <div className="mt-4 border rounded-2xl p-3">
            <div className="text-sm font-semibold text-gray-800 mb-2">Βιβλιάριο Υγείας Ακινήτου</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <label className="block text-sm text-gray-700">
                Κουφώματα (έτος)
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newWindowsYear}
                  onChange={(e) => setNewWindowsYear(e.target.value)}
                  placeholder="2018"
                />
              </label>
              <label className="block text-sm text-gray-700">
                A/C (έτος)
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newAcYear}
                  onChange={(e) => setNewAcYear(e.target.value)}
                  placeholder="2020"
                />
              </label>
              <label className="block text-sm text-gray-700">
                Μόνωση ταράτσας (έτος)
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newRoofInsulationYear}
                  onChange={(e) => setNewRoofInsulationYear(e.target.value)}
                  placeholder="2015"
                />
              </label>
              <label className="block text-sm text-gray-700">
                Υδραυλικά (έτος)
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newPlumbingYear}
                  onChange={(e) => setNewPlumbingYear(e.target.value)}
                  placeholder="2017"
                />
              </label>
              <label className="block text-sm text-gray-700">
                Ηλεκτρολογικά (έτος)
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newElectricalYear}
                  onChange={(e) => setNewElectricalYear(e.target.value)}
                  placeholder="2016"
                />
              </label>
            </div>
            <label className="block text-sm text-gray-700 mt-3">
              Σημειώσεις
              <textarea
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={newHpNotes}
                onChange={(e) => setNewHpNotes(e.target.value)}
                placeholder="π.χ. αλλαγή θερμοσίφωνα, επισκευές, επαναλαμβανόμενα θέματα..."
                rows={2}
              />
            </label>
          </div>

          {/* Επίπλωση / κατοικίδια */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="w-40">
              <label className="block text-sm text-gray-700">
                Επίπλωση
                <select
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newFurnished}
                  onChange={(e) =>
                    setNewFurnished(e.target.value as FurnishedType)
                  }
                >
                  <option value="none">Μη επιπλωμένο</option>
                  <option value="partial">Μερικώς επιπλωμένο</option>
                  <option value="full">Πλήρως επιπλωμένο</option>
                </select>
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm mt-1 sm:mt-6">
              <input
                type="checkbox"
                checked={newPetsAllowed}
                onChange={(e) => setNewPetsAllowed(e.target.checked)}
              />
              Επιτρέπονται κατοικίδια
            </label>
          </div>

          {/* Οικονομικά */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="w-32">
              <label className="block text-sm text-gray-700">
                Κοινόχρηστα (€)
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newCommonCharges}
                  onChange={(e) => setNewCommonCharges(e.target.value)}
                  placeholder="50"
                />
              </label>
            </div>
            <div className="w-40">
              <label className="block text-sm text-gray-700">
                Άλλα σταθερά έξοδα (€)
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newOtherFixedCosts}
                  onChange={(e) =>
                    setNewOtherFixedCosts(e.target.value)
                  }
                  placeholder="30"
                />
              </label>
            </div>
            <div className="w-36">
              <label className="block text-sm text-gray-700">
                Εγγύηση (μήνες)
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newDepositMonths}
                  onChange={(e) =>
                    setNewDepositMonths(e.target.value)
                  }
                  placeholder="2"
                />
              </label>
            </div>
            <div className="w-44">
              <label className="block text-sm text-gray-700">
                Ελάχιστη διάρκεια (μήνες)
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newMinimumContractMonths}
                  onChange={(e) =>
                    setNewMinimumContractMonths(e.target.value)
                  }
                  placeholder="12"
                />
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newBillsIncluded}
              onChange={(e) => setNewBillsIncluded(e.target.checked)}
            />
            Περιλαμβάνονται λογαριασμοί (ρεύμα/νερό/θέρμανση)
          </label>

          {/* Περιγραφή */}
          <div>
            <label className="block text-sm text-gray-700">
              Περιγραφή
              <textarea
                className="mt-1 w-full border rounded-xl px-3 py-2 min-h-[60px]"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Αναλυτική περιγραφή ακινήτου..."
              />
            </label>
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <input
            placeholder="Αναζήτηση τίτλου/διεύθυνσης..."
            className="border rounded-xl px-3 py-2 w-full sm:w-64"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => {
                setIncludeDeleted(e.target.checked);
                setPage(1);
              }}
            />
            Εμφάνιση διαγεγραμμένων
          </label>
        </div>

        {err && (
          <div className="text-sm text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded-lg">
            {err}
          </div>
        )}

        {/* Cards grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-32 bg-white rounded-xl shadow animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl shadow px-4 py-6 text-gray-500 text-sm">
            Δεν βρέθηκαν properties.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((p) => {
              const isDeleted = !!p.deletedAt;
              const isEditing = editingId === p._id;

              const baseRent =
                typeof p.rent === "number" && !Number.isNaN(p.rent)
                  ? p.rent
                  : null;
              const commonCharges =
                typeof p.commonCharges === "number" &&
                !Number.isNaN(p.commonCharges)
                  ? p.commonCharges
                  : null;
              const otherFixed =
                typeof p.otherFixedCosts === "number" &&
                !Number.isNaN(p.otherFixedCosts)
                  ? p.otherFixedCosts
                  : null;
              const approxTotal =
                baseRent !== null
                  ? baseRent + (commonCharges || 0) + (otherFixed || 0)
                  : null;

              return (
                <div
                  key={p._id}
                  className={`rounded-xl shadow bg-white p-4 flex flex-col justify-between ${
                    isDeleted ? "opacity-60" : ""
                  }`}
                >
                  {isEditing ? (
                    <>
                      <div className="space-y-2 mb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <label className="block text-xs text-gray-700">
                              Τίτλος *
                              <input
                                className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                                value={editTitle}
                                onChange={(e) =>
                                  setEditTitle(e.target.value)
                                }
                              />
                            </label>
                            <label className="block text-xs text-gray-700 mt-2">
                              Διεύθυνση *
                              <input
                                className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                                value={editAddress}
                                onChange={(e) =>
                                  setEditAddress(e.target.value)
                                }
                              />
                            </label>
                          </div>
                          <span
                            className={`inline-block text-xs px-2 py-1 rounded-full ${
                              isDeleted
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {isDeleted ? "Deleted" : "Active"}
                          </span>
                        </div>

                        {/* Βασικά */}
                        <div className="grid gap-2 grid-cols-2 mt-2">
                          <label className="block text-xs text-gray-700">
                            Τ.μ. *
                            <input
                              className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                              value={editSize}
                              onChange={(e) =>
                                setEditSize(e.target.value)
                              }
                            />
                          </label>
                          <label className="block text-xs text-gray-700">
                            Ενοίκιο (€) *
                            <input
                              className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                              value={editRent}
                              onChange={(e) =>
                                setEditRent(e.target.value)
                              }
                            />
                          </label>
                          <label className="block text-xs text-gray-700">
                            Όροφος
                            <input
                              className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                              value={editFloor}
                              onChange={(e) =>
                                setEditFloor(e.target.value)
                              }
                            />
                          </label>
                          <label className="block text-xs text-gray-700">
                            Υ/Δ
                            <input
                              className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                              value={editBedrooms}
                              onChange={(e) =>
                                setEditBedrooms(e.target.value)
                              }
                            />
                          </label>
                          <label className="block text-xs text-gray-700">
                            Μπάνια
                            <input
                              className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                              value={editBathrooms}
                              onChange={(e) =>
                                setEditBathrooms(e.target.value)
                              }
                            />
                          </label>
                        </div>

                        {/* Κτίριο */}
                        <div className="mt-3 grid gap-2 grid-cols-2">
                          <label className="block text-xs text-gray-700">
                            Έτος κατασκευής
                            <input
                              className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                              value={editYearBuilt}
                              onChange={(e) =>
                                setEditYearBuilt(e.target.value)
                              }
                            />
                          </label>
                          <label className="block text-xs text-gray-700">
                            Έτος ανακαίνισης
                            <input
                              className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                              value={editYearRenovated}
                              onChange={(e) =>
                                setEditYearRenovated(e.target.value)
                              }
                            />
                          </label>
                          <label className="block text-xs text-gray-700">
                            Θέρμανση
                            <select
                              className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                              value={editHeatingType}
                              onChange={(e) =>
                                setEditHeatingType(
                                  e.target.value as HeatingType
                                )
                              }
                            >
                              <option value="none">
                                Χωρίς θέρμανση
                              </option>
                              <option value="central_oil">
                                Κεντρική πετρέλαιο
                              </option>
                              <option value="central_gas">
                                Κεντρική φυσικό αέριο
                              </option>
                              <option value="autonomous_gas">
                                Ατομική φυσικό αέριο
                              </option>
                              <option value="autonomous_oil">
                                Ατομική πετρέλαιο
                              </option>
                              <option value="heat_pump">
                                Αντλία θερμότητας
                              </option>
                              <option value="electric">
                                Ηλεκτρική / A/C
                              </option>
                              <option value="other">Άλλο</option>
                            </select>
                          </label>
                          <label className="block text-xs text-gray-700">
                            Ενεργειακή κλάση
                            <select
                              className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                              value={editEnergyClass}
                              onChange={(e) =>
                                setEditEnergyClass(
                                  e.target.value as EnergyClass
                                )
                              }
                            >
                              <option value="unknown">Άγνωστη</option>
                              <option value="A+">A+</option>
                              <option value="A">A</option>
                              <option value="B+">B+</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                              <option value="E">E</option>
                              <option value="Z">Ζ</option>
                              <option value="H">Η</option>
                            </select>
                          </label>
                          <label className="block text-xs text-gray-700">
                            Parking
                            <select
                              className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                              value={editParking}
                              onChange={(e) =>
                                setEditParking(
                                  e.target.value as ParkingType
                                )
                              }
                            >
                              <option value="none">
                                Χωρίς parking
                              </option>
                              <option value="street">
                                Στάθμευση στο δρόμο
                              </option>
                              <option value="open">
                                Ανοιχτή θέση
                              </option>
                              <option value="closed">
                                Κλειστή θέση
                              </option>
                              <option value="garage">
                                Ιδιωτικό γκαράζ
                              </option>
                            </select>
                          </label>
                          <label className="flex items-center gap-2 text-xs mt-5">
                            <input
                              type="checkbox"
                              checked={editElevator}
                              onChange={(e) =>
                                setEditElevator(e.target.checked)
                              }
                            />
                            Με ασανσέρ
                          </label>
              __BALCONY_EDIT__
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!editBalcony}
                  onChange={(e) => setEditBalcony(e.target.checked)}
                />
                <span>Μπαλκόνι</span>
              </label>

                        </div>

                        {/* Επίπλωση / κατοικίδια */}
                        <div className="mt-3 flex flex-col gap-2">
                          <div className="flex gap-3">
                            <label className="block text-xs text-gray-700 w-40">
                              Επίπλωση
                              <select
                                className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                                value={editFurnished}
                                onChange={(e) =>
                                  setEditFurnished(
                                    e.target.value as FurnishedType
                                  )
                                }
                              >
                                <option value="none">
                                  Μη επιπλωμένο
                                </option>
                                <option value="partial">
                                  Μερικώς επιπλωμένο
                                </option>
                                <option value="full">
                                  Πλήρως επιπλωμένο
                                </option>
                              </select>
                            </label>
                            <label className="flex items-center gap-2 text-xs mt-5">
                              <input
                                type="checkbox"
                                checked={editPetsAllowed}
                                onChange={(e) =>
                                  setEditPetsAllowed(e.target.checked)
                                }
                              />
                              Επιτρέπονται κατοικίδια
                            </label>
                          </div>
                        </div>


                        {/* Βιβλιάριο Υγείας Ακινήτου (v1) */}
                        <div id={`hp-${p._id}`} className="mt-3 border rounded-2xl p-2">
                          <div className="text-xs font-semibold text-gray-800 mb-2">Βιβλιάριο Υγείας Ακινήτου</div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <label className="block text-xs text-gray-700">
                              Κουφώματα (έτος)
                              <input
                                className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                                value={editWindowsYear}
                                onChange={(e) => setEditWindowsYear(e.target.value)}
                                placeholder="2018"
                              />
                            </label>
                            <label className="block text-xs text-gray-700">
                              A/C (έτος)
                              <input
                                className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                                value={editAcYear}
                                onChange={(e) => setEditAcYear(e.target.value)}
                                placeholder="2020"
                              />
                            </label>
                            <label className="block text-xs text-gray-700">
                              Μόνωση ταράτσας (έτος)
                              <input
                                className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                                value={editRoofInsulationYear}
                                onChange={(e) => setEditRoofInsulationYear(e.target.value)}
                                placeholder="2015"
                              />
                            </label>
                            <label className="block text-xs text-gray-700">
                              Υδραυλικά (έτος)
                              <input
                                className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                                value={editPlumbingYear}
                                onChange={(e) => setEditPlumbingYear(e.target.value)}
                                placeholder="2017"
                              />
                            </label>
                            <label className="block text-xs text-gray-700">
                              Ηλεκτρολογικά (έτος)
                              <input
                                className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                                value={editElectricalYear}
                                onChange={(e) => setEditElectricalYear(e.target.value)}
                                placeholder="2016"
                              />
                            </label>
                          </div>
                          <label className="block text-xs text-gray-700 mt-2">
                            Σημειώσεις
                            <textarea
                              className="mt-1 w-full border rounded-xl px-2 py-1 text-sm min-h-[60px]"
                              value={editHpNotes}
                              onChange={(e) => setEditHpNotes(e.target.value)}
                              placeholder="π.χ. αλλαγές, επισκευές, επαναλαμβανόμενα θέματα..."
                              rows={2}
                            />
                          </label>
                        </div>

                        {/* Οικονομικά */}
                        <div className="mt-3 grid gap-2 grid-cols-2">
                          <label className="block text-xs text-gray-700">
                            Κοινόχρηστα (€)
                            <input
                              className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                              value={editCommonCharges}
                              onChange={(e) =>
                                setEditCommonCharges(e.target.value)
                              }
                            />
                          </label>
                          <label className="block text-xs text-gray-700">
                            Άλλα σταθερά έξοδα (€)
                            <input
                              className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                              value={editOtherFixedCosts}
                              onChange={(e) =>
                                setEditOtherFixedCosts(
                                  e.target.value
                                )
                              }
                            />
                          </label>
                          <label className="block text-xs text-gray-700">
                            Εγγύηση (μήνες)
                            <input
                              className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                              value={editDepositMonths}
                              onChange={(e) =>
                                setEditDepositMonths(e.target.value)
                              }
                            />
                          </label>
                          <label className="block text-xs text-gray-700">
                            Ελάχιστη διάρκεια (μήνες)
                            <input
                              className="mt-1 w-full border rounded-xl px-2 py-1 text-sm"
                              value={editMinimumContractMonths}
                              onChange={(e) =>
                                setEditMinimumContractMonths(
                                  e.target.value
                                )
                              }
                            />
                          </label>
                        </div>

                        <label className="flex items-center gap-2 text-xs mt-2">
                          <input
                            type="checkbox"
                            checked={editBillsIncluded}
                            onChange={(e) =>
                              setEditBillsIncluded(e.target.checked)
                            }
                          />
                          Περιλαμβάνονται λογαριασμοί
                        </label>

                        <label className="block text-xs text-gray-700 mt-2">
                          Περιγραφή
                          <textarea
                            className="mt-1 w-full border rounded-xl px-2 py-1 text-sm min-h-[60px]"
                            value={editDescription}
                            onChange={(e) =>
                              setEditDescription(e.target.value)
                            }
                          />
                        </label>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          className="text-sm px-3 py-1.5 rounded-xl border bg-black text-white"
                          onClick={saveEdit}
                        >
                          Αποθήκευση
                        </button>
                        <button
                          className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                          onClick={cancelEdit}
                        >
                          Ακύρωση
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-base font-semibold text-gray-900">
                              {p.title || "-"}
                            </div>
                            <div className="text-sm text-gray-600">
                              {p.address || "-"}
                            </div>
                          </div>
                          <span
                            className={`inline-block text-xs px-2 py-1 rounded-full ${
                              isDeleted
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {isDeleted ? "Deleted" : "Active"}
                          </span>
                        </div>

                        <div className="text-sm text-gray-900">
                          <span className="font-medium">Ενοίκιο:</span>{" "}
                          {baseRent !== null
                            ? `${baseRent} € / μήνα`
                            : "-"}
                        </div>
                        {(commonCharges !== null ||
                          otherFixed !== null ||
                          p.depositMonths != null) && (
                          <div className="text-xs text-gray-500">
                            {commonCharges !== null &&
                              `Κοιν: ${commonCharges}€`}
                            {commonCharges !== null &&
                              otherFixed !== null &&
                              " · "}
                            {otherFixed !== null &&
                              `Άλλα: ${otherFixed}€`}
                            {(commonCharges !== null ||
                              otherFixed !== null) &&
                              p.depositMonths != null &&
                              " · "}
                            {p.depositMonths != null &&
                              `Εγγύηση: ${p.depositMonths}μ.`}
                          </div>
                        )}
                        {approxTotal !== null &&
                          (commonCharges !== null ||
                            otherFixed !== null) && (
                            <div className="text-xs text-gray-800 font-medium">
                              ≈ {approxTotal} €/μήνα συνολικά
                            </div>
                          )}
                        {p.billsIncluded && (
                          <div className="text-[11px] text-emerald-600">
                            Περιλαμβάνονται λογαριασμοί
                          </div>
                        )}

                        <div className="text-xs text-gray-700">
                          <span className="font-semibold">Βασικά:</span>{" "}
                          {formatNumber(p.size)} τ.μ. ·{" "}
                          {p.floor != null && !Number.isNaN(p.floor)
                            ? `Όροφος ${p.floor}`
                            : "Όροφος —"}{" "}
                          ·{" "}
                          {p.bedrooms != null &&
                          !Number.isNaN(p.bedrooms)
                            ? `${p.bedrooms} Υ/Δ`
                            : "Υ/Δ —"}{" "}
                          ·{" "}
                          {p.bathrooms != null &&
                          !Number.isNaN(p.bathrooms)
                            ? `${p.bathrooms} Μπ`
                            : "Μπ —"}
                        </div>

                        <div className="text-xs text-gray-700">
                          <span className="font-semibold">Κτίριο:</span>{" "}
                          {p.yearBuilt &&
                          !Number.isNaN(p.yearBuilt)
                            ? `Έτος ${p.yearBuilt}`
                            : "Έτος —"}
                          {p.yearRenovated &&
                            !Number.isNaN(p.yearRenovated) &&
                            ` · Ανακαίνιση ${p.yearRenovated}`}
                          {p.heatingType &&
                            ` · ${heatingLabels[p.heatingType]}`}
                          {p.energyClass &&
                            p.energyClass !== "unknown" &&
                            ` · Εν. κλάση ${p.energyClass}`}
                          {p.parking &&
                            p.parking !== "none" &&
                            ` · ${parkingLabels[p.parking]}`}
                          {p.elevator && " · Ασανσέρ"}
                        </div>

                        <div className="flex flex-wrap gap-2 mt-1">
                          {p.furnished && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                              {furnishedLabels[p.furnished]}
                            </span>
                          )}
                          {p.petsAllowed && (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                              Επιτρέπονται κατοικίδια
                            </span>
                          )}
                        </div>

                        {p.description && (
                          <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {p.description}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                          onClick={() => goToDetails(p)}
                        >
                          Προβολή
                        </button>
                        {!isDeleted && (
                          <>
                          <button
                            className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                            onClick={() => startEdit(p)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                            onClick={() => {
                              startEdit(p);
                              setTimeout(() => {
                                const el = document.getElementById(`hp-${p._id}`);
                                if (el) {
                                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                                  const first = el.querySelector("input, textarea, select") as HTMLElement | null;
                                  if (first) first.focus();
                                }
                              }, 80);
                            }}
                          >
                            Βιβλιάριο Υγείας
                          </button>
                          </>
                        )}
                        {isDeleted ? (
                          <button
                            className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                            onClick={() => onRestore(p._id)}
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                            onClick={() => onDelete(p._id)}
                          >
                            Soft delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* footer / pagination */}
        <div className="flex items-center justify-between px-1 py-3">
          <div className="text-sm text-gray-600">
            Σελίδα {page} από {totalPages} · {totalItems} εγγραφές
          </div>
          <div className="flex items-center gap-3">
            <button
              className="border rounded-xl px-3 py-1.5 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Προηγούμενη
            </button>
            <button
              className="border rounded-xl px-3 py-1.5 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Επόμενη
            </button>
            <select
              className="border rounded-xl px-2 py-1 text-sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={5}>5/σελίδα</option>
              <option value={10}>10/σελίδα</option>
              <option value={20}>20/σελίδα</option>
            </select>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Properties;

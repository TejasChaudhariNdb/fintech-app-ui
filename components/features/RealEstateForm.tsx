"use client";

import React, { useState, useEffect } from "react";
import { useProfile } from "@/context/ProfileContext";
import {
  Building2,
  Building,
  Store,
  Layers,
  Home,
  MapPin,
  TrendingUp,
  Percent,
  Calendar,
  Sparkles,
  Check,
  AlertCircle,
  IndianRupee,
} from "lucide-react";

export interface RealEstateFormData {
  id?: number;
  property_name: string;
  property_type: string;
  location?: string | null;
  area_sqft?: number | null;
  purchase_date: string;
  purchase_price: number;
  stamp_duty_and_charges?: number | null;
  renovation_costs?: number | null;
  current_valuation: number;
  is_rented?: boolean;
  monthly_rental_income?: number | null;
  notes?: string | null;
  profile_id?: number | null;
}

interface RealEstateFormProps {
  initialData?: RealEstateFormData | null;
  onSave: (data: RealEstateFormData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const PROPERTY_TYPES = [
  { id: "RESIDENTIAL_APARTMENT", label: "Apartment / Flat", icon: Building2 },
  { id: "VILLA_HOUSE", label: "Villa / House", icon: Home },
  { id: "COMMERCIAL", label: "Commercial Office / Shop", icon: Store },
  { id: "LAND_PLOT", label: "Plot / Land", icon: Layers },
];

const POPULAR_LOCATIONS = [
  "Mumbai, Maharashtra",
  "Bengaluru, Karnataka",
  "Delhi NCR / Gurgaon",
  "Pune, Maharashtra",
  "Hyderabad, Telangana",
  "Noida, Uttar Pradesh",
  "Chennai, Tamil Nadu",
];

const VALUATION_QUICK_CHIPS = [
  { label: "₹35L", val: 3500000 },
  { label: "₹60L", val: 6000000 },
  { label: "₹1.0Cr", val: 10000000 },
  { label: "₹1.5Cr", val: 15000000 },
  { label: "₹2.5Cr", val: 25000000 },
  { label: "₹5.0Cr", val: 50000000 },
];

function formatINRShort(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 10000000) {
    return `₹${(val / 10000000).toFixed(2).replace(/\.00$/, "")}Cr`;
  }
  if (abs >= 100000) {
    return `₹${(val / 100000).toFixed(1).replace(/\.0$/, "")}L`;
  }
  if (abs >= 1000) {
    return `₹${(val / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `₹${val.toLocaleString("en-IN")}`;
}

export default function RealEstateForm({
  initialData,
  onSave,
  onCancel,
  isSubmitting = false,
}: RealEstateFormProps) {
  const { profiles, activeProfileId } = useProfile();

  const [propertyName, setPropertyName] = useState<string>(
    initialData?.property_name || ""
  );
  const [propertyType, setPropertyType] = useState<string>(
    initialData?.property_type || "RESIDENTIAL_APARTMENT"
  );
  const [location, setLocation] = useState<string>(
    initialData?.location || ""
  );
  const [areaSqftStr, setAreaSqftStr] = useState<string>(
    initialData?.area_sqft ? String(initialData.area_sqft) : ""
  );
  const [purchaseDate, setPurchaseDate] = useState<string>(
    initialData?.purchase_date ||
    new Date(Date.now() - 3 * 365 * 24 * 3600 * 1000)
      .toISOString()
      .split("T")[0]
  );
  const [purchasePriceStr, setPurchasePriceStr] = useState<string>(
    initialData ? String(initialData.purchase_price) : ""
  );
  const [stampDutyStr, setStampDutyStr] = useState<string>(
    initialData?.stamp_duty_and_charges
      ? String(initialData.stamp_duty_and_charges)
      : ""
  );
  const [renovationStr, setRenovationStr] = useState<string>(
    initialData?.renovation_costs
      ? String(initialData.renovation_costs)
      : ""
  );
  const [currentValuationStr, setCurrentValuationStr] = useState<string>(
    initialData ? String(initialData.current_valuation) : ""
  );
  const [isRented, setIsRented] = useState<boolean>(
    initialData?.is_rented || false
  );
  const [monthlyRentStr, setMonthlyRentStr] = useState<string>(
    initialData?.monthly_rental_income
      ? String(initialData.monthly_rental_income)
      : ""
  );
  const [notes, setNotes] = useState<string>(initialData?.notes || "");

  const [selectedProfileId, setSelectedProfileId] = useState<string>(() => {
    if (initialData?.profile_id) return String(initialData.profile_id);
    if (activeProfileId && activeProfileId !== "all") return activeProfileId;
    return profiles[0]?.id ? String(profiles[0].id) : "";
  });

  useEffect(() => {
    if (initialData?.profile_id) {
      setSelectedProfileId(String(initialData.profile_id));
    } else if (activeProfileId && activeProfileId !== "all") {
      setSelectedProfileId(activeProfileId);
    } else if (profiles && profiles.length > 0 && !selectedProfileId) {
      const def = profiles.find((p) => p.is_default) || profiles[0];
      if (def) setSelectedProfileId(String(def.id));
    }
  }, [activeProfileId, profiles, initialData]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Numeric Calculations
  const purchasePriceNum = parseFloat(purchasePriceStr) || 0;
  const stampDutyNum = parseFloat(stampDutyStr) || 0;
  const renovationNum = parseFloat(renovationStr) || 0;
  const totalCostBasis = purchasePriceNum + stampDutyNum + renovationNum;

  const currentValuationNum = parseFloat(currentValuationStr) || 0;
  const unrealizedGain = currentValuationNum - totalCostBasis;
  const gainPct =
    totalCostBasis > 0 ? (unrealizedGain / totalCostBasis) * 100 : 0;

  // Holding Period & CAGR
  const pDate = new Date(purchaseDate);
  const now = new Date();
  const diffDays = Math.max(1, Math.round((now.getTime() - pDate.getTime()) / (1000 * 3600 * 24)));
  const tenureYears = Math.max(0.01, diffDays / 365.25);

  let cagrPct = gainPct;
  if (totalCostBasis > 0 && currentValuationNum > 0 && tenureYears >= 0.1) {
    try {
      cagrPct = (Math.pow(currentValuationNum / totalCostBasis, 1 / tenureYears) - 1) * 100;
    } catch {
      cagrPct = gainPct;
    }
  }

  // Rental Yield
  const monthlyRentNum = isRented ? parseFloat(monthlyRentStr) || 0 : 0;
  const annualRent = monthlyRentNum * 12;
  const rentalYieldPct =
    currentValuationNum > 0 ? (annualRent / currentValuationNum) * 100 : 0;

  const totalReturnXirrPct = cagrPct + rentalYieldPct;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!propertyName.trim()) {
      setErrorMsg("Please enter a property or project name.");
      return;
    }
    if (purchasePriceNum <= 0) {
      setErrorMsg("Please enter a valid purchase price.");
      return;
    }
    if (currentValuationNum <= 0) {
      setErrorMsg("Please enter the current estimated valuation.");
      return;
    }
    if (!purchaseDate) {
      setErrorMsg("Please select the acquisition / purchase date.");
      return;
    }

    const resolvedProfileId = selectedProfileId
      ? parseInt(selectedProfileId)
      : activeProfileId !== "all"
        ? parseInt(activeProfileId)
        : profiles.find((p) => p.is_default)?.id || profiles[0]?.id;

    try {
      await onSave({
        id: initialData?.id,
        property_name: propertyName.trim(),
        property_type: propertyType,
        location: location.trim() || undefined,
        area_sqft: parseFloat(areaSqftStr) || undefined,
        purchase_date: purchaseDate,
        purchase_price: purchasePriceNum,
        stamp_duty_and_charges: stampDutyNum,
        renovation_costs: renovationNum,
        current_valuation: currentValuationNum,
        is_rented: isRented,
        monthly_rental_income: isRented ? monthlyRentNum : 0,
        notes: notes.trim() || undefined,
        profile_id: resolvedProfileId || undefined,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save property. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ── PROFILE SELECTOR (If multi-profile) ── */}
      {profiles.length > 1 && (
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
            Property Owner (Profile)
          </label>
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className="w-full bg-neutral-50 dark:bg-black/20 border border-neutral-200 dark:border-white/10 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-sm font-semibold outline-none transition-all dark:text-white"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.relation})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── PROPERTY TYPE SELECTOR ── */}
      <div>
        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
          Property Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PROPERTY_TYPES.map((item) => {
            const Icon = item.icon;
            const isSelected = propertyType === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPropertyType(item.id)}
                className={`flex items-center sm:flex-col justify-center gap-2 sm:gap-1 p-2.5 sm:p-3 rounded-xl border text-center transition-all ${
                  isSelected
                    ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs"
                    : "bg-white dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
                }`}
              >
                <Icon size={18} />
                <span className="text-xs leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── PROPERTY NAME & LOCATION ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
            Property Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              type="text"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              placeholder="e.g. 3BHK Oberoi Sky City"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-black/20 border border-neutral-200 dark:border-white/10 focus:border-indigo-500 text-sm font-semibold outline-none transition-all dark:text-white"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
            Location / City
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Borivali East, Mumbai"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-black/20 border border-neutral-200 dark:border-white/10 focus:border-indigo-500 text-sm font-semibold outline-none transition-all dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* ── AREA & PURCHASE DATE ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
            Carpet Area (sq ft, optional)
          </label>
          <input
            type="number"
            step="any"
            value={areaSqftStr}
            onChange={(e) => setAreaSqftStr(e.target.value)}
            placeholder="e.g. 1250"
            className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-black/20 border border-neutral-200 dark:border-white/10 focus:border-indigo-500 text-sm font-semibold outline-none transition-all dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
            Purchase Date <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-black/20 border border-neutral-200 dark:border-white/10 focus:border-indigo-500 text-sm font-semibold outline-none transition-all dark:text-white"
              required
            />
          </div>
        </div>
      </div>

      {/* ── VALUATION & PURCHASE PRICE ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Purchase Price */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              Purchase Price (₹) <span className="text-rose-500">*</span>
            </label>
            {purchasePriceNum > 0 && (
              <span className="text-xs font-bold text-neutral-500 font-mono">
                {formatINRShort(purchasePriceNum)}
              </span>
            )}
          </div>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              type="number"
              step="any"
              value={purchasePriceStr}
              onChange={(e) => setPurchasePriceStr(e.target.value)}
              placeholder="e.g. 8500000"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-black/20 border border-neutral-200 dark:border-white/10 focus:border-indigo-500 text-sm font-bold font-mono outline-none transition-all dark:text-white"
              required
            />
          </div>
        </div>

        {/* Current Market Valuation */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              Current Valuation (₹) <span className="text-rose-500">*</span>
            </label>
            {currentValuationNum > 0 && (
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                {formatINRShort(currentValuationNum)}
              </span>
            )}
          </div>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              type="number"
              step="any"
              value={currentValuationStr}
              onChange={(e) => setCurrentValuationStr(e.target.value)}
              placeholder="e.g. 13500000"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-black/20 border border-neutral-200 dark:border-white/10 focus:border-indigo-500 text-sm font-bold font-mono outline-none transition-all dark:text-white"
              required
            />
          </div>
        </div>
      </div>

      {/* ── ADDITIONAL ACQUISITION COSTS (Stamp duty & Renovation) ── */}
      <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200/80 dark:border-white/10 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-neutral-700 dark:text-neutral-300">
            Stamp Duty, Registration &amp; Interior Works
          </span>
          <span className="text-neutral-500 font-mono">
            Total Cost Basis: <strong className="text-neutral-900 dark:text-white font-bold">{formatINRShort(totalCostBasis)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div>
            <label className="block text-[11px] font-medium text-neutral-500 mb-1">
              Stamp Duty &amp; Registration (₹, optional)
            </label>
            <input
              type="number"
              step="any"
              value={stampDutyStr}
              onChange={(e) => setStampDutyStr(e.target.value)}
              placeholder="e.g. 550000"
              className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-black/30 border border-neutral-200 dark:border-white/10 focus:border-indigo-500 text-xs font-semibold font-mono outline-none dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-500 mb-1">
              Renovation &amp; Interiors (₹, optional)
            </label>
            <input
              type="number"
              step="any"
              value={renovationStr}
              onChange={(e) => setRenovationStr(e.target.value)}
              placeholder="e.g. 600000"
              className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-black/30 border border-neutral-200 dark:border-white/10 focus:border-indigo-500 text-xs font-semibold font-mono outline-none dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* ── RENTAL INCOME SECTION ── */}
      <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200/80 dark:border-white/10 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-neutral-900 dark:text-white">
              Currently Rented Out?
            </div>
            <div className="text-[11px] text-neutral-500">
              Calculate rental yield and cashflow
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsRented(!isRented)}
            className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
              isRented ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                isRented ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {isRented && (
          <div className="pt-2 border-t border-neutral-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                Monthly Rent (₹)
              </label>
              <input
                type="number"
                step="any"
                value={monthlyRentStr}
                onChange={(e) => setMonthlyRentStr(e.target.value)}
                placeholder="e.g. 38000"
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-black/30 border border-neutral-200 dark:border-white/10 focus:border-indigo-500 text-xs font-bold font-mono outline-none dark:text-white"
              />
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <span className="text-[11px] text-neutral-500 block">Gross Yield</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {rentalYieldPct.toFixed(2)}% p.a.
              </span>
              <span className="text-[10px] text-neutral-400 ml-1">
                ({formatINRShort(annualRent)}/yr)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── LIVE RETURN & CAGR PREVIEW STRIP ── */}
      {totalCostBasis > 0 && currentValuationNum > 0 && (
        <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-around text-center gap-2">
          <div>
            <div className="text-[10px] font-semibold text-neutral-500 uppercase">Return</div>
            <div
              className={`text-xs sm:text-sm font-bold font-mono mt-0.5 ${
                unrealizedGain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {unrealizedGain >= 0 ? "+" : ""}
              {gainPct.toFixed(1)}%
            </div>
          </div>

          <div className="h-6 w-px bg-neutral-200 dark:bg-white/10" />

          <div>
            <div className="text-[10px] font-semibold text-neutral-500 uppercase">Appreciation CAGR</div>
            <div className="text-xs sm:text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
              {cagrPct.toFixed(1)}% p.a.
            </div>
          </div>

          <div className="h-6 w-px bg-neutral-200 dark:bg-white/10" />

          <div>
            <div className="text-[10px] font-semibold text-neutral-500 uppercase">Holding Tenure</div>
            <div className="text-xs sm:text-sm font-bold font-mono text-neutral-700 dark:text-neutral-300 mt-0.5">
              {tenureYears.toFixed(1)} yrs
            </div>
          </div>

          {isRented && rentalYieldPct > 0 && (
            <>
              <div className="h-6 w-px bg-neutral-200 dark:bg-white/10" />
              <div>
                <div className="text-[10px] font-semibold text-neutral-500 uppercase">Total Return</div>
                <div className="text-xs sm:text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {totalReturnXirrPct.toFixed(1)}% XIRR
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── NOTES ── */}
      <div>
        <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
          Notes (Optional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Registered in Borivali office, rental agreement valid till 2026"
          className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-black/20 border border-neutral-200 dark:border-white/10 focus:border-indigo-500 text-xs font-medium outline-none transition-all dark:text-white"
        />
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 text-rose-500 text-xs font-semibold p-2.5 bg-rose-500/10 rounded-xl">
          <AlertCircle size={15} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── ACTION BUTTONS ── */}
      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100 dark:border-white/10">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl text-xs sm:text-sm transition-all shadow-sm shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? (
            <span>Saving Property...</span>
          ) : (
            <>
              <Check size={16} />
              <span>{initialData ? "Update Property" : "Save Property"}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

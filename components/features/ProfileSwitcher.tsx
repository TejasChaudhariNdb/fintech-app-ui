"use client";

import React, { useState, useRef, useEffect } from "react";
import { useProfile, Profile } from "@/context/ProfileContext";
import { ChevronDown, Users, User, Star, Plus, Check } from "lucide-react";
import Link from "next/link";

export default function ProfileSwitcher() {
  const {
    profiles,
    activeProfileId,
    activeProfile,
    changeActiveProfile,
  } = useProfile();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const getProfileColorClass = (relation: string) => {
    const rel = relation.toUpperCase();
    if (rel === "SELF") return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    if (rel === "MOTHER") return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    if (rel === "FATHER") return "bg-green-500/10 text-green-500 border-green-500/20";
    if (rel === "SPOUSE") return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    if (rel === "CHILD") return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
  };

  const getProfileBadgeColor = (relation: string) => {
    const rel = relation.toUpperCase();
    if (rel === "SELF") return "bg-blue-500";
    if (rel === "MOTHER") return "bg-purple-500";
    if (rel === "FATHER") return "bg-green-500";
    if (rel === "SPOUSE") return "bg-orange-500";
    if (rel === "CHILD") return "bg-yellow-500";
    return "bg-indigo-500";
  };

  const handleSelect = (id: string) => {
    changeActiveProfile(id);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-white/5 bg-white/70 dark:bg-[#151A23]/70 hover:bg-neutral-50 dark:hover:bg-white/10 hover:border-neutral-300 dark:hover:border-white/10 transition-all duration-200 shadow-sm text-sm font-semibold text-neutral-800 dark:text-neutral-200 backdrop-blur-md active:scale-98"
      >
        {activeProfileId === "all" ? (
          <>
            <div className="h-5 w-5 rounded-full bg-primary-500/10 text-primary-500 border border-primary-500/20 flex items-center justify-center shadow-inner">
              <Users size={12} className="stroke-[2.5]" />
            </div>
            <span>All Family</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-500/10 text-primary-500 font-bold border border-primary-500/25">
              ⭐
            </span>
          </>
        ) : (
          <>
            <div
              className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-inner ${getProfileBadgeColor(
                activeProfile?.relation || "other"
              )}`}
            >
              {activeProfile?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="truncate max-w-[100px]">
              {activeProfile?.name}
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase border ${getProfileColorClass(
                activeProfile?.relation || "other"
              )}`}
            >
              {activeProfile?.relation}
            </span>
          </>
        )}
        <ChevronDown
          size={14}
          className={`text-neutral-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white/95 dark:bg-[#151A23]/95 shadow-xl shadow-neutral-900/10 dark:shadow-black/40 backdrop-blur-xl z-50 py-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 pb-1.5 mb-1.5 border-b border-neutral-200/50 dark:border-white/5">
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Switch investment profile
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-0.5 px-1.5">
            {/* All Family (Hero Option First) */}
            <button
              onClick={() => handleSelect("all")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-150 text-sm font-medium ${
                activeProfileId === "all"
                  ? "bg-primary-500/10 text-primary-700 dark:text-primary-300"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center border border-primary-500/20 shadow-sm">
                  <Star size={11} className="stroke-[2.5]" />
                </div>
                <span>All Family Portfolio</span>
              </div>
              {activeProfileId === "all" && (
                <Check size={14} className="text-primary-600 dark:text-primary-400 stroke-[2.5]" />
              )}
            </button>

            {/* Individual Profiles */}
            {profiles.map((p) => {
              const isSelected = activeProfileId === String(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelect(String(p.id))}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-150 text-sm font-medium ${
                    isSelected
                      ? "bg-primary-500/10 text-primary-700 dark:text-primary-300"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${getProfileBadgeColor(
                        p.relation
                      )}`}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col items-start leading-tight">
                      <span className="truncate max-w-[130px]">{p.name}</span>
                      <span className="text-[9px] text-neutral-400 dark:text-neutral-500">
                        {p.relation} {p.is_default && "• Default"}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <Check size={14} className="text-primary-600 dark:text-primary-400 stroke-[2.5]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Action Links */}
          <div className="mt-2 pt-2 border-t border-neutral-200/50 dark:border-white/5 px-2.5">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.8 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors text-center"
            >
              <Plus size={12} className="stroke-[2.5]" />
              Manage Profiles
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

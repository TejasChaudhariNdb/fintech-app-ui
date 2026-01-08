import React, { useState, useRef, useEffect } from "react";
import Card from "../ui/Card";
import ProgressBar from "../ui/ProgressBar";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

interface GoalCardProps {
  id: number;
  name: string;
  target: number;
  current: number;
  progress: number;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function GoalCard({
  name,
  target,
  current,
  progress,
  onClick,
  onEdit,
  onDelete,
}: GoalCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Card
      className="p-5 bg-surface border border-neutral-200 dark:border-white/5 hover:bg-surface-highlight transition-colors relative"
      onClick={onClick}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {name}
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Target:{" "}
            <span className="text-neutral-700 dark:text-neutral-200">
              ₹{target.toLocaleString("en-IN")}
            </span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* Mobile-First Dropdown Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
              <MoreVertical size={18} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-[#1A1F2B] border border-neutral-200 dark:border-white/10 rounded-xl shadow-xl z-20 overflow-hidden animate-fade-in">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5 flex items-center gap-2">
                    <Pencil size={14} /> Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2">
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="text-right bg-primary-50 dark:bg-primary-500/10 px-3 py-1 rounded-lg border border-primary-100 dark:border-primary-500/20">
            <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
              {progress.toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      <ProgressBar
        progress={progress}
        className="mb-4 h-3 bg-neutral-200 dark:bg-black/20"
      />

      <div className="flex justify-between text-sm font-medium">
        <span className="text-neutral-500 dark:text-neutral-400">
          Current:{" "}
          <span className="text-neutral-900 dark:text-white">
            ₹{current.toLocaleString("en-IN")}
          </span>
        </span>
        <span className="text-neutral-500 dark:text-neutral-400">
          Remaining:{" "}
          <span className="text-neutral-700 dark:text-neutral-200">
            ₹{(target - current).toLocaleString("en-IN")}
          </span>
        </span>
      </div>
    </Card>
  );
}

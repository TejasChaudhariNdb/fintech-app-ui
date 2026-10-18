"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import GoldForm, { GoldHoldingFormData } from "./GoldForm";

interface GoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: GoldHoldingFormData) => Promise<void>;
  rates: {
    rate_24k_per_gram?: number;
    rate_22k_per_gram?: number;
    rate_18k_per_gram?: number;
  } | null;
  initialData?: GoldHoldingFormData | null;
}

export default function GoldModal({
  isOpen,
  onClose,
  onSave,
  rates,
  initialData,
}: GoldModalProps) {
  const isEditing = Boolean(initialData?.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Gold Holding" : "Add Physical Gold"}
    >
      <div className="pb-4">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 -mt-1">
          Track jewelry, bullion, coins, or digital gold with live spot rates and returns.
        </p>
        <GoldForm
          initialData={initialData}
          rates={rates}
          onSave={async (data) => {
            await onSave(data);
            onClose();
          }}
          onCancel={onClose}
        />
      </div>
    </Modal>
  );
}

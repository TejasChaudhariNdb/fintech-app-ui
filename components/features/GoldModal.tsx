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
      title={isEditing ? "Edit Gold" : "Add Gold"}
    >
      <div className="pb-6">
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

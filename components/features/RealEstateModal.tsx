"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import RealEstateForm, { RealEstateFormData } from "./RealEstateForm";

interface RealEstateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: RealEstateFormData) => Promise<void>;
  initialData?: RealEstateFormData | null;
}

export default function RealEstateModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: RealEstateModalProps) {
  const isEditing = Boolean(initialData?.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Real Estate Asset" : "Add Property to Vault"}
    >
      <div className="pb-4">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 -mt-1">
          Track residential apartments, commercial units, or land parcels with true acquisition cost basis, appreciation CAGR, and rental yields.
        </p>
        <RealEstateForm
          initialData={initialData}
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

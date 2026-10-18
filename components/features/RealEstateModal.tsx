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
      title={isEditing ? "Edit Property" : "Add Property"}
    >
      <div className="pb-6">
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

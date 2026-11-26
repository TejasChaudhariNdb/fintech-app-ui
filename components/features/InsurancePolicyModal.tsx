"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import InsurancePolicyForm, { InsurancePolicyFormData } from "./InsurancePolicyForm";

interface InsurancePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: InsurancePolicyFormData) => Promise<void>;
  initialData?: InsurancePolicyFormData | null;
}

export default function InsurancePolicyModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: InsurancePolicyModalProps) {
  const isEditing = Boolean(initialData?.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Policy" : "Add Insurance Policy"}
    >
      <div className="pb-4">
        <InsurancePolicyForm
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

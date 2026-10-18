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
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 -mt-1">
          Store term life, health floater, or motor policies with renewal countdowns and family protection summaries.
        </p>
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

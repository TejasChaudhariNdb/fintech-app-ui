"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import FixedIncomeForm, { FixedIncomeFormData } from "./FixedIncomeForm";

interface FixedIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FixedIncomeFormData) => Promise<void>;
  initialData?: FixedIncomeFormData | null;
}

export default function FixedIncomeModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: FixedIncomeModalProps) {
  const isEditing = Boolean(initialData?.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Deposit Holding" : "Add Fixed Income / Deposit"}
    >
      <div className="pb-4">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 -mt-1">
          {isEditing
            ? "Update your deposit details and interest rates."
            : "Log Bank FDs, Post Office, Bonds, or PPF with automated compounding."}
        </p>
        <FixedIncomeForm
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

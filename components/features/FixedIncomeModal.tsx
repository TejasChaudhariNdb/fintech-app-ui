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
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 -mt-1">
          Track Bank FDs, Corporate FDs, RDs, or PPF with automated interest accrual &amp; maturity dates.
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

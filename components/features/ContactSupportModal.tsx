import React from "react";
import Modal from "@/components/ui/Modal";
import { Mail, Phone, MessageCircle, Users } from "lucide-react";

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactSupportModal({
  isOpen,
  onClose,
}: ContactSupportModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Contact Support">
      <div className="space-y-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Have a question or need help? Reach out to us directly.
        </p>

        {/* Email */}
        <a
          href="mailto:arthaviapp@gmail.com"
          className="flex items-center gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors">
          <div className="p-3 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full">
            <Mail size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              Email Us
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 break-all">
              arthaviapp@gmail.com
            </p>
          </div>
        </a>

        {/* Phone */}
        <a
          href="tel:+919158110065"
          className="flex items-center gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors">
          <div className="p-3 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">
            <Phone size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              Call Us
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              +91 9158110065
            </p>
          </div>
        </a>

        {/* WhatsApp */}
        <a
          href="https://wa.me/919158110065"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full">
            <MessageCircle size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              WhatsApp Support
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Chat on WhatsApp (+91 91581 10065)
            </p>
          </div>
        </a>

        {/* WhatsApp Community */}
        <a
          href="https://chat.whatsapp.com/H6QTnlcJLSIEBS6r8UG2Mi"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 rounded-xl bg-[#25D366]/5 dark:bg-[#25D366]/10 hover:bg-[#25D366]/10 dark:hover:bg-[#25D366]/15 border border-[#25D366]/25 transition-colors">
          <div className="p-3 bg-[#25D366] text-white rounded-full">
            <Users size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                Arthavi WhatsApp Community
              </p>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#25D366]/20 text-[#25D366] uppercase">
                Join
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Connect with fellow investors &amp; discuss ideas
            </p>
          </div>
        </a>
      </div>
    </Modal>
  );
}

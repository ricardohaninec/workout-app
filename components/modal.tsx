"use client";

import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className={`flex max-h-[90vh] flex-col gap-0 border border-white/10 bg-[#111111] p-0 shadow-2xl sm:rounded-xl ${className ?? ""}`}
      >
        {/* Header */}
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-white/[0.05] px-5 py-4">
          <DialogTitle className="text-[18px] font-bold text-white">
            {title}
          </DialogTitle>
          <button
            onClick={onClose}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-white/5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </DialogHeader>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

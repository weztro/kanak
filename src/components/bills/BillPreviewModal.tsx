"use client";

import * as React from "react";
import { getSignedBillUrl } from "@/server/actions/purchases";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, ExternalLink, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface Props {
  filePath: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BillPreviewModal({
  filePath,
  fileName,
  mimeType,
  isOpen,
  onClose,
}: Props) {
  const [signedUrl, setSignedUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && filePath) {
      setLoading(true);
      getSignedBillUrl(filePath)
        .then((url) => {
          setSignedUrl(url);
        })
        .catch(() => {
          toast.error("Failed to generate secure bill preview URL");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setSignedUrl(null);
    }
  }, [isOpen, filePath]);

  const isPdf = mimeType?.includes("pdf") || fileName?.toLowerCase().endsWith(".pdf");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="pb-2 border-b border-neutral-100 dark:border-neutral-800 flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-semibold flex items-center space-x-2">
            {isPdf ? (
              <FileText className="h-4 w-4 text-red-500" />
            ) : (
              <ImageIcon className="h-4 w-4 text-blue-500" />
            )}
            <span className="truncate max-w-sm">{fileName || "Purchase Bill"}</span>
          </DialogTitle>
          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={fileName || "purchase-receipt"}
              className="mr-6 inline-flex items-center text-xs text-neutral-500 hover:text-neutral-900"
            >
              <Download className="mr-1 h-3.5 w-3.5" /> Download
            </a>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-auto flex items-center justify-center min-h-[300px] p-2 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg mt-2">
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          ) : !signedUrl ? (
            <p className="text-xs text-neutral-400">Unable to load receipt preview.</p>
          ) : isPdf ? (
            <iframe
              src={signedUrl}
              className="w-full h-[65vh] rounded border border-neutral-200 dark:border-neutral-800"
              title="PDF Preview"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signedUrl}
              alt="Receipt Bill"
              className="max-h-[65vh] w-auto object-contain rounded shadow-xs"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


import { Printer, Download, ExternalLink, X, Info } from 'lucide-react';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  htmlContent: string;
  onPrint: () => void;
  onOpenInSystemViewer?: () => Promise<void>;
  onDownloadPdf?: () => Promise<void>;
}

export function PrintPreviewModal({
  isOpen,
  onClose,
  title,
  htmlContent,
  onPrint,
  onOpenInSystemViewer,
  onDownloadPdf,
}: PrintPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Live visual print preview</p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenInSystemViewer && (
              <button
                onClick={onOpenInSystemViewer}
                className="inline-flex items-center px-3 py-1.5 border border-indigo-200 text-xs font-semibold rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors shadow-sm"
                title="Open in Microsoft Edge or Adobe Acrobat with full interactive preview"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open in PDF Viewer
              </button>
            )}

            {onDownloadPdf && (
              <button
                onClick={onDownloadPdf}
                className="inline-flex items-center px-3 py-1.5 border border-gray-200 text-xs font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Download className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                Download PDF
              </button>
            )}

            <button
              onClick={onPrint}
              className="inline-flex items-center px-4 py-1.5 border border-transparent text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print Now
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200/50 transition-colors ml-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Windows Desktop App Notice */}
        <div className="bg-amber-50/80 border-b border-amber-100 px-6 py-2.5 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">Desktop Print Tip:</span> When you click <strong>Print Now</strong>, the Windows print dialog will show <em>"This app doesn't support print preview"</em> because Electron is a desktop app. Clicking <strong>Print</strong> in that dialog prints normally. To view with full interactive zoom & preview, click <strong>Open in PDF Viewer</strong> above to launch Microsoft Edge.
          </div>
        </div>

        {/* Preview Frame */}
        <div className="p-6 bg-gray-100/70 flex-1 overflow-auto flex justify-center">
          <div className="w-full max-w-4xl bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
            <iframe
              srcDoc={htmlContent}
              title="Print Document Preview"
              className="w-full h-[62vh] border-0"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div>Global Agencies Management System</div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

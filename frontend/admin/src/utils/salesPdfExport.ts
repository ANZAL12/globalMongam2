import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '../assets/logo.png';

export interface ExportableSale {
  id: string;
  product_name: string;
  model_no?: string | null;
  serial_no?: string | null;
  bill_no?: string | null;
  bill_amount: string | number;
  status: string;
  incentive_amount?: string | number | null;
  payment_status?: string | null;
  created_at: string;
  paid_at?: string | null;
  promoter_name?: string | null;
  promoter_email?: string | null;
  promoter_phone?: string | null;
  promoter_gpay?: string | null;
  promoter_upi?: string | null;
  approver_name?: string | null;
  approver_notes?: string | null;
  rejection_reason?: string | null;
  transaction_id?: string | null;
}

/**
 * Helper to convert image URL/asset into base64 data URL
 */
function getBase64Image(url: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        console.error('Error converting logo to base64:', e);
        resolve('');
      }
    };
    img.onerror = () => {
      console.warn('Failed to load logo from URL:', url);
      resolve('');
    };
    img.src = url;
  });
}

/**
 * Format currency safely for standard PDF fonts
 */
function formatCurrency(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return 'Rs. 0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'Rs. 0';
  return `Rs. ${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/**
 * Format date for readability
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }) + ' ' + d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Readable status labels
 */
function getStatusLabel(status: string, approverName?: string | null): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'approver_approved':
      return approverName ? `Approved (${approverName})` : 'Approved (Approver)';
    case 'approved':
      return 'Approved';
    case 'paid':
      return 'Paid';
    case 'rejected':
      return 'Rejected';
    default:
      return (status || 'Unknown').replace(/_/g, ' ').toUpperCase();
  }
}

/**
 * Export all sales or filtered sales to a comprehensive PDF
 */
export async function exportAllSalesToPdf(
  sales: ExportableSale[],
  options?: {
    filterTitle?: string;
    searchTerm?: string;
  }
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  // 1. Fetch base64 logo
  const logoData = await getBase64Image(logoUrl);

  // Calculate Summary KPIs
  const totalCount = sales.length;
  const totalBillAmount = sales.reduce((sum, s) => {
    const amt = typeof s.bill_amount === 'string' ? parseFloat(s.bill_amount) : Number(s.bill_amount);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  const totalIncentives = sales.reduce((sum, s) => {
    if (!s.incentive_amount) return sum;
    const amt = typeof s.incentive_amount === 'string' ? parseFloat(s.incentive_amount) : Number(s.incentive_amount);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  // Render Header function
  const renderHeader = () => {
    // Logo
    if (logoData) {
      doc.addImage(logoData, 'PNG', margin, 8, 26, 26);
    }

    // Company & Document Title
    const titleStartX = logoData ? margin + 30 : margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(225, 29, 72); // Brand Red
    doc.text('GLOBAL AGENCIES', titleStartX, 15);

    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55); // Dark Slate
    doc.text('SALES AUDIT & COMPLETE DETAILS REPORT', titleStartX, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128); // Gray
    const generatedDateStr = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    let subline = `Generated on: ${generatedDateStr}`;
    if (options?.filterTitle && options.filterTitle !== 'all') {
      subline += ` | Filter: ${options.filterTitle.toUpperCase()}`;
    }
    if (options?.searchTerm) {
      subline += ` | Search: "${options.searchTerm}"`;
    }
    doc.text(subline, titleStartX, 28);

    // Summary Metric Badges (Top Right)
    const cardWidth = 48;
    const cardHeight = 16;
    const cardGap = 4;
    const totalCardsWidth = cardWidth * 3 + cardGap * 2;
    const cardStartX = pageWidth - margin - totalCardsWidth;

    const stats = [
      { label: 'TOTAL SALES', value: String(totalCount) },
      { label: 'TOTAL BILL AMOUNT', value: formatCurrency(totalBillAmount) },
      { label: 'TOTAL INCENTIVES', value: formatCurrency(totalIncentives) },
    ];

    stats.forEach((stat, idx) => {
      const x = cardStartX + idx * (cardWidth + cardGap);
      const y = 10;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(stat.label, x + 4, y + 5.5);

      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(stat.value, x + 4, y + 12);
    });

    // Decorative Accent Line
    doc.setDrawColor(225, 29, 72);
    doc.setLineWidth(0.8);
    doc.line(margin, 38, margin + 45, 38);

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(margin + 45, 38, pageWidth - margin, 38);
  };

  renderHeader();

  // Table Data Mapping
  const tableData = sales.map((sale, index) => {
    const promoterText = [
      sale.promoter_name || '',
      sale.promoter_email || '',
      sale.promoter_phone ? `Ph: ${sale.promoter_phone}` : '',
    ].filter(Boolean).join('\n');

    const productText = [
      sale.product_name || 'N/A',
      sale.model_no ? `Mod: ${sale.model_no}` : '',
    ].filter(Boolean).join('\n');

    const approverDetails = [
      sale.approver_name || (sale.status === 'pending' ? 'Pending' : 'N/A'),
      sale.approver_notes ? `Note: ${sale.approver_notes}` : '',
      sale.rejection_reason ? `Reason: ${sale.rejection_reason}` : '',
    ].filter(Boolean).join('\n');

    const paymentInfo = [
      sale.payment_status ? `Pay: ${sale.payment_status.toUpperCase()}` : '',
      sale.transaction_id ? `Tx: ${sale.transaction_id}` : '',
      sale.paid_at ? `At: ${formatDate(sale.paid_at)}` : '',
    ].filter(Boolean).join('\n');

    return [
      String(index + 1),
      formatDate(sale.created_at),
      sale.bill_no || 'N/A',
      productText,
      sale.serial_no || 'N/A',
      formatCurrency(sale.bill_amount),
      promoterText || 'Unknown',
      getStatusLabel(sale.status, sale.approver_name),
      approverDetails,
      sale.incentive_amount ? formatCurrency(sale.incentive_amount) : 'Rs. 0',
      paymentInfo || 'N/A',
    ];
  });

  // Render Table
  autoTable(doc, {
    startY: 42,
    head: [[
      '#',
      'Date & Time',
      'Bill No',
      'Product & Model',
      'Serial No',
      'Bill Amount',
      'Promoter Details',
      'Status',
      'Approver & Remarks',
      'Incentive',
      'Payment & Tx ID',
    ]],
    body: tableData,
    theme: 'striped',
    margin: { left: margin, right: margin, bottom: 16 },
    headStyles: {
      fillColor: [24, 30, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [31, 41, 55],
      cellPadding: 2,
      valign: 'top',
    },
    alternateRowStyles: {
      fillColor: [249, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 20 },
      3: { cellWidth: 32 },
      4: { cellWidth: 24 },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 38 },
      7: { cellWidth: 24 },
      8: { cellWidth: 38 },
      9: { cellWidth: 20, halign: 'right' },
      10: { cellWidth: 23 },
    },
    didDrawPage: (data) => {
      // Re-add top header logo on subsequent pages if wanted
      if (data.pageNumber > 1 && logoData) {
        doc.addImage(logoData, 'PNG', margin, 5, 12, 12);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(225, 29, 72);
        doc.text('GLOBAL AGENCIES - SALES AUDIT REPORT', margin + 16, 12);
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.3);
        doc.line(margin, 19, pageWidth - margin, 19);
      }

      // Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);

      doc.text('Global Agencies Management System - Confidential', margin, pageHeight - 7);

      const pageStr = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`;
      doc.text(pageStr, pageWidth - margin - doc.getTextWidth(pageStr), pageHeight - 7);
    },
  });

  // Generate Filename
  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`Global_Agencies_Sales_Report_${dateStamp}.pdf`);
}

/**
 * Export a single sale voucher / docket with comprehensive details
 */
export async function exportSingleSaleToPdf(sale: ExportableSale): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const logoData = await getBase64Image(logoUrl);

  // Header Logo & Branding
  if (logoData) {
    doc.addImage(logoData, 'PNG', margin, 14, 30, 30);
  }

  const titleX = logoData ? margin + 34 : margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(225, 29, 72);
  doc.text('GLOBAL AGENCIES', titleX, 22);

  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  doc.text('SALE VOUCHER & AUDIT DOCKET', titleX, 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text(`Docket ID: ${sale.id}`, titleX, 36);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, titleX, 41);

  // Status Badge on Top Right
  const badgeWidth = 42;
  const badgeHeight = 12;
  const badgeX = pageWidth - margin - badgeWidth;
  const badgeY = 18;

  let badgeBg: [number, number, number] = [238, 242, 255];
  let badgeText: [number, number, number] = [79, 70, 229];
  if (sale.status === 'paid' || sale.status === 'approved' || sale.status === 'approver_approved') {
    badgeBg = [236, 253, 245];
    badgeText = [16, 185, 129];
  } else if (sale.status === 'rejected') {
    badgeBg = [254, 242, 242];
    badgeText = [239, 68, 68];
  } else if (sale.status === 'pending') {
    badgeBg = [255, 247, 237];
    badgeText = [249, 115, 22];
  }

  doc.setFillColor(...badgeBg);
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...badgeText);
  doc.text(
    getStatusLabel(sale.status).toUpperCase(),
    badgeX + badgeWidth / 2,
    badgeY + 7.5,
    { align: 'center' }
  );

  // Divider
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, 48, pageWidth - margin, 48);

  let currentY = 54;

  // Section 1: Product & Sale Information Table
  autoTable(doc, {
    startY: currentY,
    head: [['FIELD', 'PRODUCT & BILL SPECIFICATIONS']],
    body: [
      ['Product Name', sale.product_name || 'N/A'],
      ['Model Number', sale.model_no || 'N/A'],
      ['Serial Number', sale.serial_no || 'N/A'],
      ['Bill / Invoice Number', sale.bill_no || 'N/A'],
      ['Bill Amount', formatCurrency(sale.bill_amount)],
      ['Submission Date', formatDate(sale.created_at)],
    ],
    theme: 'grid',
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
    },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', textColor: [71, 85, 105] },
      1: { textColor: [15, 23, 42] },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Section 2: Promoter & Payment Details Table
  autoTable(doc, {
    startY: currentY,
    head: [['FIELD', 'PROMOTER & BENEFICIARY INFORMATION']],
    body: [
      ['Promoter Full Name', sale.promoter_name || 'N/A'],
      ['Promoter Email', sale.promoter_email || 'N/A'],
      ['Phone Number', sale.promoter_phone || 'N/A'],
      ['Google Pay Number', sale.promoter_gpay || 'N/A'],
      ['UPI ID', sale.promoter_upi || 'N/A'],
    ],
    theme: 'grid',
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
    },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', textColor: [71, 85, 105] },
      1: { textColor: [15, 23, 42] },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Section 3: Approver & Settlement Details Table
  autoTable(doc, {
    startY: currentY,
    head: [['FIELD', 'APPROVAL AUDIT & SETTLEMENT DETAILS']],
    body: [
      ['Sale Status', getStatusLabel(sale.status, sale.approver_name)],
      ['Approved / Verified By', sale.approver_name || 'Pending Review'],
      ['Approver Notes / Remarks', sale.approver_notes || 'None'],
      ['Rejection Reason', sale.rejection_reason || 'None'],
      ['Approved Incentive Amount', formatCurrency(sale.incentive_amount)],
      ['Payment Status', (sale.payment_status || 'Pending').toUpperCase()],
      ['Transaction ID / Ref', sale.transaction_id || 'N/A'],
      ['Payment Date', sale.paid_at ? formatDate(sale.paid_at) : 'N/A'],
    ],
    theme: 'grid',
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
    },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', textColor: [71, 85, 105] },
      1: { textColor: [15, 23, 42] },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 16;

  // Signatures / Authorization Section
  if (currentY + 28 < pageHeight - 15) {
    const sigBoxWidth = (contentWidth - 20) / 2;

    // Approver / Auditor Signature
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(margin, currentY + 18, margin + sigBoxWidth, currentY + 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Audited & Approved By', margin, currentY + 23);

    // Finance / Admin Signature
    const finX = margin + sigBoxWidth + 20;
    doc.line(finX, currentY + 18, finX + sigBoxWidth, currentY + 18);
    doc.text('Authorized Finance Signatory', finX, currentY + 23);
  }

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Global Agencies Official Record - System Generated Document', margin, pageHeight - 8);
  doc.text('Page 1 of 1', pageWidth - margin - 16, pageHeight - 8);

  const billOrId = sale.bill_no || sale.id.slice(0, 8);
  doc.save(`Global_Agencies_Sale_Voucher_${billOrId}.pdf`);
}

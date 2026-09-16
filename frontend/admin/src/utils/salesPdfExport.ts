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
  approved_at?: string | null;
  promoter_name?: string | null;
  promoter_email?: string | null;
  promoter_phone?: string | null;
  promoter_gpay?: string | null;
  promoter_upi?: string | null;
  approver_name?: string | null;
  approver_notes?: string | null;
  rejection_reason?: string | null;
  transaction_id?: string | null;
  bill_image_url?: string | null;
}

let cachedLogoData: string | null = null;

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

async function getLogoBase64(): Promise<string> {
  if (cachedLogoData) return cachedLogoData;
  cachedLogoData = await getBase64Image(logoUrl);
  return cachedLogoData;
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
 * Universal print helper that prints HTML using an isolated iframe.
 * Works seamlessly in both standard browsers and Electron without popups,
 * ensuring full visual print preview support without "preview not supported" errors.
 */
export function printHtml(html: string): void {
  const existing = document.getElementById('global-print-frame');
  if (existing) {
    existing.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'global-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = '1000px';
  iframe.style.height = '1000px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    alert('Unable to initiate print interface.');
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('Print execution error:', err);
    }
    // Clean up iframe after printing dialog closes or timeout
    setTimeout(() => {
      try {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      } catch {
        // ignore
      }
    }, 60000);
  };

  const images = doc.images;
  if (images.length > 0) {
    let loaded = 0;
    const total = images.length;
    const onImgComplete = () => {
      loaded++;
      if (loaded >= total) {
        setTimeout(triggerPrint, 150);
      }
    };
    for (let i = 0; i < total; i++) {
      if (images[i].complete) {
        loaded++;
      } else {
        images[i].onload = onImgComplete;
        images[i].onerror = onImgComplete;
      }
    }
    if (loaded >= total) {
      setTimeout(triggerPrint, 150);
    }
  } else {
    setTimeout(triggerPrint, 150);
  }
}

/**
 * Triggers document export/print. In Electron or web contexts where direct
 * PDF blob previewing is not natively supported by the printer dialog,
 * it saves the file directly.
 */
export function printPdfDoc(doc: jsPDF, filename = 'document.pdf'): void {
  try {
    doc.save(filename);
  } catch (err) {
    console.error('Failed to save document:', err);
  }
}

/**
 * Opens a generated jsPDF document in the system default PDF viewer
 * (e.g. Microsoft Edge / Adobe Acrobat on Windows) with full interactive preview and printing.
 */
export async function openPdfInSystemViewer(doc: jsPDF, filename = 'document.pdf'): Promise<boolean> {
  try {
    const dataUri = doc.output('datauristring');
    const base64Data = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
    if ((window as any).electron?.system?.openPdf) {
      const res = await (window as any).electron.system.openPdf({ base64Data, filename });
      return !!res?.success;
    } else {
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      return true;
    }
  } catch (err) {
    console.error('Failed to open PDF in system viewer:', err);
    doc.save(filename);
    return false;
  }
}

/**
 * Helper to print an image (e.g. submitted bill) directly with full print preview
 */
export function printImage(imageUrl: string, title = 'Bill Attachment'): void {
  const printDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @page {
            size: auto;
            margin: 10mm;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #ffffff;
            color: #0f172a;
            padding: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .header {
            width: 100%;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .title { font-size: 16px; font-weight: 800; color: #e11d48; }
          .subtitle { font-size: 13px; font-weight: 600; color: #334155; }
          .meta { font-size: 11px; color: #64748b; text-align: right; }
          .img-container {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
          }
          img {
            max-width: 100%;
            max-height: 85vh;
            object-fit: contain;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
          }
          @media print {
            body { padding: 0; }
            .header { margin-bottom: 12px; }
            img { max-height: 90vh; border: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">GLOBAL AGENCIES</div>
            <div class="subtitle">BILL ATTACHMENT / PROOF OF SALE</div>
          </div>
          <div class="meta">
            <div><strong>Document:</strong> ${title}</div>
            <div><strong>Printed:</strong> ${printDate}</div>
          </div>
        </div>
        <div class="img-container">
          <img src="${imageUrl}" alt="${title}" />
        </div>
      </body>
    </html>
  `;
  printHtml(html);
}

/**
 * Generate all sales / report PDF Document
 */
export async function generateAllSalesPdfDoc(
  sales: ExportableSale[],
  options?: {
    filterTitle?: string;
    searchTerm?: string;
  }
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  // 1. Fetch base64 logo
  const logoData = await getLogoBase64();

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

  return doc;
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
  const doc = await generateAllSalesPdfDoc(sales, options);
  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`Global_Agencies_Sales_Report_${dateStamp}.pdf`);
}

/**
 * Generates the clean HTML string for the all-sales audit report
 */
export async function generateAllSalesHtml(
  sales: ExportableSale[],
  options?: {
    filterTitle?: string;
    searchTerm?: string;
  }
): Promise<string> {
  const logoData = await getLogoBase64();
  const dateStamp = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const totalSales = sales.length;
  const totalBill = sales.reduce((sum, s) => sum + Number(s.bill_amount || 0), 0);
  const totalIncentive = sales.reduce((sum, s) => sum + Number(s.incentive_amount || 0), 0);
  const paidCount = sales.filter(s => s.payment_status === 'paid' || s.status === 'paid').length;

  const rowsHtml = sales.map((sale, idx) => {
    const isPaid = sale.payment_status === 'paid' || sale.status === 'paid';
    const statusText = getStatusLabel(sale.status, sale.approver_name);
    const dateFormatted = formatDate(sale.created_at);

    return `
      <tr>
        <td style="text-align: center; color: #64748b;">${idx + 1}</td>
        <td>${dateFormatted}</td>
        <td style="font-weight: 600; color: #0f172a;">${sale.bill_no || '-'}</td>
        <td>
          <div style="font-weight: 600; color: #0f172a;">${sale.promoter_name || 'N/A'}</div>
          <div style="font-size: 10px; color: #64748b;">${sale.promoter_phone || sale.promoter_email || ''}</div>
        </td>
        <td>
          <div style="font-weight: 600; color: #0f172a;">${sale.product_name || '-'}</div>
          <div style="font-size: 10px; color: #64748b;">
            ${sale.model_no ? 'M: ' + sale.model_no : ''} 
            ${sale.serial_no ? ' | S/N: ' + sale.serial_no : ''}
          </div>
        </td>
        <td style="text-align: right; font-weight: 600; color: #0f172a;">
          ${formatCurrency(sale.bill_amount)}
        </td>
        <td style="text-align: right; font-weight: 600; color: #4338ca;">
          ${formatCurrency(sale.incentive_amount)}
        </td>
        <td style="text-align: center;">
          <span style="display: inline-block; padding: 2px 7px; font-size: 10px; font-weight: 600; border-radius: 9999px; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;">
            ${statusText}
          </span>
        </td>
        <td style="text-align: center;">
          <span style="display: inline-block; padding: 2px 7px; font-size: 10px; font-weight: 600; border-radius: 9999px; background: ${isPaid ? '#ecfdf5' : '#fffbeb'}; color: ${isPaid ? '#065f46' : '#92400e'}; border: 1px solid ${isPaid ? '#a7f3d0' : '#fde68a'};">
            ${isPaid ? 'Paid' : 'Unpaid'}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Global Agencies - Sales Audit Report</title>
        <style>
          @page {
            size: landscape;
            margin: 10mm;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            font-size: 12px;
            line-height: 1.4;
            padding: 8px;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
            margin-bottom: 12px;
          }
          .brand-box {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo {
            width: 44px;
            height: 44px;
            object-fit: contain;
          }
          .company-name {
            font-size: 18px;
            font-weight: 800;
            color: #e11d48;
            letter-spacing: -0.5px;
          }
          .report-title {
            font-size: 13px;
            font-weight: 600;
            color: #334155;
          }
          .meta-box {
            text-align: right;
            font-size: 11px;
            color: #64748b;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 14px;
          }
          .kpi-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 12px;
          }
          .kpi-label {
            font-size: 10px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .kpi-val {
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          thead tr {
            background-color: #f1f5f9;
          }
          th {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            text-align: left;
            font-weight: 700;
            color: #334155;
            font-size: 11px;
          }
          td {
            border: 1px solid #e2e8f0;
            padding: 6px 8px;
            vertical-align: middle;
          }
          tbody tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .footer {
            margin-top: 14px;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #94a3b8;
          }
          @media print {
            body { padding: 0; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand-box">
            ${logoData ? `<img class="logo" src="${logoData}" alt="Logo" />` : ''}
            <div>
              <div class="company-name">GLOBAL AGENCIES</div>
              <div class="report-title">Sales Audit & Disbursement Report</div>
            </div>
          </div>
          <div class="meta-box">
            <div><strong>Filter:</strong> ${options?.filterTitle || 'All Records'}</div>
            ${options?.searchTerm ? `<div><strong>Search:</strong> "${options.searchTerm}"</div>` : ''}
            <div><strong>Printed:</strong> ${dateStamp}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Total Records</div>
            <div class="kpi-val">${totalSales}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Bill Amount</div>
            <div class="kpi-val">${formatCurrency(totalBill)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Incentives</div>
            <div class="kpi-val" style="color: #4338ca;">${formatCurrency(totalIncentive)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Paid Sales</div>
            <div class="kpi-val" style="color: #059669;">${paidCount}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th style="width: 110px;">Date</th>
              <th style="width: 80px;">Bill No</th>
              <th>Promoter</th>
              <th>Product / Details</th>
              <th style="text-align: right; width: 90px;">Bill Amount</th>
              <th style="text-align: right; width: 90px;">Incentive</th>
              <th style="text-align: center; width: 100px;">Status</th>
              <th style="text-align: center; width: 70px;">Payment</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="9" style="text-align:center; padding: 20px; color: #94a3b8;">No sales records found</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <div>Global Agencies Confidential - Internal Audit & Accounts Record</div>
          <div>Page 1 of 1</div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Print all sales or filtered sales report directly with full visual print preview
 */
export async function printAllSales(
  sales: ExportableSale[],
  options?: {
    filterTitle?: string;
    searchTerm?: string;
  }
): Promise<void> {
  const html = await generateAllSalesHtml(sales, options);
  printHtml(html);
}

/**
 * Opens all sales report directly in the system PDF viewer (Microsoft Edge / Adobe Acrobat)
 */
export async function openAllSalesInSystemViewer(
  sales: ExportableSale[],
  options?: {
    filterTitle?: string;
    searchTerm?: string;
  }
): Promise<boolean> {
  const doc = await generateAllSalesPdfDoc(sales, options);
  const dateStamp = new Date().toISOString().slice(0, 10);
  return openPdfInSystemViewer(doc, `Global_Agencies_Sales_Report_${dateStamp}.pdf`);
}

/**
 * Generate single sale voucher / docket PDF document
 */
export async function generateSingleSalePdfDoc(sale: ExportableSale): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;

  const logoData = await getLogoBase64();

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

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Global Agencies Official Record - System Generated Document', margin, pageHeight - 8);
  doc.text('Page 1 of 1', pageWidth - margin - 16, pageHeight - 8);

  return doc;
}

/**
 * Export a single sale voucher / docket with comprehensive details
 */
export async function exportSingleSaleToPdf(sale: ExportableSale): Promise<void> {
  const doc = await generateSingleSalePdfDoc(sale);
  const billOrId = sale.bill_no || sale.id.slice(0, 8);
  doc.save(`Global_Agencies_Sale_Voucher_${billOrId}.pdf`);
}

/**
 * Generates the clean HTML string for a single sale voucher & docket
 */
export async function generateSingleSaleHtml(sale: ExportableSale): Promise<string> {
  const logoData = await getLogoBase64();
  const dateFormatted = formatDate(sale.created_at);
  const paidDateFormatted = sale.paid_at ? formatDate(sale.paid_at) : 'Not Paid';
  const isPaid = sale.payment_status === 'paid' || sale.status === 'paid';
  const statusLabel = getStatusLabel(sale.status, sale.approver_name);
  const printDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Sale Voucher - ${sale.bill_no || sale.id.slice(0, 8)}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            font-size: 13px;
            line-height: 1.5;
            padding: 8px 14px;
            width: 100%;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
            margin-bottom: 16px;
          }
          .brand-box {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo {
            width: 48px;
            height: 48px;
            object-fit: contain;
          }
          .company-name {
            font-size: 20px;
            font-weight: 800;
            color: #e11d48;
            letter-spacing: -0.5px;
          }
          .voucher-title {
            font-size: 12px;
            font-weight: 700;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .meta-box {
            text-align: right;
            font-size: 11px;
            color: #64748b;
          }
          .badges {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 6px;
          }
          .badge {
            padding: 3px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            display: inline-block;
          }
          .badge-status {
            background: #f1f5f9;
            color: #334155;
            border: 1px solid #cbd5e1;
          }
          .badge-paid {
            background: ${isPaid ? '#ecfdf5' : '#fffbeb'};
            color: ${isPaid ? '#065f46' : '#92400e'};
            border: 1px solid ${isPaid ? '#a7f3d0' : '#fde68a'};
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 14px;
          }
          .card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 14px 16px;
            background: #f8fafc;
          }
          .card-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #475569;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 10px;
            letter-spacing: 0.5px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 12.5px;
          }
          .row .label {
            color: #64748b;
            font-weight: 500;
          }
          .row .val {
            color: #0f172a;
            font-weight: 600;
            text-align: right;
          }
          .highlight-card {
            background: #eef2ff;
            border-color: #c7d2fe;
          }
          .highlight-val {
            font-size: 15px;
            font-weight: 800;
            color: #4338ca;
          }
          .footer {
            margin-top: 18px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 10.5px;
            color: #94a3b8;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand-box">
            ${logoData ? `<img class="logo" src="${logoData}" alt="Logo" />` : ''}
            <div>
              <div class="company-name">GLOBAL AGENCIES</div>
              <div class="voucher-title">SALE VOUCHER & AUDIT DOCKET</div>
            </div>
          </div>
          <div class="meta-box">
            <div><strong>Docket ID:</strong> ${sale.id}</div>
            <div><strong>Printed:</strong> ${printDate}</div>
            <div class="badges">
              ${isPaid ? (
                `<span class="badge badge-paid">Paid</span>`
              ) : (
                `<span class="badge badge-status">${statusLabel}</span>
                 <span class="badge badge-paid">Unpaid</span>`
              )}
            </div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="card-title">Sale & Product Information</div>
            <div class="row"><span class="label">Product:</span><span class="val">${sale.product_name || '-'}</span></div>
            <div class="row"><span class="label">Model No:</span><span class="val">${sale.model_no || '-'}</span></div>
            <div class="row"><span class="label">Serial No:</span><span class="val">${sale.serial_no || '-'}</span></div>
            <div class="row"><span class="label">Bill / Invoice No:</span><span class="val">${sale.bill_no || '-'}</span></div>
            <div class="row"><span class="label">Submission Date:</span><span class="val">${dateFormatted}</span></div>
            <div class="row" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
              <span class="label" style="font-weight: 700; color: #0f172a;">Bill Amount:</span>
              <span class="val" style="font-size: 13px; font-weight: 800; color: #0f172a;">${formatCurrency(sale.bill_amount)}</span>
            </div>
          </div>

          <div class="card">
            <div class="card-title">Promoter Information</div>
            <div class="row"><span class="label">Name:</span><span class="val">${sale.promoter_name || 'N/A'}</span></div>
            <div class="row"><span class="label">Email:</span><span class="val">${sale.promoter_email || 'N/A'}</span></div>
            <div class="row"><span class="label">Phone:</span><span class="val">${sale.promoter_phone || 'N/A'}</span></div>
            <div class="row"><span class="label">Google Pay:</span><span class="val">${sale.promoter_gpay || '-'}</span></div>
            <div class="row"><span class="label">UPI ID:</span><span class="val">${sale.promoter_upi || '-'}</span></div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="card-title">Approval & Audit Status</div>
            <div class="row"><span class="label">Approval Status:</span><span class="val">${isPaid ? 'Approved' : statusLabel}</span></div>
            <div class="row"><span class="label">Approved By:</span><span class="val">${sale.approver_name || 'Pending'}</span></div>
            <div class="row"><span class="label">Approver Notes:</span><span class="val">${sale.approver_notes || 'None'}</span></div>
            ${sale.rejection_reason ? `<div class="row"><span class="label" style="color: #b91c1c;">Rejection Reason:</span><span class="val" style="color: #b91c1c;">${sale.rejection_reason}</span></div>` : ''}
          </div>

          <div class="card highlight-card">
            <div class="card-title" style="color: #3730a3; border-color: #c7d2fe;">Incentive & Settlement</div>
            <div class="row"><span class="label">Payment Status:</span><span class="val">${isPaid ? 'Paid' : 'Unpaid'}</span></div>
            <div class="row"><span class="label">Paid At:</span><span class="val">${paidDateFormatted}</span></div>
            <div class="row"><span class="label">Transaction ID:</span><span class="val">${sale.transaction_id || '-'}</span></div>
            <div class="row" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #a5b4fc;">
              <span class="label" style="font-weight: 700; color: #312e81;">Incentive Amount:</span>
              <span class="val highlight-val">${formatCurrency(sale.incentive_amount)}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <div>Global Agencies Official Record - System Generated Document</div>
          <div>Page 1 of 1</div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Print a single sale voucher / docket directly with full visual print preview
 */
export async function printSingleSale(sale: ExportableSale): Promise<void> {
  const html = await generateSingleSaleHtml(sale);
  printHtml(html);
}

/**
 * Opens a single sale voucher / docket directly in system PDF viewer (Microsoft Edge / Adobe Acrobat)
 */
export async function openSingleSaleInSystemViewer(sale: ExportableSale): Promise<boolean> {
  const doc = await generateSingleSalePdfDoc(sale);
  const billOrId = sale.bill_no || sale.id.slice(0, 8);
  return openPdfInSystemViewer(doc, `Global_Agencies_Sale_Voucher_${billOrId}.pdf`);
}

/**
 * Generates full-page dockets of all details for multiple sales (1 sale docket per page, not table form)
 */
export async function generateMultiSaleFullPagesHtml(sales: ExportableSale[]): Promise<string> {
  const logoData = await getLogoBase64();
  const printDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const pagesHtml = sales.map((sale, index) => {
    const dateFormatted = formatDate(sale.created_at);
    const paidDateFormatted = sale.paid_at ? formatDate(sale.paid_at) : 'Not Paid';
    const isPaid = sale.payment_status === 'paid' || sale.status === 'paid';
    const statusLabel = getStatusLabel(sale.status, sale.approver_name);
    const isLast = index === sales.length - 1;

    return `
      <div class="docket-page" style="${!isLast ? 'page-break-after: always; break-after: page; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 2px dashed #cbd5e1;' : ''}">
        <div class="header">
          <div class="brand-box">
            ${logoData ? `<img class="logo" src="${logoData}" alt="Logo" />` : ''}
            <div>
              <div class="company-name">GLOBAL AGENCIES</div>
              <div class="voucher-title">SALE VOUCHER & AUDIT DOCKET</div>
            </div>
          </div>
          <div class="meta-box">
            <div><strong>Docket ID:</strong> ${sale.id}</div>
            <div><strong>Printed:</strong> ${printDate}</div>
            <div class="badges">
              ${isPaid ? (
                `<span class="badge badge-paid">Paid</span>`
              ) : (
                `<span class="badge badge-status">${statusLabel}</span>
                 <span class="badge badge-paid">Unpaid</span>`
              )}
            </div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="card-title">Sale & Product Information</div>
            <div class="row"><span class="label">Product:</span><span class="val">${sale.product_name || '-'}</span></div>
            <div class="row"><span class="label">Model No:</span><span class="val">${sale.model_no || '-'}</span></div>
            <div class="row"><span class="label">Serial No:</span><span class="val">${sale.serial_no || '-'}</span></div>
            <div class="row"><span class="label">Bill / Invoice No:</span><span class="val">${sale.bill_no || '-'}</span></div>
            <div class="row"><span class="label">Submission Date:</span><span class="val">${dateFormatted}</span></div>
            <div class="row" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
              <span class="label" style="font-weight: 700; color: #0f172a;">Bill Amount:</span>
              <span class="val" style="font-size: 13px; font-weight: 800; color: #0f172a;">${formatCurrency(sale.bill_amount)}</span>
            </div>
          </div>

          <div class="card">
            <div class="card-title">Promoter Information</div>
            <div class="row"><span class="label">Name:</span><span class="val">${sale.promoter_name || 'N/A'}</span></div>
            <div class="row"><span class="label">Email:</span><span class="val">${sale.promoter_email || 'N/A'}</span></div>
            <div class="row"><span class="label">Phone:</span><span class="val">${sale.promoter_phone || 'N/A'}</span></div>
            <div class="row"><span class="label">Google Pay:</span><span class="val">${sale.promoter_gpay || '-'}</span></div>
            <div class="row"><span class="label">UPI ID:</span><span class="val">${sale.promoter_upi || '-'}</span></div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="card-title">Approval & Audit Status</div>
            <div class="row"><span class="label">Approval Status:</span><span class="val">${isPaid ? 'Approved' : statusLabel}</span></div>
            <div class="row"><span class="label">Approved By:</span><span class="val">${sale.approver_name || 'Pending'}</span></div>
            <div class="row"><span class="label">Approver Notes:</span><span class="val">${sale.approver_notes || 'None'}</span></div>
            ${sale.rejection_reason ? `<div class="row"><span class="label" style="color: #b91c1c;">Rejection Reason:</span><span class="val" style="color: #b91c1c;">${sale.rejection_reason}</span></div>` : ''}
          </div>

          <div class="card highlight-card">
            <div class="card-title" style="color: #3730a3; border-color: #c7d2fe;">Incentive & Settlement</div>
            <div class="row"><span class="label">Payment Status:</span><span class="val">${isPaid ? 'Paid' : 'Unpaid'}</span></div>
            <div class="row"><span class="label">Paid At:</span><span class="val">${paidDateFormatted}</span></div>
            <div class="row"><span class="label">Transaction ID:</span><span class="val">${sale.transaction_id || '-'}</span></div>
            <div class="row" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #a5b4fc;">
              <span class="label" style="font-weight: 700; color: #312e81;">Incentive Amount:</span>
              <span class="val highlight-val">${formatCurrency(sale.incentive_amount)}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <div>Global Agencies Official Record - Docket (${index + 1} of ${sales.length})</div>
          <div>Page ${index + 1} of ${sales.length}</div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Sale Dockets - Full Page Details</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            font-size: 13px;
            line-height: 1.5;
            padding: 8px 14px;
            width: 100%;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
            margin-bottom: 16px;
          }
          .brand-box {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo {
            width: 48px;
            height: 48px;
            object-fit: contain;
          }
          .company-name {
            font-size: 20px;
            font-weight: 800;
            color: #e11d48;
            letter-spacing: -0.5px;
          }
          .voucher-title {
            font-size: 12px;
            font-weight: 700;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .meta-box {
            text-align: right;
            font-size: 11px;
            color: #64748b;
          }
          .badges {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 6px;
          }
          .badge {
            padding: 3px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            display: inline-block;
          }
          .badge-status {
            background: #f1f5f9;
            color: #334155;
            border: 1px solid #cbd5e1;
          }
          .badge-paid {
            background: #ecfdf5;
            color: #065f46;
            border: 1px solid #a7f3d0;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 14px;
          }
          .card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 14px 16px;
            background: #f8fafc;
          }
          .card-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #475569;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 10px;
            letter-spacing: 0.5px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 12.5px;
          }
          .row .label {
            color: #64748b;
            font-weight: 500;
          }
          .row .val {
            color: #0f172a;
            font-weight: 600;
            text-align: right;
          }
          .highlight-card {
            background: #eef2ff;
            border-color: #c7d2fe;
          }
          .highlight-val {
            font-size: 15px;
            font-weight: 800;
            color: #4338ca;
          }
          .footer {
            margin-top: 18px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 10.5px;
            color: #94a3b8;
          }
          @media print {
            body { padding: 0; }
            .docket-page {
              page-break-after: always;
              break-after: page;
              border-bottom: none !important;
              margin-bottom: 0 !important;
              padding-bottom: 0 !important;
            }
            .docket-page:last-child {
              page-break-after: avoid;
              break-after: avoid;
            }
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
    </html>
  `;
}

'use client';

import { useEffect, useState } from 'react';
import { Invoice } from '@/lib/types';
import { getCompanyConfig } from '@/lib/companyConfigService';

interface InvoicePrintProps {
  invoice: Invoice;
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero';

  function convertHundreds(n: number): string {
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      return result;
    }
    if (n > 0) {
      result += ones[n] + ' ';
    }
    return result;
  }

  function convert(n: number): string {
    if (n === 0) return '';
    if (n >= 10000000) {
      return convert(Math.floor(n / 10000000)) + ' Crore ' + convert(n % 10000000);
    }
    if (n >= 100000) {
      return convert(Math.floor(n / 100000)) + ' Lakh ' + convert(n % 100000);
    }
    if (n >= 1000) {
      return convert(Math.floor(n / 1000)) + ' Thousand ' + convert(n % 1000);
    }
    return convertHundreds(n);
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = convert(rupees).trim() + ' Rupees';
  if (paise > 0) {
    result += ' and ' + convert(paise).trim() + ' Paise';
  }
  return result + ' Only';
}

export function InvoicePrint({ invoice }: InvoicePrintProps) {
  const [companyConfig, setCompanyConfig] = useState<any>(null);

  useEffect(() => {
    loadCompanyConfig();
  }, []);

  const loadCompanyConfig = async () => {
    try {
      const config = await getCompanyConfig();
      setCompanyConfig(config);
    } catch (err) {
      console.error('Failed to load company config:', err);
    }
  };

  const companyName = companyConfig?.name || '24X7 AUTO NATION';
  const companyGSTIN = companyConfig?.gstin || '02LSNPS6493R1ZC';
  const companyAddress = companyConfig?.address || 'BALOO P.O. SALIANA TEH. PALAMPUR DISTT. KANGRA (H.P.)';
  const companyPhone = companyConfig?.phone || '(M) 8626816424';
  const companyEmail = companyConfig?.email || 'E-Mail: 24x7autonation@gmail.com';

  return (
    <div className="invoice-print bg-white p-8 text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
      <style jsx>{`
        @media print {
          .no-print {
            display: none;
          }
          .invoice-print {
            padding: 0;
          }
        }
        .invoice-print {
          max-width: 210mm;
          margin: 0 auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
      `}</style>

      {/* Header */}
      <div className="mb-4">
        <div className="flex justify-between items-start mb-2">
          <div className="text-sm">GSTIN: {companyGSTIN}</div>
          <div className="text-right text-sm">
            <div>{companyPhone}</div>
            <div>{companyEmail}</div>
          </div>
        </div>
        <div className="text-center mb-2">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'serif' }}>
            {companyName}
          </h1>
        </div>
        <div className="text-center text-sm mb-4">
          {companyAddress}
        </div>
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold">INVOICE</h2>
        </div>
        <div className="flex justify-between mb-4">
          <div>
            <span className="font-semibold">Sr. No.</span> {invoice.invoiceNo.split('/').pop()}
          </div>
          <div>
            <span className="font-semibold">Date:</span> {invoice.invoiceDate.toLocaleDateString('en-IN')}
          </div>
        </div>
        <div className="mb-4">
          <span className="font-semibold">Name.</span> {invoice.customerName}
        </div>
      </div>

      {/* Items Table */}
      <table className="mb-4">
        <thead>
          <tr>
            <th style={{ width: '5%' }}>S. No.</th>
            <th style={{ width: '45%' }}>DESCRIPTION OF GOODS</th>
            <th style={{ width: '10%' }}>Qty</th>
            <th style={{ width: '15%' }}>Rate</th>
            <th style={{ width: '25%' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>
                {item.name}
                <br />
                <span className="text-xs">HSN: {item.hsnCode}</span>
              </td>
              <td>{item.quantity}</td>
              <td>₹{item.unitPrice.toFixed(2)}</td>
              <td>
                <div className="flex justify-between">
                  <span>Rs. {Math.floor(item.total)}</span>
                  <span>P. {Math.round((item.total - Math.floor(item.total)) * 100)}</span>
                </div>
              </td>
            </tr>
          ))}
          {/* Fill empty rows */}
          {Array.from({ length: Math.max(0, 14 - invoice.items.length) }).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td>{invoice.items.length + i + 1}</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary Section */}
      <div className="flex justify-between mb-4">
        <div style={{ width: '50%' }}>
          <div className="mb-2">
            <p className="font-semibold mb-1">Rupees in Words</p>
            <p className="text-sm border-b border-black pb-1" style={{ minHeight: '20px' }}>
              {numberToWords(invoice.total)}
            </p>
          </div>
          <div className="mt-4">
            <p className="text-xs">E. & O.E.</p>
          </div>
        </div>
        <div style={{ width: '45%' }}>
          <div className="mb-2">
            <div className="flex justify-between mb-1">
              <span>Total Taxable Amount</span>
              <span>₹{invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.gstType === 'CGST_SGST' ? (
              <>
                <div className="flex justify-between mb-1">
                  <span>CGST @ {invoice.items[0]?.gstSlab || 0}%</span>
                  <span>₹{invoice.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>SGST @ {invoice.items[0]?.gstSlab || 0}%</span>
                  <span>₹{invoice.sgst.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between mb-1">
                <span>IGST @ {invoice.items[0]?.gstSlab || 0}%</span>
                <span>₹{invoice.igst.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between mb-1 border-t border-black pt-1">
              <span className="font-semibold">Total</span>
              <span className="font-semibold">₹{invoice.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-black pt-1 mt-2">
              <span className="font-bold">Grand Total</span>
              <span className="font-bold">₹{invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between mt-8">
        <div>
          <p className="text-xs">Bank Details (if applicable)</p>
          {companyConfig?.bankDetails && (
            <div className="text-xs mt-1">
              {companyConfig.bankDetails.bankName && <p>Bank: {companyConfig.bankDetails.bankName}</p>}
              {companyConfig.bankDetails.accountNumber && <p>A/C: {companyConfig.bankDetails.accountNumber}</p>}
              {companyConfig.bankDetails.ifscCode && <p>IFSC: {companyConfig.bankDetails.ifscCode}</p>}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="mb-8">Signature</p>
        </div>
      </div>
    </div>
  );
}


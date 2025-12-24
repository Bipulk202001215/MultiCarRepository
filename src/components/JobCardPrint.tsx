'use client';

import { JobCard } from '@/lib/types';
import { useEffect, useRef } from 'react';

interface JobCardPrintProps {
  job: JobCard;
  onClose: () => void;
}

export function JobCardPrint({ job, onClose }: JobCardPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePrint = () => {
      window.print();
    };

    // Trigger print after component mounts
    handlePrint();

    // Close the print view after printing
    const handleAfterPrint = () => {
      onClose();
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [onClose]);

  const vehicleType = job.carMake && job.carModel 
    ? `${job.carMake} ${job.carModel}${job.carYear ? ` (${job.carYear})` : ''}`
    : '';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container,
          .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
        @media screen {
          .print-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .print-container {
            background: white;
            padding: 40px;
            max-width: 210mm;
            width: 100%;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
          }
        }
        .job-card {
          font-family: Arial, sans-serif;
          color: #000;
        }
        .job-card-title {
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          text-transform: uppercase;
          text-decoration: underline;
          margin-bottom: 30px;
        }
        .info-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 20px;
        }
        .section-header {
          background-color: #1e3a8a;
          color: white;
          padding: 8px 12px;
          font-weight: bold;
          font-size: 14px;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .info-field {
          margin-bottom: 15px;
        }
        .info-label {
          font-weight: bold;
          font-size: 12px;
          margin-bottom: 4px;
        }
        .info-value {
          border-bottom: 1px solid #000;
          min-height: 20px;
          padding-bottom: 2px;
          font-size: 12px;
        }
        .instructions-section {
          margin-top: 30px;
          margin-bottom: 20px;
        }
        .instructions-header {
          background-color: #1e3a8a;
          color: white;
          padding: 8px 12px;
          font-weight: bold;
          font-size: 14px;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .instructions-table {
          width: 100%;
          border-collapse: collapse;
        }
        .instructions-table th,
        .instructions-table td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
          font-size: 11px;
        }
        .instructions-table th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
        .labour-section {
          margin-top: 20px;
        }
        .labour-header {
          background-color: #1e3a8a;
          color: white;
          padding: 8px 12px;
          font-weight: bold;
          font-size: 14px;
          text-transform: uppercase;
          margin-bottom: 10px;
          display: inline-block;
        }
        .labour-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        .labour-table th,
        .labour-table td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
          font-size: 11px;
        }
        .labour-table th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
        .print-button {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #1e3a8a;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          z-index: 10000;
        }
        .print-button:hover {
          background: #1e40af;
        }
      ` }} />

      <div className="print-overlay no-print">
        <div className="print-container" ref={printRef}>
          <div className="job-card">
            <h1 className="job-card-title">JOB CARD</h1>

            <div className="info-section">
              {/* Customer Section */}
              <div>
                <div className="section-header">CUSTOMER</div>
                <div className="info-field">
                  <div className="info-label">NAME:</div>
                  <div className="info-value">{job.customerName || ''}</div>
                </div>
                <div className="info-field">
                  <div className="info-label">ADDRESS:</div>
                  <div className="info-value"></div>
                </div>
                <div className="info-field">
                  <div className="info-label">CONTACT:</div>
                  <div className="info-value">{job.mobile || ''}</div>
                </div>
              </div>

              {/* Vehicle Section */}
              <div>
                <div className="section-header">VEHICLE</div>
                <div className="info-field">
                  <div className="info-label">TYPE:</div>
                  <div className="info-value">{vehicleType || ''}</div>
                </div>
                <div className="info-field">
                  <div className="info-label">REG NO:</div>
                  <div className="info-value">{job.vehicleNo || ''}</div>
                </div>
                <div className="info-field">
                  <div className="info-label">ENGINE NO:</div>
                  <div className="info-value"></div>
                </div>
              </div>
            </div>

            {/* Customer Instructions Section */}
            <div className="instructions-section">
              <div className="instructions-header">CUSTOMER INSTRUCTIONS CARRIED OUT</div>
              <table className="instructions-table">
                <thead>
                  <tr>
                    <th style={{ width: '50%' }}>Description</th>
                    <th style={{ width: '25%' }}>Service Type</th>
                    <th style={{ width: '25%' }}>Estimated Time</th>
                  </tr>
                </thead>
                <tbody>
                  {job.jobDescriptions && job.jobDescriptions.length > 0 ? (
                    job.jobDescriptions.map((desc, index) => (
                      <tr key={index}>
                        <td>{desc.description || ''}</td>
                        <td>{desc.serviceType || ''}</td>
                        <td>{desc.estimatedTime || ''}</td>
                      </tr>
                    ))
                  ) : (
                    Array.from({ length: 10 }).map((_, index) => (
                      <tr key={index}>
                        <td></td>
                        <td></td>
                        <td></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Labour Charges Section */}
            <div className="labour-section">
              <div className="labour-header">LABOUR CHARGES</div>
              <table className="labour-table">
                <thead>
                  <tr>
                    <th style={{ width: '50%' }}>Description</th>
                    <th style={{ width: '25%' }}>Mechanic Type</th>
                    <th style={{ width: '25%' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {job.jobDescriptions && job.jobDescriptions.length > 0 ? (
                    job.jobDescriptions
                      .filter(desc => desc.assignedMechanicType || desc.description)
                      .map((desc, index) => (
                        <tr key={index}>
                          <td>{desc.description || ''}</td>
                          <td>{desc.assignedMechanicType || ''}</td>
                          <td></td>
                        </tr>
                      ))
                  ) : (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}>
                        <td></td>
                        <td></td>
                        <td></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <button className="print-button" onClick={() => window.print()}>
          Print Job Card
        </button>
        <button
          className="print-button"
          onClick={onClose}
          style={{ right: '140px', background: '#6b7280' }}
        >
          Close
        </button>
      </div>
    </>
  );
}


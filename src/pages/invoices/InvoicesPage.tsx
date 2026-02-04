import { useState, FormEvent, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { createInvoiceApi, getInvoicesApi, getInvoiceByIdApi, getFullInvoiceApi, getPendingJobs } from '@/lib/apiClient';
import { getCompanyConfig } from '@/lib/companyConfigService';
import { getJobCard } from '@/lib/jobService';
import { getAllParts, searchPartByCode } from '@/lib/inventoryService';
import { Part } from '@/lib/types';
import partData from '@/partData.json';

interface PartDataItem {
  PART_No: string;
  PART_DESC: string;
  Company: string;
  'HSN Code'?: number;
}

interface InvoiceItem {
  partCode: string;
  units: number;
}

interface SubmittedInvoice {
  id: string;
  jobId: string;
  companyId: string;
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID';
  paymentMode: 'CASH' | 'UPI' | 'MIXED';
  items: InvoiceItem[];
  submittedAt: Date;
}

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState<'form' | 'table'>('form');
  const [submittedInvoices, setSubmittedInvoices] = useState<SubmittedInvoice[]>([]);
  const [editingInvoice, setEditingInvoice] = useState<SubmittedInvoice | null>(null);
  const [showPdfView, setShowPdfView] = useState(false);
  const [companyConfig, setCompanyConfig] = useState<any>(null);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [pdfVehicleNo, setPdfVehicleNo] = useState<string>('');
  const [pdfItems, setPdfItems] = useState<any[]>([]);
  const [pdfNetCalculationAmount, setPdfNetCalculationAmount] = useState<number | null>(null);
  const [pdfTotalForTaxableAmount, setPdfTotalForTaxableAmount] = useState<number | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [additionalDetails, setAdditionalDetails] = useState<any>(null);

  // Jobs
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [pendingJobs, setPendingJobs] = useState<any[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const jobDropdownRef = useRef<HTMLDivElement | null>(null);
  
  // Additional Details
  const [customerName, setCustomerName] = useState<string>('');
  const [customerGstin, setCustomerGstin] = useState<string>('');

  // Invoice items
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);

  // Inventory parts (for Add Item dropdown – selection only, no manual part code)
  const [inventoryParts, setInventoryParts] = useState<Part[]>([]);
  const [partFilterByRow, setPartFilterByRow] = useState<{ [key: string]: string }>({});
  const [showPartDropdown, setShowPartDropdown] = useState<{ [key: string]: boolean }>({});
  const partDropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Form state
  const [formData, setFormData] = useState({
    subtotal: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    paymentStatus: 'PENDING' as 'PENDING' | 'PARTIAL' | 'PAID',
    paymentMode: 'UPI' as 'CASH' | 'UPI' | 'MIXED',
  });

  const addItem = () => {
    setInvoiceItems([...invoiceItems, { partCode: '', units: 1 }]);
  };

  const removeItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const updateUnits = (index: number, units: number) => {
    if (units <= 0) {
      removeItem(index);
      return;
    }
    setInvoiceItems(invoiceItems.map((item, i) =>
      i === index ? { ...item, units } : item
    ));
  };

  // Function to get part description from partData.json by matching part code
  const getPartDescription = (partCode: string): string => {
    if (!partCode || partCode.trim() === '') return '';
    const trimmedPartCode = partCode.trim();
    // Try exact match first
    let matchedPart = (partData as PartDataItem[]).find(
      (part) => part.PART_No === trimmedPartCode
    );
    // If no exact match, try case-insensitive match
    if (!matchedPart) {
      matchedPart = (partData as PartDataItem[]).find(
        (part) => part.PART_No && String(part.PART_No).trim().toUpperCase() === trimmedPartCode.toUpperCase()
      );
    }
    return matchedPart?.PART_DESC || '';
  };

  // Function to get HSN Code from partData.json by matching part code (same lookup as description)
  const getPartHsnCode = (partCode: string): string => {
    if (!partCode || partCode.trim() === '') return '';
    const trimmedPartCode = partCode.trim();
    const list = Array.isArray(partData) ? (partData as PartDataItem[]) : [];
    let matchedPart = list.find((part) => String(part.PART_No ?? '').trim() === trimmedPartCode);
    if (!matchedPart) {
      matchedPart = list.find(
        (part) => String(part.PART_No ?? '').trim().toUpperCase() === trimmedPartCode.toUpperCase()
      );
    }
    const hsn = matchedPart?.['HSN Code'];
    return hsn != null ? String(hsn) : '';
  };

  const updatePartCode = (oldPartCode: string, newPartCode: string) => {
    setInvoiceItems(invoiceItems.map(item =>
      item.partCode === oldPartCode ? { ...item, partCode: newPartCode } : item
    ));
  };
  
  // Filter term per row – used only to filter dropdown; part code is set only on select
  const getFilteredInventoryPartsForKey = (dropdownKey: string): Part[] => {
    const term = (partFilterByRow[dropdownKey] ?? '').trim().toLowerCase();
    if (!term) return inventoryParts.slice(0, 100);
    return inventoryParts.filter(
      (p) =>
        (p.partCode && p.partCode.toLowerCase().includes(term)) ||
        (p.name && p.name.toLowerCase().includes(term))
    ).slice(0, 100);
  };

  // Handle filter input for invoice item part dropdown (does not set part code; part code is set only on select)
  const handleInvoicePartFilterChange = (value: string, index: number) => {
    const stableKey = `item-${index}`;
    setPartFilterByRow((prev) => ({ ...prev, [stableKey]: value }));
    setShowPartDropdown((prev) => ({ ...prev, [stableKey]: true }));
  };

  // Handle part selection from dropdown – only way to set part code for invoice item
  const handleInvoicePartSelect = (index: number, part: Part) => {
    setInvoiceItems(invoiceItems.map((item, idx) =>
      idx === index ? { ...item, partCode: part.partCode } : item
    ));
    const stableKey = `item-${index}`;
    setPartFilterByRow((prev) => ({ ...prev, [stableKey]: '' }));
    setShowPartDropdown((prev) => ({ ...prev, [stableKey]: false }));
  };
  
  // Load pending jobs on component mount
  useEffect(() => {
    const loadPendingJobs = async () => {
      try {
        const jobs = await getPendingJobs();
        setPendingJobs(jobs);
      } catch (error: any) {
        console.error('Failed to load pending jobs:', error);
      }
    };
    loadPendingJobs();
  }, []);

  // Load inventory parts for Add Item dropdown (selection only, no manual part code)
  useEffect(() => {
    const loadInventoryParts = async () => {
      if (!userData?.companyId) return;
      try {
        const parts = await getAllParts(userData.companyId);
        setInventoryParts(parts);
      } catch (err: any) {
        console.error('Failed to load inventory parts:', err);
      }
    };
    loadInventoryParts();
  }, [userData?.companyId]);

  // Handle job ID input change - filter by mobile number
  const handleJobIdChange = (value: string) => {
    setSelectedJobId(value);
    
    if (value.trim() === '') {
      setFilteredJobs([]);
      setShowJobDropdown(false);
      return;
    }
    
    // Normalize mobile number for comparison (remove +, -, spaces)
    const normalizedInput = value.replace(/[\s+\-]/g, '');
    
    // Filter jobs by mobile number
    const filtered = pendingJobs.filter((job) => {
      if (!job.mobileNumber) return false;
      // Normalize job mobile number
      const normalizedJobMobile = job.mobileNumber.replace(/[\s+\-]/g, '');
      // Check if job mobile number starts with or contains the input
      return normalizedJobMobile.includes(normalizedInput) || normalizedJobMobile.startsWith(normalizedInput);
    });
    
    setFilteredJobs(filtered.slice(0, 50)); // Limit to 50 results
    setShowJobDropdown(filtered.length > 0);
  };

  // Handle job selection from dropdown
  const handleJobSelect = (job: any) => {
    setSelectedJobId(job.jobCardId);
    setShowJobDropdown(false);
    setFilteredJobs([]);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close part dropdowns
      Object.keys(partDropdownRefs.current).forEach((key) => {
        const ref = partDropdownRefs.current[key];
        if (ref && !ref.contains(event.target as Node)) {
          setShowPartDropdown((prev: { [key: string]: boolean }) => ({ ...prev, [key]: false }));
        }
      });
      
      // Close job dropdown
      if (jobDropdownRef.current && !jobDropdownRef.current.contains(event.target as Node)) {
        setShowJobDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedJobId) {
      setError('Please enter a job ID');
      return;
    }

    if (invoiceItems.length === 0) {
      setError('Please add at least one item to the invoice');
      return;
    }

    if (!userData?.companyId || userData.companyId.trim() === '') {
      setError('Company not found. Please contact administrator to assign you to a company.');
      return;
    }

    // Validate that every part code exists in inventory
    const inventoryPartCodes = new Set(inventoryParts.map((p) => (p.partCode || '').trim().toLowerCase()));
    const invalidItem = invoiceItems.find(
      (item) => !item.partCode?.trim() || !inventoryPartCodes.has(item.partCode.trim().toLowerCase())
    );
    if (invalidItem) {
      setError(
        invalidItem.partCode?.trim()
          ? `Part code "${invalidItem.partCode.trim()}" is not present in inventory. Please select parts from the dropdown.`
          : 'One or more items have no part code. Please select a part code from the dropdown for each item.'
      );
      return;
    }

    setLoading(true);

    try {
      // Prepare invoice data in the exact format required
      const invoiceData: any = {
        jobId: selectedJobId.trim(),
        companyId: userData.companyId.trim(),
        paymentStatus: formData.paymentStatus,
        paymentMode: formData.paymentMode,
        items: invoiceItems.map(item => ({
          partCode: item.partCode.trim(),
          units: item.units,
        })),
      };
      
      // Add additionalDetails if customerName or customerGstin is provided
      if (customerName.trim() || customerGstin.trim()) {
        invoiceData.additionalDetails = {};
        if (customerName.trim()) {
          invoiceData.additionalDetails.name = customerName.trim();
        }
        if (customerGstin.trim()) {
          invoiceData.additionalDetails.customerGstin = customerGstin.trim();
        }
      }

      // Log the data being sent (for debugging)
      if (import.meta.env.DEV) {
        console.log('📤 Sending invoice data:', JSON.stringify(invoiceData, null, 2));
      }

      if (editingInvoice) {
        // Update existing invoice
        await createInvoiceApi(invoiceData);
        setSuccess('Invoice updated successfully!');
        
        // Update in submitted invoices list
        setSubmittedInvoices(submittedInvoices.map(inv =>
          inv.id === editingInvoice.id
            ? {
                ...inv,
                jobId: invoiceData.jobId,
                paymentStatus: invoiceData.paymentStatus,
                paymentMode: invoiceData.paymentMode,
                items: invoiceData.items,
              }
            : inv
        ));
      } else {
        // Create new invoice
        await createInvoiceApi(invoiceData);
        setSuccess('Invoice created successfully!');
        
        // Add to submitted invoices list
        const newInvoice: SubmittedInvoice = {
          id: Date.now().toString(),
          jobId: invoiceData.jobId,
          companyId: invoiceData.companyId,
          paymentStatus: invoiceData.paymentStatus,
          paymentMode: invoiceData.paymentMode,
          items: invoiceData.items,
          submittedAt: new Date(),
        };
        setSubmittedInvoices([newInvoice, ...submittedInvoices]);
      }
      
      // Reset form after success
      setTimeout(() => {
        setSelectedJobId('');
        setInvoiceItems([]);
        setEditingInvoice(null);
        setFormData({
          subtotal: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          paymentStatus: 'PENDING',
          paymentMode: 'UPI',
        });
        setCustomerName('');
        setCustomerGstin('');
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedJobId('');
    setInvoiceItems([]);
    setEditingInvoice(null);
    setFormData({
      subtotal: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      paymentStatus: 'PENDING',
      paymentMode: 'UPI',
    });
    setCustomerName('');
    setCustomerGstin('');
    setError('');
    setSuccess('');
  };

  // Number to words function for invoice
  const numberToWords = (num: number): string => {
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
  };

  // Load PDF data when PDF view opens (disabled - we call API directly in onClick)
  // useEffect(() => {
  //   if (showPdfView && editingInvoice) {
  //     loadPdfData();
  //   }
  // }, [showPdfView, editingInvoice]);

  const loadPdfData = async () => {
    const currentInvoice = editingInvoice;
    if (!currentInvoice) {
      console.error('❌ loadPdfData: editingInvoice is null');
      return;
    }
    
    try {
      setPdfLoading(true);
      console.log('🔄 Loading PDF data for invoice:', currentInvoice.id);
      
      // Load company config
      console.log('📋 Loading company config...');
      const config = await getCompanyConfig();
      setCompanyConfig(config);
      console.log('✅ Company config loaded');
      
      // Fetch full invoice details from API
      console.log('📞 Calling getFullInvoiceApi with invoiceId:', currentInvoice.id);
      const fullInvoice = await getFullInvoiceApi(currentInvoice.id);
      console.log('✅ Full invoice API response:', fullInvoice);
      
      // Extract job/customer details from full invoice response
      if (fullInvoice.jobDetails || fullInvoice.job) {
        setJobDetails(fullInvoice.jobDetails || fullInvoice.job);
      }
      
      // Extract additionalDetails from full invoice response
      if (fullInvoice.additionalDetails) {
        setAdditionalDetails(fullInvoice.additionalDetails);
      }
      
      // Extract items with full details from API response
      // The API should return items with all required fields
      if (fullInvoice.items && Array.isArray(fullInvoice.items)) {
        const itemsWithDetails = fullInvoice.items.map((item: any) => {
          const partCode = item.partCode || item.partcode || '';
          // Prioritize partData.json lookup over API's partDescription
          const partDescriptionFromJson = getPartDescription(partCode);
          const partDescription = partDescriptionFromJson || item.partDescription || item.name || item.partName || partCode || '';
          return {
            partCode: partCode,
            units: item.units || item.quantity || 0,
            partDescription: partDescription,
            unitsPrice: item.unitsPrice || item.unitPrice || item.rate || item.price || 0,
            totalPrice: item.totalPrice || (item.unitsPrice || item.unitPrice || 0) * (item.units || 0),
            discountPercentage: item.discountPercentage || item.discount || 0,
            discountedPrice: item.discountedPrice || item.totalPrice || ((item.unitsPrice || item.unitPrice || 0) * (item.units || 0)),
            name: item.name || item.partName || partCode || '',
            hsnCode: item.hsnCode || item.hsn || item.hsncode || '',
            unitPrice: item.unitPrice || item.rate || item.price || 0,
            gstSlab: item.gstSlab || item.gst || 9,
          };
        });
        setPdfItems(itemsWithDetails);
      } else {
        // Fallback to existing items if API doesn't return formatted items
        setPdfItems(editingInvoice.items.map((item: any) => {
          const partCode = item.partCode || '';
          const partDescription = getPartDescription(partCode) || partCode;
          return {
            ...item,
            partCode: partCode,
            partDescription: partDescription,
            unitsPrice: item.unitsPrice ?? item.unitPrice ?? 0,
            totalPrice: item.totalPrice ?? 0,
            discountPercentage: item.discountPercentage ?? 0,
            discountedPrice: item.discountedPrice ?? item.totalPrice ?? 0,
            name: item.name ?? partCode,
            hsnCode: item.hsnCode ?? item.hsn ?? item.hsncode ?? '',
            unitPrice: item.unitPrice ?? 0,
            gstSlab: item.gstSlab ?? 9,
          };
        }));
      }
      
      // Update form data with values from full invoice if available
      if (fullInvoice.subtotal !== undefined || fullInvoice.cgst !== undefined) {
        setFormData({
          subtotal: fullInvoice.subtotal || 0,
          cgst: fullInvoice.cgst || 0,
          sgst: fullInvoice.sgst || 0,
          igst: fullInvoice.igst || 0,
          paymentStatus: fullInvoice.paymentStatus || editingInvoice.paymentStatus,
          paymentMode: fullInvoice.paymentMode || editingInvoice.paymentMode,
        });
      }
      setPdfNetCalculationAmount(fullInvoice.netCalculationAmount ?? null);
      setPdfTotalForTaxableAmount(fullInvoice.total ?? null);
    } catch (err: any) {
      console.error('Failed to load PDF data:', err);
      // Fallback: try to load job details separately if API fails
      if (currentInvoice) {
        try {
          const job = await getJobCard(currentInvoice.jobId);
          setJobDetails(job);
        } catch (jobErr) {
          console.error('❌ Failed to load job:', jobErr);
        }
      }
    } finally {
      setPdfLoading(false);
      console.log('🏁 PDF data loading finished');
    }
  };

  const loadInvoices = async () => {
    try {
      setLoadingInvoices(true);
      setError('');
      
      if (!userData?.companyId || userData.companyId.trim() === '') {
        setError('Company not found. Please contact administrator to assign you to a company.');
        return;
      }

      const invoicesData = await getInvoicesApi(userData.companyId);
      
      // Transform API response to match SubmittedInvoice interface
      const transformedInvoices: SubmittedInvoice[] = invoicesData.map((invoice: any) => ({
        id: invoice.id || invoice.invoiceId || Date.now().toString(),
        jobId: invoice.jobId || '',
        companyId: invoice.companyId || userData.companyId,
        paymentStatus: invoice.paymentStatus || 'PENDING',
        paymentMode: invoice.paymentMode || 'UPI',
        items: invoice.items || [],
        submittedAt: invoice.createdAt ? new Date(invoice.createdAt) : new Date(),
      }));

      setSubmittedInvoices(transformedInvoices);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoadingInvoices(false);
    }
  };


  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-6xl min-w-0">
          <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
                Invoice Management
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                {editingInvoice ? 'Edit Invoice' : 'Create a new invoice'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {viewMode === 'table' ? (
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('form');
                    setEditingInvoice(null);
                    handleCancel();
                  }}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Create Invoice
                </button>
              ) : (
                <>
                  {editingInvoice && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const invoiceId = editingInvoice?.id;
                        console.log('🔵 View PDF button clicked!');
                        console.log('🔵 Invoice ID:', invoiceId);
                        console.log('🔵 editingInvoice:', editingInvoice);
                        
                        if (!invoiceId) {
                          console.error('❌ Invoice ID is missing');
                          alert('Invoice ID not available. Please try viewing the invoice again.');
                          return;
                        }
                        
                        console.log('🔵 Setting showPdfView to true');
                        setShowPdfView(true);
                        
                        // Call API directly in onClick handler
                        try {
                          setPdfLoading(true);
                          console.log('📞 Starting PDF data load for invoiceId:', invoiceId);
                          
                          // Start company config load in background (don't wait for it)
                          console.log('📋 Starting company config load in background...');
                          getCompanyConfig()
                            .then((config) => {
                              console.log('✅ Company config loaded');
                              setCompanyConfig(config);
                            })
                            .catch((configError) => {
                              console.warn('⚠️ Company config failed, using defaults:', configError);
                              setCompanyConfig(null);
                            });
                          
                          // Fetch full invoice details from API - THIS IS THE MAIN CALL (don't wait for config)
                          console.log('📞 Calling getFullInvoiceApi NOW with invoiceId:', invoiceId);
                          console.log('📞 API Endpoint: GET /invoices/getFullInvoice/' + invoiceId);
                          
                          const fullInvoice = await getFullInvoiceApi(invoiceId);
                          console.log('✅ Full invoice API response received:', fullInvoice);
                          
      // Extract job/customer details from full invoice response
      if (fullInvoice.jobDetails || fullInvoice.job) {
        setJobDetails(fullInvoice.jobDetails || fullInvoice.job);
      }
      // Extract vehicle number from full invoice (top-level or from job)
      const job = fullInvoice.jobDetails || fullInvoice.job || {};
      const vehicleNo =
        fullInvoice.vehicleNo ?? fullInvoice.vehicleNumber ?? fullInvoice.vehicle_no
        ?? job.vehicleNumber ?? job.vehicleNo ?? job.vehicle_no ?? job.vehicle_number ?? '';
      setPdfVehicleNo(vehicleNo != null && vehicleNo !== '' ? String(vehicleNo) : '');
      
      // Extract additionalDetails from full invoice response
      if (fullInvoice.additionalDetails) {
        setAdditionalDetails(fullInvoice.additionalDetails);
      }
      
      // Extract items with full details from API response
      if (fullInvoice.items && Array.isArray(fullInvoice.items)) {
                            const itemsWithDetails = fullInvoice.items.map((item: any) => {
                              const partCode = item.partCode || item.partcode || '';
                              // Prioritize partData.json lookup over API's partDescription
                              const partDescriptionFromJson = getPartDescription(partCode);
                              const partDescription = partDescriptionFromJson || item.partDescription || item.name || item.partName || partCode || '';
                              return {
                                partCode: partCode,
                                units: item.units || item.quantity || 0,
                                partDescription: partDescription,
                                unitsPrice: item.unitsPrice || item.unitPrice || item.rate || item.price || 0,
                                totalPrice: item.totalPrice || (item.unitsPrice || item.unitPrice || 0) * (item.units || 0),
                                discountPercentage: item.discountPercentage || item.discount || 0,
                                discountedPrice: item.discountedPrice || item.totalPrice || ((item.unitsPrice || item.unitPrice || 0) * (item.units || 0)),
                                name: item.name || item.partName || partCode || '',
                                hsnCode: item.hsnCode || item.hsn || item.hsncode || '',
                                unitPrice: item.unitPrice || item.rate || item.price || 0,
                                gstSlab: item.gstSlab || item.gst || 9,
                              };
                            });
                            setPdfItems(itemsWithDetails);
                          } else {
                            // Fallback to existing items
                            setPdfItems(editingInvoice.items.map((item: any) => ({
                              ...item,
                              name: item.name ?? item.partCode,
                              hsnCode: item.hsnCode ?? item.hsn ?? item.hsncode ?? '',
                              unitPrice: item.unitPrice ?? 0,
                              gstSlab: item.gstSlab ?? 9,
                            })));
                          }
                          
                          // Update form data with values from full invoice if available
                          if (fullInvoice.subtotal !== undefined || fullInvoice.cgst !== undefined) {
                            setFormData({
                              subtotal: fullInvoice.subtotal || 0,
                              cgst: fullInvoice.cgst || 0,
                              sgst: fullInvoice.sgst || 0,
                              igst: fullInvoice.igst || 0,
                              paymentStatus: fullInvoice.paymentStatus || editingInvoice.paymentStatus,
                              paymentMode: fullInvoice.paymentMode || editingInvoice.paymentMode,
                            });
                          }
                          setPdfNetCalculationAmount(fullInvoice.netCalculationAmount ?? null);
                          setPdfTotalForTaxableAmount(fullInvoice.total ?? null);
                          
                          console.log('✅ PDF data loaded successfully');
                        } catch (error: any) {
                          console.error('❌ Error loading PDF data:', error);
                          alert(`Failed to load invoice data: ${error.message || 'Unknown error'}`);
                        } finally {
                          setPdfLoading(false);
                          console.log('🏁 PDF data loading finished');
                        }
                      }}
                      className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
                    >
                      View PDF
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('table');
                      loadInvoices();
                    }}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                  >
                    View All
                  </button>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-md bg-green-50 dark:bg-green-900/20 p-4">
              <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
            </div>
          )}

          {viewMode === 'table' ? (
            <div className="overflow-x-auto rounded-lg bg-white dark:bg-zinc-900 shadow">
              {loadingInvoices ? (
                <div className="p-12 text-center text-zinc-600 dark:text-zinc-400">
                  Loading invoices...
                </div>
              ) : submittedInvoices.length === 0 ? (
                <div className="p-12 text-center text-zinc-600 dark:text-zinc-400">
                  No invoices found.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                  <thead className="bg-zinc-50 dark:bg-zinc-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Job ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Invoice ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Payment Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Payment Mode
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Submitted At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                    {submittedInvoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {invoice.jobId}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {invoice.id}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            invoice.paymentStatus === 'PAID' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                              : invoice.paymentStatus === 'PARTIAL'
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                          }`}>
                            {invoice.paymentStatus}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {invoice.paymentMode}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {invoice.submittedAt.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                          <button
                            onClick={async () => {
                              try {
                                setLoading(true);
                                setError('');
                                
                                // Fetch full invoice details from API
                                const invoiceDetails = await getInvoiceByIdApi(invoice.id);
                                
                                // Load invoice data into form
                                setEditingInvoice(invoice);
                                setSelectedJobId(invoiceDetails.jobId || invoice.jobId);
                                setInvoiceItems(invoiceDetails.items || invoice.items || []);
                                setFormData({
                                  subtotal: invoiceDetails.subtotal || 0,
                                  cgst: invoiceDetails.cgst || 0,
                                  sgst: invoiceDetails.sgst || 0,
                                  igst: invoiceDetails.igst || 0,
                                  paymentStatus: invoiceDetails.paymentStatus || invoice.paymentStatus,
                                  paymentMode: invoiceDetails.paymentMode || invoice.paymentMode,
                                });
                                // Load additionalDetails if available
                                if (invoiceDetails.additionalDetails) {
                                  setCustomerName(invoiceDetails.additionalDetails.name || '');
                                  setCustomerGstin(invoiceDetails.additionalDetails.customerGstin || '');
                                } else {
                                  setCustomerName('');
                                  setCustomerGstin('');
                                }
                                
                                // Switch to form view
                                setViewMode('form');
                                // Scroll to top
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              } catch (err: any) {
                                setError(err.message || 'Failed to load invoice details');
                                // Fallback to using existing invoice data if API fails
                                setEditingInvoice(invoice);
                                setSelectedJobId(invoice.jobId);
                                setInvoiceItems(invoice.items);
                                setFormData({
                                  subtotal: 0,
                                  cgst: 0,
                                  sgst: 0,
                                  igst: 0,
                                  paymentStatus: invoice.paymentStatus,
                                  paymentMode: invoice.paymentMode,
                                });
                                setCustomerName('');
                                setCustomerGstin('');
                                setViewMode('form');
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                          >
                            View →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            {/* Job Selection */}
            <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                Job Information
              </h2>
              
              {/* First Row: Job ID (Full Width) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Job ID <span className="text-red-500">*</span>
                </label>
                <div className="relative" ref={jobDropdownRef}>
                  <input
                    type="text"
                    value={selectedJobId}
                    onChange={(e) => handleJobIdChange(e.target.value)}
                    onFocus={() => {
                      if (selectedJobId && selectedJobId.trim() !== '' && filteredJobs.length > 0) {
                        setShowJobDropdown(true);
                      }
                    }}
                    className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Type mobile number (e.g., 9876543210)"
                    required
                  />
                  {showJobDropdown && filteredJobs.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full overflow-y-auto rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 shadow-lg" style={{ maxHeight: '240px', minHeight: '180px' }}>
                      {filteredJobs.map((job, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleJobSelect(job)}
                          className="cursor-pointer px-3 py-2 hover:bg-blue-50 dark:hover:bg-zinc-700 border-b border-zinc-200 dark:border-zinc-700 last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-black dark:text-zinc-50 text-sm">{job.jobCardId}</div>
                          <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                            Mobile: {job.mobileNumber || 'N/A'} | Vehicle: {job.vehicleNumber}
                          </div>
                          {job.jobDetailId?.jobDescription && job.jobDetailId.jobDescription.length > 0 && (
                            <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">
                              Services: {job.jobDetailId.jobDescription.map((desc: any) => desc.serviceType).join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Second Row: Customer Name and Customer GSTIN (Half Width Each) */}
              <div className="grid grid-cols-2 gap-4">
                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter customer name (optional)"
                  />
                </div>
                
                {/* Customer GSTIN */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Customer GSTIN
                  </label>
                  <input
                    type="text"
                    value={customerGstin}
                    onChange={(e) => setCustomerGstin(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter customer GSTIN (optional)"
                  />
                </div>
              </div>
            </div>

            {/* Add Items */}
            <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                  Items
                </h2>
                <button
                  type="button"
                  onClick={addItem}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Add Item
                </button>
              </div>

              {/* Items List */}
              {invoiceItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                    <thead className="bg-zinc-50 dark:bg-zinc-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Part Code
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Units
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                      {invoiceItems.map((item, index) => {
                        // Use index as stable key for dropdown state since it doesn't change
                        const dropdownKey = `item-${index}`;
                        return (
                          <tr key={dropdownKey}>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-900 dark:text-zinc-50">
                              <div className="relative" ref={(el) => {
                                if (el) {
                                  partDropdownRefs.current[dropdownKey] = el;
                                }
                              }}>
                                <input
                                  type="text"
                                  value={item.partCode || (partFilterByRow[dropdownKey] ?? '')}
                                  onChange={(e) => {
                                    if (!item.partCode) handleInvoicePartFilterChange(e.target.value, index);
                                  }}
                                  onFocus={() => setShowPartDropdown((prev) => ({ ...prev, [dropdownKey]: true }))}
                                  readOnly={!!item.partCode}
                                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700 disabled:cursor-pointer"
                                  placeholder="Select part from inventory..."
                                  required
                                />
                                {showPartDropdown[dropdownKey] && (
                                  <div className="absolute z-50 mt-1 w-full overflow-y-auto rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 shadow-lg" style={{ maxHeight: '240px', minHeight: '120px' }}>
                                    {getFilteredInventoryPartsForKey(dropdownKey).length === 0 ? (
                                      <div className="px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                                        {inventoryParts.length === 0 ? 'No parts in inventory.' : 'No matching parts. Type to filter.'}
                                      </div>
                                    ) : (
                                      getFilteredInventoryPartsForKey(dropdownKey).map((part) => (
                                        <div
                                          key={part.id}
                                          onClick={() => handleInvoicePartSelect(index, part)}
                                          className="cursor-pointer px-3 py-2 hover:bg-blue-50 dark:hover:bg-zinc-700 border-b border-zinc-200 dark:border-zinc-700 last:border-b-0 transition-colors"
                                        >
                                          <div className="font-medium text-black dark:text-zinc-50 text-sm">{part.partCode}</div>
                                          <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">{part.name || '—'}</div>
                                          <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">₹{part.unitPrice ?? 0}</div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                              <input
                                type="number"
                                min="1"
                                value={item.units}
                                onChange={(e) => updateUnits(index, parseInt(e.target.value) || 1)}
                                className="w-20 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-black dark:text-zinc-50"
                                required
                              />
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No items added. Click "Add Item" to add items to the invoice.
                </p>
              )}
            </div>

            {/* Invoice Details */}
            <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                Invoice Details
              </h2>
              <div className="grid gap-4 md:grid-cols-2">

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Payment Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as 'PENDING' | 'PARTIAL' | 'PAID' })}
                    required
                    className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="PARTIAL">PARTIAL</option>
                    <option value="PAID">PAID</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Payment Mode <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as 'CASH' | 'UPI' | 'MIXED' })}
                    required
                    className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-black dark:text-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="MIXED">MIXED</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Actions - Only show for new invoices, not when editing */}
            {!editingInvoice && (
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Submit'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-6 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </form>
          )}

          {/* PDF View Modal */}
          {showPdfView && editingInvoice && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto mx-2 sm:mx-0">
                {/* PDF Header with Buttons */}
                <div className="sticky top-0 bg-white border-b border-zinc-200 p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between z-10 no-print">
                  <h2 className="text-lg sm:text-xl font-semibold text-black">Invoice PDF</h2>
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      Print PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPdfView(false);
                        setPdfNetCalculationAmount(null);
                        setPdfTotalForTaxableAmount(null);
                      }}
                      className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                    >
                      Back
                    </button>
                  </div>
                </div>

                {/* PDF Content */}
                {pdfLoading ? (
                  <div className="p-8 text-center">
                    <p className="text-zinc-600">Loading invoice data...</p>
                  </div>
                ) : (
                  <div className="p-8">
                    <div className="invoice-print bg-white text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
                      <style>{`
                        @media print {
                          .no-print {
                            display: none !important;
                          }
                          body {
                            margin: 0;
                            padding: 0;
                          }
                          .invoice-print {
                            padding: 0;
                          }
                          @page {
                            margin: 0;
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

                      {/* Company Header */}
                      <div className="mb-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-sm">GSTIN: {companyConfig?.gstin || '02LSNPS6493R1ZC'}</div>
                          <div className="text-right text-sm">
                            <div>{companyConfig?.phone || '(M) 8626816424'}</div>
                            <div>{companyConfig?.email || 'E-Mail: 24x7autonation@gmail.com'}</div>
                          </div>
                        </div>
                        <div className="text-center mb-2">
                          <h1 className="text-3xl font-bold" style={{ fontFamily: 'serif' }}>
                            {companyConfig?.name || '24X7 AUTONATION'}
                          </h1>
                        </div>
                        <div className="text-center text-sm mb-4 italic">
                          {companyConfig?.address || 'Baloo P.O. Saliana, Tehsil Panchrukhi, Distt. Kangra HP-176103'}
                        </div>
                        <div className="text-center mb-4">
                          <h2 className="text-2xl font-bold">INVOICE</h2>
                        </div>
                        <div className="flex justify-between mb-4">
                          <div>
                            <span className="font-semibold">Sr. No.</span> {editingInvoice.id.slice(-3) || '119'}
                          </div>
                          <div>
                            <span className="font-semibold">Date:</span> {editingInvoice.submittedAt.toLocaleDateString('en-IN')}
                          </div>
                        </div>
                        <div className="flex justify-between items-start mb-4 gap-4">
                          <div style={{ flex: '1' }}>
                            <span className="font-semibold">Name.</span> {additionalDetails?.name || jobDetails?.customerName || 'N/A'}
                          </div>
                          <div className="text-center" style={{ flex: '1' }}>
                            <span className="font-semibold">Vehicle Number:</span> {pdfVehicleNo || jobDetails?.vehicleNumber || jobDetails?.vehicleNo || jobDetails?.vehicle_no || jobDetails?.vehicle_number || '—'}
                          </div>
                          <div className="text-right" style={{ flex: '1' }}>
                            {additionalDetails?.customerGstin ? (
                              <>
                                <span className="font-semibold">Customer GSTIN:</span> {additionalDetails.customerGstin}
                              </>
                            ) : (
                              <span>&nbsp;</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Items Table */}
                      <table className="mb-4" style={{ fontSize: '10px' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '5%', fontSize: '14px', fontWeight: 'bold' }}>S. No.</th>
                            <th style={{ width: '10%', fontSize: '14px', fontWeight: 'bold' }}>Part No</th>
                            <th style={{ width: '28%', fontSize: '14px', fontWeight: 'bold' }}>Part Description</th>
                            <th style={{ width: '15%', fontSize: '14px', fontWeight: 'bold' }}>HSN Code</th>
                            <th style={{ width: '8%', fontSize: '14px', fontWeight: 'bold' }}>Qty (Unit)</th>
                            <th style={{ width: '22%', fontSize: '14px', fontWeight: 'bold' }}>MRP</th>
                            <th style={{ width: '12%', fontSize: '14px', fontWeight: 'bold' }}>Total Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pdfItems.map((item, index) => {
                            const partCode = item.partCode || '';
                            const units = item.units || 0;
                            // Pick HSN Code from partData.json same as Part Desc
                            const hsnCodeFromJson = getPartHsnCode(partCode);
                            const hsnCode = hsnCodeFromJson || (item.hsnCode ?? item.hsn ?? item.hsncode ?? '—');
                            // Always get fresh description from partData.json to ensure accuracy
                            const partDescriptionFromJson = getPartDescription(partCode);
                            const partDescription = partDescriptionFromJson || item.partDescription || item.name || '';
                            const unitsPrice = item.unitsPrice || item.unitPrice || 0;
                            const totalPrice = item.totalPrice || (unitsPrice * units);
                            const discountPercentage = item.discountPercentage || 0;
                            const discountedPrice = item.discountedPrice || totalPrice;
                            
                            return (
                              <tr key={index}>
                                <td>{index + 1}</td>
                                <td>{partCode}</td>
                                <td>{partDescription}</td>
                                <td>{hsnCode}</td>
                                <td>{units}</td>
                                <td>₹{unitsPrice.toFixed(2)}</td>
                                <td>₹{discountedPrice.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                          {/* Fill empty rows to make 14 total */}
                          {Array.from({ length: Math.max(0, 14 - pdfItems.length) }).map((_, i) => (
                            <tr key={`empty-${i}`}>
                              <td>{pdfItems.length + i + 1}</td>
                              <td>&nbsp;</td>
                              <td>&nbsp;</td>
                              <td>&nbsp;</td>
                              <td>&nbsp;</td>
                              <td>&nbsp;</td>
                              <td>&nbsp;</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Summary Section */}
                      {(() => {
                        const subtotal = formData.subtotal || pdfItems.reduce((sum, item) => {
                          const discountedPrice = item.discountedPrice || item.totalPrice || ((item.unitsPrice || item.unitPrice || 0) * (item.units || 0));
                          return sum + discountedPrice;
                        }, 0);
                        const gstSlab = pdfItems[0]?.gstSlab || 9;
                        const cgst = formData.cgst || 0;
                        const sgst = formData.sgst || 0;
                        const igst = formData.igst || 0;
                        const computedTotal = subtotal + cgst + sgst + igst;
                        const grandTotal = pdfNetCalculationAmount ?? computedTotal;
                        const total = grandTotal;

                        return (
                          <div className="flex justify-between mb-4">
                            <div style={{ width: '50%' }}>
                              <div className="mb-2">
                                <p className="font-semibold mb-1">Rupees in Words</p>
                                <p className="text-sm border-b border-black pb-1" style={{ minHeight: '20px' }}>
                                  {numberToWords(grandTotal)}
                                </p>
                              </div>
                              <div className="mt-4 text-xs">
                                <p className="mb-1"><span className="font-semibold">A/c Name:</span> 24X7 AUTONATION</p>
                                <p className="mb-1"><span className="font-semibold">Our Bank:</span> S.B.I. PANCHRUKHI</p>
                                <p className="mb-1"><span className="font-semibold">A/No.: No.:</span> 44332175284</p>
                                <p className="mb-1"><span className="font-semibold">IFSC Code:</span> SBIN0003241</p>
                              </div>
                              <div className="mt-4">
                                <p className="text-xs">E. & O.E.</p>
                              </div>
                            </div>
                            <div style={{ width: '45%' }}>
                              <div className="mb-2">
                                <div className="flex justify-between mb-1">
                                  <span>Total Taxable Amount</span>
                                  <span>₹{(pdfTotalForTaxableAmount ?? subtotal).toFixed(2)}</span>
                                </div>
                                {igst === 0 ? (
                                  <>
                                    <div className="flex justify-between mb-1">
                                      <span>CGST @ {gstSlab}%</span>
                                      <span>₹{cgst.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between mb-1">
                                      <span>SGST @ {gstSlab}%</span>
                                      <span>₹{sgst.toFixed(2)}</span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex justify-between mb-1">
                                    <span>IGST @ {gstSlab}%</span>
                                    <span>₹{igst.toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between mb-1 border-t border-black pt-1">
                                  <span className="font-semibold">Total</span>
                                  <span className="font-semibold">₹{total.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-t-2 border-black pt-1 mt-2">
                                  <span className="font-bold">Grand Total</span>
                                  <span className="font-bold">₹{grandTotal.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Footer */}
                      <div className="flex justify-between mt-8">
                        <div></div>
                        <div className="text-right">
                          <p className="mb-8">Signature</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

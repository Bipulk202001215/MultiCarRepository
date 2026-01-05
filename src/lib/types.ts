export type UserRole = 
  | 'ADMIN'
  | 'SERVICE_ADVISOR'
  | 'INVENTORY_MANAGER'
  | 'MECHANIC'
  | 'ACCOUNTANT';

export type Permission = 
  | 'INVENTORY_MANAGEMENT'
  | 'JOB_CARD_MANAGEMENT'
  | 'INVOICE_MANAGEMENT'
  | 'USER_MANAGEMENT'
  | 'ROLE_MANAGEMENT'
  | 'PERMISSION_MANAGEMENT'
  | 'COMPANY_MANAGEMENT'
  | 'SUPPLIER_MANAGEMENT'
  | 'PURCHASE_ORDER_MANAGEMENT'
  | 'VIEW_DASHBOARD';

// Company Types
export interface Company {
  id: string;
  name: string;
  gstin: string;
  address: string;
  phone: string;
  email: string;
  stateCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyData {
  name: string;
  gstin: string;
  address: string;
  phone: string;
  email: string;
  stateCode: string;
}

// Service Types (Car Part Services)
export interface Service {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateServiceData {
  companyId: string;
  name: string;
  description?: string;
}

// Role Types
export interface Role {
  id: string;
  name: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// Permission Types
export interface PermissionType {
  id: string;
  name: Permission;
  createdAt: Date;
  updatedAt: Date;
}

// Role-Permission Junction
export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt: Date;
}

// User-Role Junction
export interface UserRoleJunction {
  id: string;
  userId: string;
  roleId: string;
  createdAt: Date;
}

// Updated UserData - now includes companyId, removed single role
export interface UserData {
  id: string;
  email: string;
  displayName: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  // Legacy field for backward compatibility during migration
  role?: UserRole;
}

export interface CreateUserData {
  email: string;
  password: string;
  displayName: string;
  companyId: string;
  roleIds: string[]; // Array of role IDs
}

export type ServiceType = 
  | 'Periodic'
  | 'Repair'
  | 'AC'
  | 'Tires'
  | 'Paint'
  | 'Bodywork'
  | 'Electrical'
  | 'Engine'
  | 'Other';

export type JobStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING' | 'IN_PROGRESS' | 'QC_CHECK' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface JobDescription {
  serviceType: ServiceType;
  description: string;
  assignedMechanicType?: string;
  estimatedTime?: string;
  hsnCode?: string;
  gstSlab?: GSTSlab;
  unitPrice?: number;
}

export interface JobCard {
  id: string;
  jobNo: string;
  companyId: string;
  vehicleNo?: string;
  customerName: string;
  mobile: string;
  kmReading: string;
  carMake?: string;
  carModel?: string;
  carYear?: number;
  jobDescriptions: JobDescription[];
  status: JobStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJobCardData {
  companyId?: string; // Optional, will be set from user context if not provided
  vehicleNo?: string;
  customerName?: string;
  mobile?: string;
  kmReading?: string;
  carMake?: string;
  carModel?: string;
  carYear?: number;
  jobDescriptions: JobDescription[];
  status: JobStatus;
}

export type PartCategory = 'OEM' | 'OES' | 'Local';
export type GSTSlab = 5 | 18 | 28;

export interface Supplier {
  id?: string;
  supplierId?: string; // API might use supplierId
  companyId: string;
  name: string;
  mobile: string;
  gstin: string;
  address: string;
  contact?: string; // Keep for backward compatibility
  email?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Part {
  id: string;
  companyId: string;
  partCode: string;
  name: string;
  category: PartCategory;
  hsnCode: string;
  gstSlab: GSTSlab;
  stockQty: number;
  minStock: number;
  unitPrice: number;
  supplierId?: string;
  supplierName?: string;
  barcode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePartData {
  companyId?: string; // Optional, will be set from user context if not provided
  partCode?: string;
  name: string;
  category: PartCategory;
  hsnCode: string;
  gstSlab: GSTSlab;
  stockQty: number;
  minStock: number;
  unitPrice: number;
  supplierId?: string;
  barcode?: string;
}

export interface CreateSupplierData {
  companyId?: string; // Optional, will be set from user context if not provided
  name: string;
  mobile: string;
  gstin: string;
  address: string;
  contact?: string; // Keep for backward compatibility
  email?: string;
}

export type PurchaseOrderStatus = 'DRAFT' | 'PENDING' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItem {
  partId: string;
  partCode: string;
  name: string;
  quantity: number;
  unitPrice: number;
  gstSlab: GSTSlab;
  total: number; // calculated: quantity * unitPrice * (1 + gstSlab/100)
}

export interface PurchaseOrder {
  id: string;
  companyId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  subTotal: number;
  totalGst: number;
  grandTotal: number;
  orderDate: Date;
  expectedDate?: Date;
  receivedDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePurchaseOrderData {
  companyId?: string; // Optional, will be set from user context if not provided
  supplierId: string;
  items: PurchaseOrderItem[];
  orderDate: Date;
  expectedDate?: Date;
  status?: PurchaseOrderStatus;
}

// Invoice Types
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';
export type PaymentMode = 'CASH' | 'UPI' | 'MIXED';
export type GSTType = 'CGST_SGST' | 'IGST';

export interface InvoiceItem {
  partId?: string;
  partCode?: string;
  name: string;
  hsnCode: string;
  gstSlab: GSTSlab;
  quantity: number;
  unitPrice: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  total: number;
  type: 'PART' | 'SERVICE';
}

export interface Invoice {
  id: string;
  companyId: string;
  invoiceNo: string;
  jobId: string;
  jobNo: string;
  customerName: string;
  mobile: string;
  vehicleNo?: string;
  items: InvoiceItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode;
  paidAmount: number;
  gstType: GSTType;
  invoiceDate: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvoiceData {
  companyId?: string; // Optional, will be set from user context if not provided
  jobId: string;
  items: InvoiceItem[];
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode;
  paidAmount: number;
  gstType: GSTType;
  invoiceDate: Date;
}

// Job Item Types
export interface JobItem {
  id: string;
  jobId: string;
  partId?: string;
  partCode?: string;
  name: string;
  hsnCode: string;
  gstSlab: GSTSlab;
  quantity: number;
  unitPrice: number;
  type: 'PART' | 'SERVICE';
  createdAt: Date;
}

export interface CreateJobItemData {
  jobId: string;
  partId?: string;
  partCode?: string;
  name: string;
  hsnCode: string;
  gstSlab: GSTSlab;
  quantity: number;
  unitPrice: number;
  type: 'PART' | 'SERVICE';
}

// Company Config Types
export interface CompanyConfig {
  id: string;
  gstin: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  bankDetails?: {
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    branch?: string;
  };
  stateCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyConfigData {
  gstin: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  bankDetails?: {
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    branch?: string;
  };
  stateCode: string;
}


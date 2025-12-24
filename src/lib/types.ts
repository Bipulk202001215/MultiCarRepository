export type UserRole = 
  | 'ADMIN'
  | 'SERVICE_ADVISOR'
  | 'INVENTORY_MANAGER'
  | 'MECHANIC'
  | 'ACCOUNTANT';

export interface UserData {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
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
}

export interface JobCard {
  id: string;
  jobNo: string;
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
  id: string;
  name: string;
  gstin: string;
  contact?: string;
  address?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Part {
  id: string;
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
  name: string;
  gstin: string;
  contact?: string;
  address?: string;
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
  supplierId: string;
  items: PurchaseOrderItem[];
  orderDate: Date;
  expectedDate?: Date;
  status?: PurchaseOrderStatus;
}


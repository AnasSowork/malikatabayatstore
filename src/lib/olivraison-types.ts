export type OlivraisonDestination = {
  name: string;
  phone: string;
  city: string;
  streetAddress: string;
};

export type OlivraisonPackageListItem = {
  trackingID: string;
  partnerTrackingID?: string;
  status: string;
  COD: number;
  noOpen?: boolean;
  destination: OlivraisonDestination;
  meta?: {
    createAt?: string;
    updateAt?: string;
  };
};

export type OlivraisonHistoryEntry = {
  updateAt?: string;
  user?: string;
  status?: string;
  msg?: string;
  reportedTo?: string | null;
};

export type OlivraisonPackage = OlivraisonPackageListItem & {
  note?: string;
  name?: string;
  comment?: string;
  description?: string;
  inventory?: boolean;
  exchange?: boolean;
  exchangePackage?: string;
  packaging?: string;
  sms?: boolean;
  history?: OlivraisonHistoryEntry[];
  transport?: {
    currentDriverName?: string;
    currentDriverPhone?: string;
  };
  warehouse?: string | null;
  deliveryFees?: number;
  returnedFees?: number;
  canceledFees?: number;
};

export type OlivraisonStatus = {
  parcel_statut_code: string;
  parcel_statut_label: string;
};

export type OlivraisonCity = {
  name: string;
  price: number;
};

export type OlivraisonProduct = {
  _id: string;
  name: string;
  price?: number;
  quantity?: number;
  reference?: string;
};

export type OlivraisonClaim = {
  _id: string;
  subject: string;
  description: string;
  category: string;
  reference?: string;
  status?: string;
  priority?: string;
  createdAt?: string;
};

export type OlivraisonDashboardData = {
  configured: boolean;
  packages: OlivraisonPackageListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  statuses: OlivraisonStatus[];
  cities: OlivraisonCity[];
  products: OlivraisonProduct[];
  claims: OlivraisonClaim[];
};

export type OlivraisonCreatePackage = {
  price: number;
  description: string;
  name?: string;
  comment?: string;
  orderId?: string;
  partnerTrackingID?: string;
  inventory?: boolean;
  exchange?: boolean;
  exchangePackage?: string;
  noOpen?: boolean;
  destination: OlivraisonDestination;
};

import {
  DataExplorerRecord,
  DataProduct,
  FilterOperatorOption,
  QuickStartTemplate,
  SavedQuery,
} from '../interfaces/data-explorer.interfaces';

type PropertyBaseRecord = Pick<
  DataExplorerRecord,
  | 'propertyId'
  | 'propertyName'
  | 'address'
  | 'city'
  | 'province'
  | 'assetClass'
  | 'gla'
  | 'status'
  | 'acquisitionDate'
  | 'marketValue'
  | 'occupancy'
  | 'noi'
>;

const TENANT_NAMES = [
  'Royal Bank of Canada',
  'TD Bank',
  'Starbucks',
  'Shoppers Drug Mart',
  'Lululemon',
  'Amazon',
  'Bell Canada',
  'Rogers Communications',
  'Canadian Tire',
  'Metro Inc.',
  'Sobeys',
  'Walmart',
  'Costco',
  'Hudson\'s Bay',
  'Indigo Books',
  'Telus',
  'Scotiabank',
  'BMO',
  'CIBC',
  'FedEx',
  'UPS',
  'GoodLife Fitness',
  'PetSmart',
  'Home Depot',
  'IKEA',
];

const TRANSACTION_TYPES = ['Acquisition', 'Refinance', 'Disposition'] as const;

function enrichPropertyRecord(base: PropertyBaseRecord, index: number): DataExplorerRecord {
  const tenantName = TENANT_NAMES[index % TENANT_NAMES.length];
  const leaseStartYear = 2018 + (index % 6);
  const leaseEndYear = leaseStartYear + 5 + (index % 4);
  const monthlyRent = Math.round(base.gla * (8 + (index % 5)) / 12);
  const revenue = Math.round(base.noi * 1.18);
  const expenses = revenue - base.noi;
  const capRate = Number(((base.noi / base.marketValue) * 100).toFixed(2));
  const transactionType = TRANSACTION_TYPES[index % TRANSACTION_TYPES.length];
  const transactionDate = base.acquisitionDate;
  const transactionValue =
    transactionType === 'Disposition'
      ? Math.round(base.marketValue * 0.92)
      : transactionType === 'Refinance'
        ? Math.round(base.marketValue * 0.65)
        : base.marketValue;

  return {
    ...base,
    tenantName,
    leaseStart: `${leaseStartYear}-${String((index % 12) + 1).padStart(2, '0')}-01`,
    leaseEnd: `${leaseEndYear}-${String((index % 12) + 1).padStart(2, '0')}-28`,
    monthlyRent,
    revenue,
    expenses,
    noiFinancial: base.noi,
    capRate,
    transactionType,
    transactionDate,
    transactionValue,
  };
}

export const FILTER_OPERATORS: FilterOperatorOption[] = [
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
];

export const DATA_PRODUCTS: DataProduct[] = [
  {
    id: 'properties',
    label: 'Properties',
    description: 'Real estate asset portfolio',
    fields: [
      { id: 'propertyId', label: 'Property ID', type: 'text', dataKey: 'propertyId' },
      { id: 'propertyName', label: 'Property Name', type: 'text', dataKey: 'propertyName' },
      { id: 'address', label: 'Address', type: 'text', dataKey: 'address' },
      { id: 'city', label: 'City', type: 'text', dataKey: 'city' },
      { id: 'province', label: 'Province', type: 'text', dataKey: 'province' },
      { id: 'assetClass', label: 'Asset Class', type: 'text', dataKey: 'assetClass' },
      { id: 'gla', label: 'GLA (sq ft)', type: 'number', dataKey: 'gla' },
      { id: 'status', label: 'Status', type: 'text', dataKey: 'status' },
      { id: 'acquisitionDate', label: 'Acquisition Date', type: 'date', dataKey: 'acquisitionDate' },
      { id: 'marketValue', label: 'Market Value', type: 'currency', dataKey: 'marketValue' },
      { id: 'occupancy', label: 'Occupancy %', type: 'percent', dataKey: 'occupancy' },
      { id: 'noi', label: 'NOI', type: 'currency', dataKey: 'noi' },
    ],
  },
  {
    id: 'tenants',
    label: 'Tenants',
    description: 'Tenant lease and rent details',
    fields: [
      { id: 'tenantName', label: 'Tenant Name', type: 'text', dataKey: 'tenantName' },
      { id: 'leaseStart', label: 'Lease Start', type: 'date', dataKey: 'leaseStart' },
      { id: 'leaseEnd', label: 'Lease End', type: 'date', dataKey: 'leaseEnd' },
      { id: 'monthlyRent', label: 'Monthly Rent', type: 'currency', dataKey: 'monthlyRent' },
    ],
  },
  {
    id: 'financials',
    label: 'Financials',
    description: 'Revenue, NOI and cap rates',
    fields: [
      { id: 'revenue', label: 'Revenue', type: 'currency', dataKey: 'revenue' },
      { id: 'expenses', label: 'Expenses', type: 'currency', dataKey: 'expenses' },
      { id: 'noiFinancial', label: 'NOI', type: 'currency', dataKey: 'noiFinancial' },
      { id: 'capRate', label: 'Cap Rate', type: 'percent', dataKey: 'capRate' },
    ],
  },
  {
    id: 'transactions',
    label: 'Transactions',
    description: 'Acquisitions and dispositions',
    fields: [
      { id: 'transactionType', label: 'Transaction Type', type: 'text', dataKey: 'transactionType' },
      { id: 'transactionDate', label: 'Transaction Date', type: 'date', dataKey: 'transactionDate' },
      { id: 'transactionValue', label: 'Transaction Value', type: 'currency', dataKey: 'transactionValue' },
    ],
  },
];

export const QUICK_START_TEMPLATES: QuickStartTemplate[] = [
  {
    id: 'property-portfolio',
    title: 'Property Portfolio',
    description: 'Properties with value, occupancy & NOI',
    fieldIds: ['propertyName', 'address', 'province', 'assetClass', 'marketValue', 'occupancy', 'noi'],
  },
  {
    id: 'tenant-snapshot',
    title: 'Tenant Snapshot',
    description: 'All tenants with lease and rent details',
    fieldIds: ['propertyName', 'tenantName', 'leaseStart', 'leaseEnd', 'monthlyRent'],
  },
  {
    id: 'financial-performance',
    title: 'Financial Performance',
    description: 'Revenue, expenses, NOI and cap rates',
    fieldIds: ['propertyName', 'revenue', 'expenses', 'noiFinancial', 'capRate'],
  },
  {
    id: 'transaction-history',
    title: 'Transaction History',
    description: 'Acquisitions and dispositions',
    fieldIds: ['propertyName', 'transactionType', 'transactionDate', 'transactionValue'],
  },
];

const MOCK_PROPERTY_BASE_RECORDS: PropertyBaseRecord[] = [
  { propertyId: 'P001', propertyName: 'Bay Retail Centre', address: '1200 Bay St', city: 'Toronto', province: 'ON', assetClass: 'Retail', gla: 45000, status: 'Active', acquisitionDate: '2019-03-15', marketValue: 28500000, occupancy: 94.5, noi: 1850000 },
  { propertyId: 'P002', propertyName: 'Bay Retail Centre', address: '6715 Bay St', city: 'Vancouver', province: 'BC', assetClass: 'Retail', gla: 32000, status: 'Active', acquisitionDate: '2020-06-22', marketValue: 19200000, occupancy: 88.2, noi: 1240000 },
  { propertyId: 'P003', propertyName: 'Yonge Industrial Centre', address: '450 Yonge St', city: 'Toronto', province: 'ON', assetClass: 'Industrial', gla: 120000, status: 'Active', acquisitionDate: '2018-11-08', marketValue: 42000000, occupancy: 97.1, noi: 3100000 },
  { propertyId: 'P004', propertyName: 'Front Multi-Res Centre', address: '88 Front St', city: 'Montreal', province: 'QC', assetClass: 'Multi-Res', gla: 85000, status: 'Active', acquisitionDate: '2021-01-30', marketValue: 35600000, occupancy: 96.3, noi: 2280000 },
  { propertyId: 'P005', propertyName: 'Queen Mixed-Use Centre', address: '200 Queen St', city: 'Toronto', province: 'ON', assetClass: 'Mixed-Use', gla: 67000, status: 'Active', acquisitionDate: '2017-09-12', marketValue: 51200000, occupancy: 91.8, noi: 3450000 },
  { propertyId: 'P006', propertyName: 'Bloor Office Centre', address: '150 Bloor St', city: 'Calgary', province: 'AB', assetClass: 'Office', gla: 95000, status: 'Active', acquisitionDate: '2016-04-25', marketValue: 38700000, occupancy: 82.4, noi: 2650000 },
  { propertyId: 'P007', propertyName: 'Dundas Retail Centre', address: '300 Dundas St', city: 'Toronto', province: 'ON', assetClass: 'Retail', gla: 28000, status: 'Active', acquisitionDate: '2022-08-14', marketValue: 14800000, occupancy: 89.7, noi: 980000 },
  { propertyId: 'P008', propertyName: 'King Office Centre', address: '500 King St', city: 'Toronto', province: 'ON', assetClass: 'Office', gla: 110000, status: 'Active', acquisitionDate: '2015-12-01', marketValue: 62000000, occupancy: 93.2, noi: 4100000 },
  { propertyId: 'P009', propertyName: 'King Office Centre', address: '502 King St', city: 'Toronto', province: 'ON', assetClass: 'Office', gla: 105000, status: 'Active', acquisitionDate: '2015-12-01', marketValue: 58500000, occupancy: 91.5, noi: 3920000 },
  { propertyId: 'P010', propertyName: 'Richmond Industrial Park', address: '1800 Richmond Rd', city: 'Ottawa', province: 'ON', assetClass: 'Industrial', gla: 200000, status: 'Active', acquisitionDate: '2014-07-18', marketValue: 48000000, occupancy: 98.0, noi: 3600000 },
  { propertyId: 'P011', propertyName: 'Granville Retail Hub', address: '900 Granville St', city: 'Vancouver', province: 'BC', assetClass: 'Retail', gla: 38000, status: 'Active', acquisitionDate: '2020-02-28', marketValue: 22400000, occupancy: 90.1, noi: 1520000 },
  { propertyId: 'P012', propertyName: 'Portland Office Tower', address: '75 Portland St', city: 'Toronto', province: 'ON', assetClass: 'Office', gla: 145000, status: 'Active', acquisitionDate: '2013-05-10', marketValue: 78000000, occupancy: 87.6, noi: 5200000 },
  { propertyId: 'P013', propertyName: 'Wellington Mixed-Use', address: '40 Wellington St', city: 'Toronto', province: 'ON', assetClass: 'Mixed-Use', gla: 72000, status: 'Active', acquisitionDate: '2019-10-05', marketValue: 44500000, occupancy: 92.3, noi: 2980000 },
  { propertyId: 'P014', propertyName: 'Spadina Retail Plaza', address: '250 Spadina Ave', city: 'Toronto', province: 'ON', assetClass: 'Retail', gla: 22000, status: 'Active', acquisitionDate: '2021-04-17', marketValue: 12600000, occupancy: 85.4, noi: 820000 },
  { propertyId: 'P015', propertyName: 'University Office Complex', address: '100 University Ave', city: 'Toronto', province: 'ON', assetClass: 'Office', gla: 180000, status: 'Active', acquisitionDate: '2012-08-22', marketValue: 95000000, occupancy: 94.8, noi: 6400000 },
  { propertyId: 'P016', propertyName: 'Main Street Retail', address: '500 Main St', city: 'Winnipeg', province: 'MB', assetClass: 'Retail', gla: 18000, status: 'Active', acquisitionDate: '2023-01-09', marketValue: 8900000, occupancy: 78.2, noi: 560000 },
  { propertyId: 'P017', propertyName: 'Harbourfront Mixed-Use', address: '200 Queens Quay', city: 'Toronto', province: 'ON', assetClass: 'Mixed-Use', gla: 88000, status: 'Active', acquisitionDate: '2018-06-30', marketValue: 52800000, occupancy: 95.1, noi: 3520000 },
  { propertyId: 'P018', propertyName: 'Jasper Office Centre', address: '300 Jasper Ave', city: 'Edmonton', province: 'AB', assetClass: 'Office', gla: 92000, status: 'Active', acquisitionDate: '2016-11-14', marketValue: 36400000, occupancy: 80.5, noi: 2380000 },
  { propertyId: 'P019', propertyName: 'Robson Retail Centre', address: '800 Robson St', city: 'Vancouver', province: 'BC', assetClass: 'Retail', gla: 35000, status: 'Active', acquisitionDate: '2019-07-25', marketValue: 26800000, occupancy: 93.7, noi: 1780000 },
  { propertyId: 'P020', propertyName: 'Laurier Office Park', address: '150 Laurier Ave', city: 'Ottawa', province: 'ON', assetClass: 'Office', gla: 78000, status: 'Active', acquisitionDate: '2017-03-08', marketValue: 41200000, occupancy: 88.9, noi: 2750000 },
  { propertyId: 'P021', propertyName: 'Peel Industrial Centre', address: '1200 Peel St', city: 'Montreal', province: 'QC', assetClass: 'Industrial', gla: 165000, status: 'Active', acquisitionDate: '2015-09-19', marketValue: 39600000, occupancy: 96.8, noi: 2840000 },
  { propertyId: 'P022', propertyName: 'College Mixed-Use Hub', address: '400 College St', city: 'Toronto', province: 'ON', assetClass: 'Mixed-Use', gla: 55000, status: 'Active', acquisitionDate: '2020-12-03', marketValue: 38200000, occupancy: 90.6, noi: 2540000 },
  { propertyId: 'P023', propertyName: 'Barrington Office Tower', address: '1800 Barrington St', city: 'Halifax', province: 'NS', assetClass: 'Office', gla: 62000, status: 'Active', acquisitionDate: '2018-02-14', marketValue: 28400000, occupancy: 84.3, noi: 1920000 },
  { propertyId: 'P024', propertyName: 'Sherbrooke Retail Plaza', address: '600 Sherbrooke St', city: 'Montreal', province: 'QC', assetClass: 'Retail', gla: 26000, status: 'Active', acquisitionDate: '2021-08-21', marketValue: 14200000, occupancy: 87.1, noi: 940000 },
  { propertyId: 'P025', propertyName: 'Waterfront Industrial', address: '50 Harbour St', city: 'Toronto', province: 'ON', assetClass: 'Industrial', gla: 175000, status: 'Active', acquisitionDate: '2014-04-02', marketValue: 45200000, occupancy: 97.5, noi: 3280000 },
];

export const MOCK_PROPERTY_RECORDS: DataExplorerRecord[] = MOCK_PROPERTY_BASE_RECORDS.map(
  (record, index) => enrichPropertyRecord(record, index),
);

export const SAVED_QUERIES_STORAGE_KEY = 'kingsight-data-explorer-saved-queries-v2';

export const DEFAULT_SAVED_QUERIES: SavedQuery[] = [
  {
    id: 'sq-1',
    name: 'Toronto Office Properties',
    description: 'All office assets in Toronto with occupancy and value',
    selectedFieldIds: ['propertyName', 'address', 'city', 'province', 'assetClass', 'marketValue', 'occupancy'],
    filters: [
      { id: 'f1', fieldId: 'city', operator: 'equals' as const, value: 'Toronto' },
      { id: 'f2', fieldId: 'assetClass', operator: 'equals' as const, value: 'Office' },
    ],
    filterLogic: 'and' as const,
    groupByFieldId: null,
    savedAt: '2026-06-03T10:16:00.000Z',
  },
  {
    id: 'sq-2',
    name: 'High-Value Tenants',
    description: 'Tenants with gross rent above threshold',
    selectedFieldIds: [
      'propertyName',
      'tenantName',
      'leaseStart',
      'leaseEnd',
      'monthlyRent',
      'marketValue',
      'occupancy',
    ],
    filters: [
      { id: 'f3', fieldId: 'monthlyRent', operator: 'contains' as const, value: '5' },
    ],
    filterLogic: 'and' as const,
    groupByFieldId: 'tenantName',
    savedAt: '2026-05-31T10:16:00.000Z',
  },
];

export type DashboardPeriod = 'ltd' | 'quarterly';

export interface ActiveFundRow {
  rank: number;
  name: string;
  aum: string;
  q3Return: string;
  q3ReturnPositive: boolean;
  investors: number;
  assets: number;
  status: string;
}

export interface ActiveAssetRow {
  rank: number;
  name: string;
  type: string;
  city: string;
  marketValue: string;
  quarterlyNoi: string;
  occupancy: string;
  occupancyTone: 'positive' | 'warning';
  status: string;
  statusTone: 'positive' | 'warning';
}

export const PORTFOLIO_PERFORMANCE_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const PORTFOLIO_PERFORMANCE_DATA = {
  coreIncome: [1.2, 1.8, 2.1, 2.4, 3.0, 3.6, 4.2, 5.1, 5.8, 6.4, 7.2, 8.0],
  growthFund: [0.8, 1.5, 2.8, 2.2, 3.5, 4.8, 5.5, 6.2, 7.0, 8.5, 9.2, 10.1],
};

export const ASSET_ALLOCATION_DATA = [
  { label: 'Office', value: 35, color: '#004a99' },
  { label: 'Retail', value: 22, color: '#7eb3e8' },
  { label: 'Industrial', value: 18, color: '#c5a048' },
  { label: 'Mixed-Use', value: 15, color: '#1e73be' },
  { label: 'Hospitality', value: 10, color: '#d1d5db' },
];

export const QUARTERLY_RETURNS_LABELS = [
  'Core Income',
  'CREIF',
  'Growth',
  'Mortgage',
  'High Yield',
];

export const QUARTERLY_RETURNS_DATA = {
  q1: [2.4, 1.8, 3.1, 1.2, 2.8],
  q2: [2.1, 2.0, 2.6, 1.5, 2.2],
  q3: [2.8, 2.4, 3.4, 1.8, 2.6],
  q4: [2.5, 2.2, 3.0, 1.6, 2.4],
};

export const INVESTOR_GROWTH_LABELS = ['2018', '2019', '2020', '2021', '2022', '2023', '2024'];

export const INVESTOR_GROWTH_DATA = [72, 88, 102, 118, 135, 152, 168];

export const GEOGRAPHIC_DISTRIBUTION_LABELS = ['ON', 'BC', 'QC', 'AB', 'Other'];

export const GEOGRAPHIC_DISTRIBUTION_DATA = [48, 22, 14, 10, 6];

export const ACTIVE_FUNDS_ROWS: ActiveFundRow[] = [
  {
    rank: 1,
    name: 'KingSett Canadian Real Estate Income Fund LP',
    aum: '$4.82B',
    q3Return: '2.1%',
    q3ReturnPositive: true,
    investors: 142,
    assets: 8,
    status: 'Active',
  },
  {
    rank: 2,
    name: 'KingSett CRE Income Fund LP',
    aum: '$2.14B',
    q3Return: '1.8%',
    q3ReturnPositive: true,
    investors: 89,
    assets: 5,
    status: 'Active',
  },
  {
    rank: 3,
    name: 'KingSett Growth Fund LP',
    aum: '$1.67B',
    q3Return: '3.4%',
    q3ReturnPositive: true,
    investors: 64,
    assets: 4,
    status: 'Active',
  },
  {
    rank: 4,
    name: 'KingSett Mortgage Fund LP',
    aum: '$980M',
    q3Return: '1.2%',
    q3ReturnPositive: true,
    investors: 41,
    assets: 3,
    status: 'Active',
  },
  {
    rank: 5,
    name: 'KingSett High Yield Fund LP',
    aum: '$720M',
    q3Return: '2.6%',
    q3ReturnPositive: true,
    investors: 37,
    assets: 2,
    status: 'Active',
  },
];

export const ACTIVE_ASSETS_ROWS: ActiveAssetRow[] = [
  {
    rank: 1,
    name: 'Bay Adelaide Centre',
    type: 'Office',
    city: 'Toronto',
    marketValue: '$612M',
    quarterlyNoi: '$11M',
    occupancy: '96%',
    occupancyTone: 'positive',
    status: 'Stabilized',
    statusTone: 'positive',
  },
  {
    rank: 2,
    name: 'Pacific Centre',
    type: 'Office',
    city: 'Vancouver',
    marketValue: '$485M',
    quarterlyNoi: '$8.4M',
    occupancy: '94%',
    occupancyTone: 'positive',
    status: 'Stabilized',
    statusTone: 'positive',
  },
  {
    rank: 3,
    name: 'Yorkdale Shopping Centre',
    type: 'Retail',
    city: 'Toronto',
    marketValue: '$420M',
    quarterlyNoi: '$7.2M',
    occupancy: '97%',
    occupancyTone: 'positive',
    status: 'Stabilized',
    statusTone: 'positive',
  },
  {
    rank: 4,
    name: 'Maple Logistics Park',
    type: 'Industrial',
    city: 'Mississauga',
    marketValue: '$310M',
    quarterlyNoi: '$5.1M',
    occupancy: '88%',
    occupancyTone: 'warning',
    status: 'Value-Add',
    statusTone: 'warning',
  },
  {
    rank: 5,
    name: 'King West Lofts',
    type: 'Mixed-Use',
    city: 'Toronto',
    marketValue: '$275M',
    quarterlyNoi: '$4.6M',
    occupancy: '91%',
    occupancyTone: 'positive',
    status: 'Stabilized',
    statusTone: 'positive',
  },
];

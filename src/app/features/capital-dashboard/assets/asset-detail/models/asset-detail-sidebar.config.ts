import { InvestorDetailSidebarSection } from '../../../investors/investor-detail/models/investor-detail-table.models';

export const ASSET_DETAIL_SIDEBAR_SECTIONS: InvestorDetailSidebarSection[] = [
  {
    title: 'Overview',
    items: [{ id: 'overview', label: 'Overview' }],
  },
  {
    title: 'Details',
    items: [
      { id: 'area-summary', label: 'Area Summary' },
      { id: 'leasing', label: 'Leasing' },
      { id: 'valuation', label: 'Valuation' },
    ],
  },
  {
    title: 'Data',
    items: [
      { id: 'transactions', label: 'Transactions' },
      { id: 'documents', label: 'Documents' },
    ],
  },
  {
    title: 'More',
    items: [
      { id: 'esg-operations', label: 'ESG & Operations' },
      { id: 'risk-insurance', label: 'Risk & Insurance' },
    ],
  },
];

import { InvestorDetailSidebarSection } from '../../../investors/investor-detail/models/investor-detail-table.models';

export const INVESTMENT_DETAIL_SIDEBAR_SECTIONS: InvestorDetailSidebarSection[] = [
  {
    title: 'Overview',
    items: [{ id: 'overview', label: 'Overview' }],
  },
  {
    title: 'Details',
    items: [
      { id: 'capital-account', label: 'Capital Account' },
      { id: 'performance', label: 'Performance' },
    ],
  },
  {
    title: 'Data',
    items: [
      { id: 'assets', label: 'Assets' },
      { id: 'transactions', label: 'Transactions' },
      { id: 'documents', label: 'Documents' },
    ],
  },
  {
    title: 'Views',
    items: [
      { id: 'esg-reporting', label: 'ESG & Reporting' },
      { id: 'debt-financing', label: 'Debt & Financing' },
    ],
  },
];

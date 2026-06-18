import { InvestorDetailSidebarSection } from './investor-detail-table.models';

export const INVESTOR_DETAIL_SIDEBAR_SECTIONS: InvestorDetailSidebarSection[] = [
  {
    title: 'Overview',
    items: [
      { id: 'overview', label: 'Overview' },
      { id: 'investor-transactions', label: 'Transactions' },
    ],
  },
  {
    title: 'Details',
    items: [
      { id: 'fund-exposure', label: 'Fund Exposure' },
      { id: 'capital-account', label: 'Capital Account' },
      { id: 'performance', label: 'Performance' },
    ],
  },
  {
    title: 'Data',
    items: [
      { id: 'investments', label: 'Investments' },
      { id: 'documents', label: 'Documents' },
    ],
  },
  {
    title: 'More',
    items: [
      { id: 'risk-compliance', label: 'Risk & Compliance' },
      { id: 'communications', label: 'Communications' },
    ],
  },
];

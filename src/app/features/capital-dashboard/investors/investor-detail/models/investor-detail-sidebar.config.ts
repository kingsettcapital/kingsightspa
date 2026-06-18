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
    title: 'Data',
    items: [
      { id: 'investments', label: 'Investments' },
      { id: 'documents', label: 'Documents' },
    ],
  },
];

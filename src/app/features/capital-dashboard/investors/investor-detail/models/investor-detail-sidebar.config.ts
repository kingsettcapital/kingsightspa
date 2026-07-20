import { InvestorDetailSidebarSection } from './investor-detail-table.models';

export const INVESTOR_DETAIL_SIDEBAR_SECTIONS: InvestorDetailSidebarSection[] = [
  {
    title: '',
    items: [
      { id: 'overview', label: 'Investor Overview' },
      { id: 'fund-holdings-summary', label: 'Fund Holdings Summary' },
      { id: 'investor-transactions', label: 'Investor Transactions' },
      { id: 'underlying-assets', label: 'Asset Holdings' },
      { id: 'documents', label: 'Documents' },
    ],
  },
];

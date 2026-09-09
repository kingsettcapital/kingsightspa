import { InvestorDetailSidebarSection } from '../../../investors/investor-detail/models/investor-detail-table.models';

export const INVESTMENT_DETAIL_SIDEBAR_SECTIONS: InvestorDetailSidebarSection[] = [
  {
    title: 'Overview',
    items: [
      { id: 'overview', label: 'Overview' },
      { id: 'assets', label: 'Assets' },
      { id: 'financial-metrics', label: 'Financial Metrics' },
      { id: 'fund-transactions', label: 'Transactions' },
      { id: 'capital-account', label: 'Capital Account' },
      // { id: 'documents', label: 'Documents' },
      // { id: 'performance', label: 'Performance' },
    ],
  },
  // {
  //   title: 'Data',
  //   items: [
  //     { id: 'assets', label: 'Assets' },
  //     { id: 'financial-metrics', label: 'Financial Metrics' },
  //   ],
  // },
  // {
  //   title: 'Views',
  //   items: [
  //     { id: 'esg-reporting', label: 'ESG & Reporting' },
  //     { id: 'debt-financing', label: 'Debt & Financing' },
  //   ],
  // },
];

import { InvestorDetailSidebarSection } from '../../../investors/investor-detail/models/investor-detail-table.models';

/** Financial Metrics is hidden for now; set to true to show the section (and load its data) again. */
export const SHOW_ASSET_FINANCIAL_METRICS = false;

const ALL_ASSET_DETAIL_SIDEBAR_SECTIONS: InvestorDetailSidebarSection[] = [
  {
    title: 'Overview',
    items: [{ id: 'overview', label: 'Overview' }],
  },
  {
    title: 'Details',
    items: [
      { id: 'area-summary', label: 'Asset Overview' },
      { id: 'acquisition-sale', label: 'Acquisition & Sale' },
      { id: 'fund-holdings', label: 'Fund Holdings' },
      { id: 'leasing', label: 'Leasing' },
      { id: 'financial-metrics', label: 'Financial Metrics' },
      { id: 'asset-type-summary', label: 'GLA share by asset type' },
    ],
  },
];

export const ASSET_DETAIL_SIDEBAR_SECTIONS: InvestorDetailSidebarSection[] =
  ALL_ASSET_DETAIL_SIDEBAR_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => SHOW_ASSET_FINANCIAL_METRICS || item.id !== 'financial-metrics',
    ),
  }));

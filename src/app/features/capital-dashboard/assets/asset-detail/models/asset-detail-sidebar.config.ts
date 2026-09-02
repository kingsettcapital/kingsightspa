import { InvestorDetailSidebarSection } from '../../../investors/investor-detail/models/investor-detail-table.models';

export const ASSET_DETAIL_SIDEBAR_SECTIONS: InvestorDetailSidebarSection[] = [
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
      { id: 'property-details', label: 'Property Details' },
    ],
  },
];

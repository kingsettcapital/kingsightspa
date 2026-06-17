import { InvestorDetailTableBlock } from '../../investors/investor-detail/models/investor-detail-block.models';

/** Shared defaults for drill-down data tables (investor + investment pages). */
export function createDetailTableBlock(
  config: Omit<InvestorDetailTableBlock, 'kind'>,
): InvestorDetailTableBlock {
  return {
    kind: 'table',
    collapsible: true,
    defaultExpanded: true,
    ...config,
  };
}

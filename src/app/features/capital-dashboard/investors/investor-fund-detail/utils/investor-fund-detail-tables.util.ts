import {
  FundAssetTabRow,
  FundDetailDto,
  InvestorCapitalActivityTabRow,
  InvestorDistributionTableTabRow,
  InvestorIrrTabRow,
} from '../../../shared/models/api.models';
import {
  InvestorDetailBlock,
  InvestorDetailDocumentListBlock,
  InvestorDetailFieldGridBlock,
  InvestorDetailKpiRowBlock,
  InvestorDetailSectionBlock,
  InvestorDetailTableBlock,
} from '../../investor-detail/models/investor-detail-block.models';
import {
  INVESTOR_DETAIL_CELL_TONES_KEY,
  InvestorDetailColumnTone,
  InvestorDetailTableColumn,
  InvestorDetailTableRow,
} from '../../investor-detail/models/investor-detail-table.models';
import { INVESTMENT_DETAIL_DUMMY } from '../../../investments/investment-detail/data/investment-detail-dummy.data';
import {
  InvestmentDetailKpiCards,
  InvestmentDetailTimeframe,
} from '../../../investments/investment-detail/utils/investment-detail-tables.util';
import { INVESTOR_FUND_DETAIL_SIDEBAR_SECTIONS } from '../models/investor-fund-detail-sidebar.config';

export type InvestorFundDetailSectionId =
  | 'overview'
  | 'capital-account'
  | 'performance'
  | 'assets'
  | 'capital-activities'
  | 'distributions'
  | 'irrs'
  | 'documents'
  | 'esg-reporting'
  | 'debt-financing';

export interface InvestorFundDetailFlatBlock {
  sectionId: string;
  block: InvestorDetailBlock;
  isSectionStart: boolean;
}

export interface InvestorFundMatchContext {
  fundKey: number;
  fundCode: string | null;
  fundName: string;
}

function normalizeKey(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

export function matchesInvestorFundRow(
  row: { fundCode?: string | null; fundName?: string | null },
  context: InvestorFundMatchContext,
): boolean {
  const rowCode = row.fundCode?.trim() ?? '';
  const contextCode = context.fundCode?.trim() ?? '';
  if (contextCode && rowCode && rowCode.toLowerCase() === contextCode.toLowerCase()) {
    return true;
  }
  if (rowCode && rowCode === String(context.fundKey)) {
    return true;
  }
  const rowName = normalizeKey(row.fundName);
  const contextName = normalizeKey(context.fundName);
  return rowName.length > 0 && rowName === contextName;
}

export function filterCapitalActivitiesByFund(
  rows: InvestorCapitalActivityTabRow[],
  context: InvestorFundMatchContext,
): InvestorCapitalActivityTabRow[] {
  return rows.filter((row) => matchesInvestorFundRow(row, context));
}

export function filterDistributionTableByFund(
  rows: InvestorDistributionTableTabRow[],
  context: InvestorFundMatchContext,
): InvestorDistributionTableTabRow[] {
  return rows.filter((row) => matchesInvestorFundRow(row, context));
}

export function filterIrrByFund(
  rows: InvestorIrrTabRow[],
  context: InvestorFundMatchContext,
): InvestorIrrTabRow[] {
  return rows.filter((row) => matchesInvestorFundRow(row, context));
}

function formatCurrencyCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMultiple(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }
  return `${value.toFixed(2)}x`;
}

function formatPerformanceMultiple(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }
  return `${value.toFixed(2)}X`;
}

function formatPercentValue(value: number): string {
  return `${value.toFixed(1)}%`;
}

function tableBlock(config: Omit<InvestorDetailTableBlock, 'kind'>): InvestorDetailTableBlock {
  return { kind: 'table', ...config };
}

function fundToolbarTableBlock(
  config: Omit<InvestorDetailTableBlock, 'kind' | 'variant' | 'showToolbar' | 'collapsible' | 'defaultExpanded'>,
): InvestorDetailTableBlock {
  return tableBlock({
    ...config,
    collapsible: true,
    defaultExpanded: true,
    variant: 'transactions',
    showToolbar: false,
  });
}

function buildCapitalAccountGrid(
  kpi: InvestmentDetailKpiCards,
  timeframe: InvestmentDetailTimeframe,
  releasedCapital: number | null,
): InvestorDetailFieldGridBlock {
  const distributedLtd =
    timeframe === 'ltd' ? kpi.netDistributed : INVESTMENT_DETAIL_DUMMY.netDistributed.ltd;
  const totalValue = kpi.netInvestedCapital + distributedLtd;

  return {
    kind: 'field-grid',
    id: 'capital-account',
    title: 'Capital Account',
    collapsible: true,
    defaultExpanded: true,
    columns: [
      {
        fields: [
          { label: 'Total Commitment', value: formatCurrencyCompact(kpi.totalCommitment) },
          { label: 'Net Invested Capital', value: formatCurrencyCompact(kpi.netInvestedCapital) },
          { label: 'Reserved / Uncalled', value: formatCurrencyCompact(kpi.reservedUncalled) },
          { label: '% Invested', value: formatPercentValue(kpi.investedPercent) },
        ],
      },
      {
        fields: [
          { label: 'Net Distributed', value: formatCurrencyCompact(distributedLtd) },
          {
            label: 'Released Capital',
            value: formatCurrencyCompact(releasedCapital),
          },
          { label: 'Total Value (Investment Cost)', value: formatCurrencyCompact(totalValue) },
          { label: 'TVPI', value: formatMultiple(kpi.tvpi) },
        ],
      },
    ],
  };
}

function buildPerformanceKpiRow(
  kpi: InvestmentDetailKpiCards,
  timeframe: InvestmentDetailTimeframe,
): InvestorDetailKpiRowBlock {
  const distributedLtd = INVESTMENT_DETAIL_DUMMY.netDistributed.ltd;
  const dpi = kpi.netInvestedCapital > 0 ? distributedLtd / kpi.netInvestedCapital : 0.25;
  const deployLabel = timeframe === 'ltd' ? 'Deployment' : 'Deploy Rate';
  const deployValue =
    timeframe === 'ltd' ? kpi.investedPercent : INVESTMENT_DETAIL_DUMMY.investedPercentByTimeframe.daily;

  return {
    kind: 'kpi-row',
    id: 'performance-metrics',
    title: 'Performance Metrics',
    collapsible: true,
    defaultExpanded: true,
    display: 'performance',
    cards: [
      { label: 'TVPI', value: formatPerformanceMultiple(kpi.tvpi), hint: 'Total value / paid-in' },
      { label: 'DPI', value: formatPerformanceMultiple(dpi), hint: 'Distributions / paid-in' },
      { label: 'RVPI', value: formatPerformanceMultiple(1.0), hint: 'Net invested / paid-in' },
      { label: deployLabel, value: formatPercentValue(deployValue), hint: 'of total commitment' },
    ],
  };
}

function occupancyTone(value: number | null | undefined): InvestorDetailColumnTone {
  if (value == null || !Number.isFinite(value)) {
    return 'muted';
  }
  return value >= 90 ? 'positive' : 'warning';
}

function mapAssetsTable(assets: FundAssetTabRow[]): InvestorDetailTableBlock {
  const columns: InvestorDetailTableColumn[] = [
    { key: 'asset', label: 'Asset', type: 'text', align: 'left' },
    { key: 'type', label: 'Type', type: 'text', align: 'left', tone: 'muted' },
    { key: 'city', label: 'City', type: 'text', align: 'left', tone: 'muted' },
    { key: 'gla', label: 'GLA (sf)', type: 'number', align: 'right' },
    { key: 'occupancy', label: 'Occupancy', type: 'percent', align: 'right' },
    { key: 'marketValue', label: 'Market Value', type: 'amount', align: 'right' },
    { key: 'capRate', label: 'Cap Rate', type: 'percent', align: 'right', tone: 'muted' },
    { key: 'status', label: 'Status', type: 'status', align: 'left' },
  ];

  const rows: InvestorDetailTableRow[] =
    assets.length > 0
      ? assets.map((asset) => {
          const occupancy = parseOccupancy(asset);
          return {
            asset: asset.assetName,
            type: asset.assetType || asset.investmentType || '—',
            city: asset.city || '—',
            gla: readAssetGla(asset),
            occupancy,
            marketValue: readAssetMarketValue(asset),
            capRate: readAssetCapRate(asset),
            status: asset.propertyStatus || '—',
            [INVESTOR_DETAIL_CELL_TONES_KEY]: { occupancy: occupancyTone(occupancy) },
          };
        })
      : INVESTMENT_DETAIL_DUMMY.assets.map((asset) => ({
          asset: asset.asset,
          type: asset.type,
          city: asset.city,
          gla: asset.gla,
          occupancy: asset.occupancy,
          marketValue: asset.marketValue,
          capRate: asset.capRate,
          status: asset.status,
          [INVESTOR_DETAIL_CELL_TONES_KEY]: { occupancy: occupancyTone(asset.occupancy) },
        }));

  return tableBlock({
    id: 'underlying-assets',
    title: 'Underlying Assets',
    subtitle: 'Properties and assets held within this fund',
    columns,
    rows,
    collapsible: true,
    defaultExpanded: true,
    variant: 'investments',
  });
}

function parseOccupancy(asset: FundAssetTabRow): number | null {
  const raw = (asset as FundAssetTabRow & { occupancy?: number }).occupancy;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function readAssetGla(asset: FundAssetTabRow): number {
  const raw = (asset as FundAssetTabRow & { gla?: number }).gla;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

function readAssetMarketValue(asset: FundAssetTabRow): number {
  const raw = (asset as FundAssetTabRow & { marketValue?: number }).marketValue;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

function readAssetCapRate(asset: FundAssetTabRow): number | null {
  const raw = (asset as FundAssetTabRow & { capRate?: number }).capRate;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function buildCapitalActivitiesTable(
  rows: InvestorCapitalActivityTabRow[],
  periodLabel: string,
): InvestorDetailTableBlock {
  const tableRows: InvestorDetailTableRow[] = rows.map((row) => ({
    called: row.called,
    transferIn: row.transferIn,
    transferOut: row.transferOut,
    redemption: row.redemption,
  }));
  const columns: InvestorDetailTableColumn[] = [
    { key: 'called', label: 'Called', type: 'amount', align: 'right' },
    { key: 'transferIn', label: 'Transfer In', type: 'amount', align: 'right' },
    { key: 'transferOut', label: 'Transfer Out', type: 'amount', align: 'right', tone: 'negative' },
    { key: 'redemption', label: 'Redemption', type: 'amount', align: 'right' },
  ];

  return fundToolbarTableBlock({
    id: 'capital-activities',
    title: 'Capital Activities',
    subtitle: 'Capital calls, transfers, and redemptions for this subscription ·',
    subtitleAccent: periodLabel,
    columns,
    rows: tableRows,
    totals: null,
  });
}

function buildDistributionsTable(
  rows: InvestorDistributionTableTabRow[],
  periodLabel: string,
): InvestorDetailTableBlock {
  const tableRows: InvestorDetailTableRow[] = rows.map((row) => ({
    prefReturn: row.preferredReturn,
    cashDist: row.cashDist,
    gainDist: row.gainDist,
    returnOfCapital: row.returnOfCapital,
  }));
  const columns: InvestorDetailTableColumn[] = [
    { key: 'prefReturn', label: 'Pref. Return', type: 'amount', align: 'right', tone: 'info' },
    { key: 'cashDist', label: 'Cash Dist.', type: 'amount', align: 'right', tone: 'positive' },
    { key: 'gainDist', label: 'Gain Dist.', type: 'amount', align: 'right', tone: 'positive' },
    { key: 'returnOfCapital', label: 'Return of Capital', type: 'amount', align: 'right' },
  ];

  return fundToolbarTableBlock({
    id: 'distributions',
    title: 'Distributions',
    subtitle: 'Distribution activity for this subscription ·',
    subtitleAccent: periodLabel,
    columns,
    rows: tableRows,
    totals: null,
  });
}

function buildIrrsTable(rows: InvestorIrrTabRow[], periodLabel: string): InvestorDetailTableBlock {
  const tableRows: InvestorDetailTableRow[] = rows.map((row) => ({
    irr1Year: row.irr1Year,
    irr3Year: row.irr3Year,
    irr5Year: row.irr5Year,
    irr7Year: row.irr7Year,
    irr10Year: row.irr10Year,
    irrLtd: row.irrLtd,
  }));
  const columns: InvestorDetailTableColumn[] = [
    { key: 'irr1Year', label: '1Y IRR', type: 'percent', align: 'right' },
    { key: 'irr3Year', label: '3Y IRR', type: 'percent', align: 'right' },
    { key: 'irr5Year', label: '5Y IRR', type: 'percent', align: 'right' },
    { key: 'irr7Year', label: '7Y IRR', type: 'percent', align: 'right' },
    { key: 'irr10Year', label: '10Y IRR', type: 'percent', align: 'right' },
    { key: 'irrLtd', label: 'ITD IRR', type: 'percent', align: 'right', tone: 'info' },
  ];

  return fundToolbarTableBlock({
    id: 'irrs',
    title: 'IRRs',
    subtitle: 'Internal rate of return for this subscription ·',
    subtitleAccent: periodLabel,
    columns,
    rows: tableRows,
    totals: null,
  });
}

function buildDocumentsList(): InvestorDetailDocumentListBlock {
  return {
    kind: 'document-list',
    id: 'documents',
    title: 'Documents',
    subtitle: 'Financial statements, reports, and fund agreements',
    collapsible: true,
    defaultExpanded: true,
    documents: [...INVESTMENT_DETAIL_DUMMY.documents],
  };
}

function buildBlocksForSection(
  sectionId: InvestorFundDetailSectionId,
  detail: FundDetailDto | null,
  assets: FundAssetTabRow[],
  capitalActivities: InvestorCapitalActivityTabRow[],
  distributionTable: InvestorDistributionTableTabRow[],
  irr: InvestorIrrTabRow[],
  kpi: InvestmentDetailKpiCards,
  timeframe: InvestmentDetailTimeframe,
  periodLabel: string,
  releasedCapital: number | null,
): InvestorDetailBlock[] {
  void detail;

  switch (sectionId) {
    case 'overview':
      return [];
    case 'capital-account':
      return [buildCapitalAccountGrid(kpi, timeframe, releasedCapital)];
    case 'performance':
      return [buildPerformanceKpiRow(kpi, timeframe)];
    case 'assets':
      return [mapAssetsTable(assets)];
    case 'capital-activities':
      return capitalActivities.length ? [buildCapitalActivitiesTable(capitalActivities, periodLabel)] : [];
    case 'distributions':
      return distributionTable.length ? [buildDistributionsTable(distributionTable, periodLabel)] : [];
    case 'irrs':
      return irr.length ? [buildIrrsTable(irr, periodLabel)] : [];
    case 'documents':
      return [buildDocumentsList()];
    case 'esg-reporting':
    case 'debt-financing':
      return [];
    default:
      return [];
  }
}

export function buildFlatInvestorFundBlocks(
  detail: FundDetailDto | null,
  assets: FundAssetTabRow[],
  capitalActivities: InvestorCapitalActivityTabRow[],
  distributionTable: InvestorDistributionTableTabRow[],
  irr: InvestorIrrTabRow[],
  kpi: InvestmentDetailKpiCards,
  timeframe: InvestmentDetailTimeframe,
  periodLabel: string,
  releasedCapital: number | null,
): InvestorFundDetailFlatBlock[] {
  const flat: InvestorFundDetailFlatBlock[] = [];

  for (const section of INVESTOR_FUND_DETAIL_SIDEBAR_SECTIONS) {
    for (const item of section.items) {
      const blocks = buildBlocksForSection(
        item.id as InvestorFundDetailSectionId,
        detail,
        assets,
        capitalActivities,
        distributionTable,
        irr,
        kpi,
        timeframe,
        periodLabel,
        releasedCapital,
      );
      blocks.forEach((block, index) => {
        flat.push({
          sectionId: item.id,
          block,
          isSectionStart: index === 0,
        });
      });
    }
  }

  return flat;
}

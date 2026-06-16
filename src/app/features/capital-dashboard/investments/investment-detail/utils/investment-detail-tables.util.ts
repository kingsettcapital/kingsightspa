import {
  FundAmountTabRow,
  FundAssetTabRow,
  FundCommitmentTabRow,
  FundDetailDto,
  FundDistributionGroupTabRow,
  FundInvestorCapitalActivityTabRow,
  FundInvestorDistributionTableTabRow,
  FundInvestorIrrTabRow,
} from '../../../shared/models/api.models';
import { FundTableRow } from '../../../shared/utils/fund-list-row.util';
import {
  InvestorDetailBlock,
  InvestorDetailDebtFinancingBlock,
  InvestorDetailDocumentListBlock,
  InvestorDetailEsgMetricsBlock,
  InvestorDetailFieldGridBlock,
  InvestorDetailKpiRowBlock,
  InvestorDetailSectionBlock,
  InvestorDetailTableBlock,
} from '../../../investors/investor-detail/models/investor-detail-block.models';
import {
  INVESTOR_DETAIL_CELL_TONES_KEY,
  InvestorDetailColumnTone,
  InvestorDetailTableColumn,
  InvestorDetailTableRow,
} from '../../../investors/investor-detail/models/investor-detail-table.models';
import { INVESTMENT_DETAIL_SIDEBAR_SECTIONS } from '../models/investment-detail-sidebar.config';
import {
  INVESTMENT_DETAIL_DUMMY,
  investedPercentForTimeframe,
  netDistributedForTimeframe,
} from '../data/investment-detail-dummy.data';

export type InvestmentDetailTimeframe = 'ltd' | 'quarterly' | 'daily';
export type InvestmentDetailSectionId =
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

export interface InvestmentDetailKpiCards {
  totalCommitment: number;
  netInvestedCapital: number;
  netDistributed: number;
  reservedUncalled: number | null;
  investedPercent: number;
  tvpi: number;
}

export interface InvestmentDetailFlatBlock {
  sectionId: string;
  block: InvestorDetailBlock;
  isSectionStart: boolean;
}

function sumColumn(rows: InvestorDetailTableRow[], key: string): number {
  return rows.reduce((total, row) => {
    const value = row[key];
    return total + (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  }, 0);
}

function buildTotalsRow(
  columns: InvestorDetailTableColumn[],
  rows: InvestorDetailTableRow[],
  labelKey = 'fundCode',
  label = 'TOTALS',
): InvestorDetailTableRow {
  const totals: InvestorDetailTableRow = { [labelKey]: label };

  for (const column of columns) {
    if (column.key === labelKey) {
      continue;
    }
    if (column.type === 'amount' || column.type === 'number') {
      totals[column.key] = sumColumn(rows, column.key);
      continue;
    }
    totals[column.key] = '—';
  }

  return totals;
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

function occupancyTone(value: number | null | undefined): InvestorDetailColumnTone {
  if (value == null || !Number.isFinite(value)) {
    return 'muted';
  }
  return value >= 90 ? 'positive' : 'warning';
}

export function kpiCardsFromListRow(
  row: FundTableRow | null,
  timeframe: InvestmentDetailTimeframe,
): InvestmentDetailKpiCards {
  const dummy = INVESTMENT_DETAIL_DUMMY;
  const commitment = row?.commitment ?? dummy.totalCommitment;
  const netInvested =
    timeframe === 'ltd'
      ? row?.netInvestedCapital ?? dummy.netInvestedCapitalLtd
      : row?.netInvestedCapital ?? dummy.netInvestedCapitalAdjusted;
  const distributed =
    timeframe === 'ltd'
      ? row?.netDistributed ?? dummy.netDistributed.ltd
      : netDistributedForTimeframe(timeframe);
  const reserved = row?.reservedUncalled ?? dummy.reservedUncalled;
  const investedPct =
    commitment > 0
      ? (netInvested / commitment) * 100
      : investedPercentForTimeframe(timeframe);

  const totalValue = netInvested + (timeframe === 'ltd' ? distributed : dummy.netDistributed.ltd);
  const tvpi = netInvested > 0 ? totalValue / netInvested : dummy.tvpi;

  return {
    totalCommitment: commitment,
    netInvestedCapital: netInvested,
    netDistributed: distributed,
    reservedUncalled: reserved != null && reserved > 0 ? reserved : null,
    investedPercent: investedPct,
    tvpi: Math.round(tvpi * 100) / 100 || dummy.tvpi,
  };
}

function buildCapitalAccountGrid(
  kpi: InvestmentDetailKpiCards,
  timeframe: InvestmentDetailTimeframe,
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
          { label: 'Total Commitment (ITD)', value: formatCurrencyCompact(kpi.totalCommitment) },
          {
            label: 'Net Invested Capital',
            value: formatCurrencyCompact(kpi.netInvestedCapital),
          },
          {
            label: 'Reserved / Uncalled',
            value: formatCurrencyCompact(kpi.reservedUncalled),
          },
          { label: '% Invested', value: formatPercentValue(kpi.investedPercent) },
        ],
      },
      {
        fields: [
          { label: 'Net Distributed (ITD)', value: formatCurrencyCompact(distributedLtd) },
          { label: 'Released Capital', value: '—' },
          {
            label: 'Total Value (Investment Cost)',
            value: formatCurrencyCompact(totalValue),
          },
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
  const tvpi = kpi.tvpi;
  const rvpi = 1.0;
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
      {
        label: 'TVPI',
        value: formatPerformanceMultiple(tvpi),
        hint: 'Total value / paid-in',
      },
      {
        label: 'DPI',
        value: formatPerformanceMultiple(dpi),
        hint: 'Distributions / paid-in',
      },
      {
        label: 'RVPI',
        value: formatPerformanceMultiple(rvpi),
        hint: 'Net invested / paid-in',
      },
      {
        label: deployLabel,
        value: formatPercentValue(deployValue),
        hint: 'of total commitment',
      },
    ],
  };
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
            [INVESTOR_DETAIL_CELL_TONES_KEY]: {
              occupancy: occupancyTone(occupancy),
            },
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
          [INVESTOR_DETAIL_CELL_TONES_KEY]: {
            occupancy: occupancyTone(asset.occupancy),
          },
        }));

  return tableBlock({
    id: 'underlying-assets',
    title: 'Underlying Assets',
    subtitle: 'Properties and assets held within this fund',
    columns,
    rows,
    collapsible: false,
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

function fundToolbarTableBlock(
  config: Omit<InvestorDetailTableBlock, 'kind' | 'variant' | 'showToolbar' | 'collapsible' | 'defaultExpanded'>,
): InvestorDetailTableBlock {
  return tableBlock({
    ...config,
    collapsible: false,
    defaultExpanded: true,
    variant: 'transactions',
    showToolbar: true,
  });
}

function capitalActivityRowsToTableRows(rows: FundInvestorCapitalActivityTabRow[]): InvestorDetailTableRow[] {
  return rows.map((row) => ({
    investorCode: row.investorCode,
    investorName: row.investorName,
    called: row.called,
    transferIn: row.transferIn,
    transferOut: row.transferOut,
    redemption: row.redemption,
  }));
}

function distributionTableRowsToTableRows(rows: FundInvestorDistributionTableTabRow[]): InvestorDetailTableRow[] {
  return rows.map((row) => ({
    investorCode: row.investorCode,
    investorName: row.investorName,
    prefReturn: row.preferredReturn,
    committed: row.committed,
    unfunded: row.unfunded,
    cashDist: row.cashDist,
    gainDist: row.gainDist,
    returnOfCapital: row.returnOfCapital,
    released: row.released,
  }));
}

function irrRowsToTableRows(rows: FundInvestorIrrTabRow[]): InvestorDetailTableRow[] {
  return rows.map((row) => ({
    investorCode: row.investorCode,
    investorName: row.investorName,
    irr1Year: row.irr1Year,
    irr3Year: row.irr3Year,
    irr5Year: row.irr5Year,
    irr7Year: row.irr7Year,
    irr10Year: row.irr10Year,
    irrLtd: row.irrLtd,
  }));
}

function buildCapitalActivitiesTable(
  rows: FundInvestorCapitalActivityTabRow[],
  periodLabel: string,
): InvestorDetailTableBlock {
  const tableRows = capitalActivityRowsToTableRows(rows);
  const columns: InvestorDetailTableColumn[] = [
    { key: 'investorCode', label: 'Investor Code', type: 'link', align: 'left', sortBy: 'investor_code' },
    { key: 'investorName', label: 'Investor Name', type: 'text', align: 'left', sortBy: 'investor_name' },
    { key: 'called', label: 'Called', type: 'amount', align: 'right', sortBy: 'called' },
    { key: 'transferIn', label: 'Transfer In', type: 'amount', align: 'right', sortBy: 'transfer_in' },
    { key: 'transferOut', label: 'Transfer Out', type: 'amount', align: 'right', tone: 'negative', sortBy: 'transfer_out' },
    { key: 'redemption', label: 'Redemption', type: 'amount', align: 'right', sortBy: 'redemption' },
  ];

  return fundToolbarTableBlock({
    id: 'capital-activities',
    title: 'Capital Activities',
    subtitle: 'Capital calls, transfers, and redemptions by investor ·',
    subtitleAccent: periodLabel,
    columns,
    rows: tableRows,
    totals: tableRows.length ? buildTotalsRow(columns, tableRows, 'investorCode', `Total — ${tableRows.length}`) : null,
  });
}

function buildDistributionsTable(
  rows: FundInvestorDistributionTableTabRow[],
  periodLabel: string,
): InvestorDetailTableBlock {
  const tableRows = distributionTableRowsToTableRows(rows);
  const columns: InvestorDetailTableColumn[] = [
    { key: 'investorCode', label: 'Investor Code', type: 'link', align: 'left', sortBy: 'investor_code' },
    { key: 'investorName', label: 'Investor Name', type: 'text', align: 'left', sortBy: 'investor_name' },
    { key: 'prefReturn', label: `Pref. Return (${periodLabel})`, type: 'amount', align: 'right', tone: 'info', sortBy: 'preferred_return' },
    { key: 'committed', label: 'Committed', type: 'amount', align: 'right', sortBy: 'committed' },
    { key: 'unfunded', label: 'Unfunded', type: 'amount', align: 'right', tone: 'warning', sortBy: 'unfunded' },
    { key: 'cashDist', label: `Cash Dist. (${periodLabel})`, type: 'amount', align: 'right', tone: 'positive', sortBy: 'cash_dist' },
    { key: 'gainDist', label: `Gain Dist. (${periodLabel})`, type: 'amount', align: 'right', tone: 'positive', sortBy: 'gain_dist' },
    { key: 'returnOfCapital', label: 'Return of Capital', type: 'amount', align: 'right', sortBy: 'return_of_capital' },
    { key: 'released', label: 'Released', type: 'amount', align: 'right', sortBy: 'released' },
  ];

  return fundToolbarTableBlock({
    id: 'distributions',
    title: 'Distributions',
    subtitle: 'Distribution activity and capital account balances by investor ·',
    subtitleAccent: periodLabel,
    columns,
    rows: tableRows,
    totals: tableRows.length ? buildTotalsRow(columns, tableRows, 'investorCode', `Total — ${tableRows.length}`) : null,
  });
}

function buildIrrsTable(rows: FundInvestorIrrTabRow[], periodLabel: string): InvestorDetailTableBlock {
  const tableRows = irrRowsToTableRows(rows);
  const columns: InvestorDetailTableColumn[] = [
    { key: 'investorCode', label: 'Investor Code', type: 'link', align: 'left', sortBy: 'investor_code' },
    { key: 'investorName', label: 'Investor Name', type: 'text', align: 'left', sortBy: 'investor_name' },
    { key: 'irr1Year', label: '1Y IRR', type: 'percent', align: 'right', sortBy: 'irr_1_year_pct' },
    { key: 'irr3Year', label: '3Y IRR', type: 'percent', align: 'right', sortBy: 'irr_3_year_pct' },
    { key: 'irr5Year', label: '5Y IRR', type: 'percent', align: 'right', sortBy: 'irr_5_year_pct' },
    { key: 'irr7Year', label: '7Y IRR', type: 'percent', align: 'right', sortBy: 'irr_7_year_pct' },
    { key: 'irr10Year', label: '10Y IRR', type: 'percent', align: 'right', sortBy: 'irr_10_year_pct' },
    { key: 'irrLtd', label: 'ITD IRR', type: 'percent', align: 'right', tone: 'info', sortBy: 'irr_ltd_pct' },
  ];

  return fundToolbarTableBlock({
    id: 'irrs',
    title: 'IRRs',
    subtitle: 'Internal rate of return by investor ·',
    subtitleAccent: periodLabel,
    columns,
    rows: tableRows,
    totals: null,
  });
}

function buildDocumentsList(detail: FundDetailDto | null): InvestorDetailDocumentListBlock {
  const count = detail?.summary.assets ?? 0;
  const documents =
    count > 0
      ? INVESTMENT_DETAIL_DUMMY.documents
      : INVESTMENT_DETAIL_DUMMY.documents;

  return {
    kind: 'document-list',
    id: 'documents',
    title: 'Documents',
    subtitle: 'Financial statements, reports, and fund agreements',
    collapsible: false,
    defaultExpanded: true,
    documents: [...documents],
  };
}

function buildEsgMetricsBlock(): InvestorDetailEsgMetricsBlock {
  return {
    kind: 'esg-metrics',
    id: 'esg-reporting',
    title: 'ESG & Sustainability Reporting',
    collapsible: true,
    defaultExpanded: true,
    cards: INVESTMENT_DETAIL_DUMMY.esg.map((card) => ({ ...card })),
  };
}

function buildDebtFinancingBlock(): InvestorDetailDebtFinancingBlock {
  const debt = INVESTMENT_DETAIL_DUMMY.debt;
  return {
    kind: 'debt-financing',
    id: 'debt-financing',
    title: 'Debt & Financing',
    collapsible: true,
    defaultExpanded: true,
    metrics: [
      { label: 'Total Debt Outstanding', value: formatCurrencyCompact(debt.totalDebtOutstanding) },
      { label: 'LTV Ratio', value: formatPercentValue(debt.ltvRatio) },
      { label: 'DSCR (avg)', value: formatMultiple(debt.dscr) },
      { label: 'Weighted Avg Rate', value: formatPercentValue(debt.weightedAvgRate) },
      { label: 'Fixed Rate %', value: formatPercentValue(debt.fixedRatePercent) },
    ],
    maturitySchedule: [...debt.maturitySchedule],
  };
}

export function buildBlocksForSection(
  sectionId: InvestmentDetailSectionId,
  detail: FundDetailDto | null,
  assets: FundAssetTabRow[],
  commitments: FundAmountTabRow[],
  unfunded: FundAmountTabRow[],
  capitalInvestments: FundCommitmentTabRow[],
  distributions: FundDistributionGroupTabRow[],
  capitalActivities: FundInvestorCapitalActivityTabRow[],
  distributionTable: FundInvestorDistributionTableTabRow[],
  irr: FundInvestorIrrTabRow[],
  kpi: InvestmentDetailKpiCards,
  timeframe: InvestmentDetailTimeframe,
  periodLabel: string,
): InvestorDetailBlock[] {
  void commitments;
  void unfunded;
  void capitalInvestments;
  void distributions;

  switch (sectionId) {
    case 'overview':
      return [];
    case 'capital-account':
      return [buildCapitalAccountGrid(kpi, timeframe)];
    case 'performance':
      return [buildPerformanceKpiRow(kpi, timeframe)];
    case 'assets':
      return [mapAssetsTable(assets)];
    case 'capital-activities':
      return [buildCapitalActivitiesTable(capitalActivities, periodLabel)];
    case 'distributions':
      return [buildDistributionsTable(distributionTable, periodLabel)];
    case 'irrs':
      return [buildIrrsTable(irr, periodLabel)];
    case 'documents':
      return [buildDocumentsList(detail)];
    case 'esg-reporting':
      return [buildEsgMetricsBlock()];
    case 'debt-financing':
      return [buildDebtFinancingBlock()];
    default:
      return [];
  }
}

export function buildFlatInvestmentBlocks(
  detail: FundDetailDto | null,
  assets: FundAssetTabRow[],
  commitments: FundAmountTabRow[],
  unfunded: FundAmountTabRow[],
  capitalInvestments: FundCommitmentTabRow[],
  distributions: FundDistributionGroupTabRow[],
  capitalActivities: FundInvestorCapitalActivityTabRow[],
  distributionTable: FundInvestorDistributionTableTabRow[],
  irr: FundInvestorIrrTabRow[],
  kpi: InvestmentDetailKpiCards,
  timeframe: InvestmentDetailTimeframe,
  periodLabel: string,
): InvestmentDetailFlatBlock[] {
  const sections = buildAllSectionBlocks(
    detail,
    assets,
    commitments,
    unfunded,
    capitalInvestments,
    distributions,
    capitalActivities,
    distributionTable,
    irr,
    kpi,
    timeframe,
    periodLabel,
  );

  const flat: InvestmentDetailFlatBlock[] = [];
  for (const section of sections) {
    if (!section.blocks.length) {
      continue;
    }
    section.blocks.forEach((block, index) => {
      flat.push({
        sectionId: section.sectionId,
        block,
        isSectionStart: index === 0,
      });
    });
  }
  return flat;
}

export function buildAllSectionBlocks(
  detail: FundDetailDto | null,
  assets: FundAssetTabRow[],
  commitments: FundAmountTabRow[],
  unfunded: FundAmountTabRow[],
  capitalInvestments: FundCommitmentTabRow[],
  distributions: FundDistributionGroupTabRow[],
  capitalActivities: FundInvestorCapitalActivityTabRow[],
  distributionTable: FundInvestorDistributionTableTabRow[],
  irr: FundInvestorIrrTabRow[],
  kpi: InvestmentDetailKpiCards,
  timeframe: InvestmentDetailTimeframe,
  periodLabel: string,
): InvestorDetailSectionBlock[] {
  return INVESTMENT_DETAIL_SIDEBAR_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      sectionId: item.id,
      blocks: buildBlocksForSection(
        item.id as InvestmentDetailSectionId,
        detail,
        assets,
        commitments,
        unfunded,
        capitalInvestments,
        distributions,
        capitalActivities,
        distributionTable,
        irr,
        kpi,
        timeframe,
        periodLabel,
      ),
    })),
  );
}

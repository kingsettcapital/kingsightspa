import {
  PropertyDetailDto,
  PropertyLeasingSummaryDto,
  AssetFundHoldingTabRow,
  AssetPropertyDetailTabRow,
  AssetTypeSummaryRow,
} from '../../../shared/models/api.models';
import { AssetTableRow } from '../../../shared/utils/asset-list-row.util';
import {
  InvestorDetailBlock,
  InvestorDetailDocumentListBlock,
  InvestorDetailEsgMetricsBlock,
  InvestorDetailFieldGridBlock,
  InvestorDetailAssetTypeSummaryBlock,
  InvestorDetailAcquisitionSaleBlock,
  InvestorDetailFinancialMetricsBlock,
  InvestorDetailLeasingSummaryBlock,
  InvestorDetailRiskInsuranceBlock,
  InvestorDetailTableBlock,
} from '../../../investors/investor-detail/models/investor-detail-block.models';
import { AssetFinancialMetricsRow } from '../../../shared/mappers/asset-financial-metrics.mapper';
import {
  AssetAcquisitionSaleRow,
} from '../../../shared/mappers/asset-acquisition-sale.mapper';
import {
  INVESTOR_DETAIL_CELL_TONES_KEY,
  InvestorDetailTableColumn,
  InvestorDetailTableRow,
} from '../../../investors/investor-detail/models/investor-detail-table.models';
import { ASSET_DETAIL_SIDEBAR_SECTIONS } from '../models/asset-detail-sidebar.config';
import { ASSET_DETAIL_DUMMY } from '../data/asset-detail-dummy.data';
import {
  ASSET_DETAIL_EMPTY,
  formatAssetDisplayCount,
  formatAssetDisplayCurrency,
  formatAssetDisplayMonths,
  formatAssetDisplayPercent,
  formatAssetDisplaySqFt,
  formatAssetDisplayString,
  readLeasingSummaryNumber,
  readPropertyDetailNumber,
  readPropertyDetailString,
} from './asset-detail-api.util';

export type AssetDetailSectionId =
  | 'overview'
  | 'area-summary'
  | 'acquisition-sale'
  | 'asset-type-summary'
  | 'property-details'
  | 'leasing'
  | 'financial-metrics'
  | 'fund-holdings'
  | 'transactions'
  | 'documents'
  | 'esg-operations'
  | 'risk-insurance';

export interface AssetDetailKpiCards {
  totalGlaSf: number | null;
  committedSf: number | null;
  vacantSf: number | null;
  occupiedPercent: number | null;
  vacantPercent: number | null;
  marketValue: number | null;
}

export interface AssetDetailFlatBlock {
  sectionId: string;
  block: InvestorDetailBlock;
  isSectionStart: boolean;
}

function tableBlock(config: Omit<InvestorDetailTableBlock, 'kind'>): InvestorDetailTableBlock {
  return { kind: 'table', ...config };
}

function pickNumber(
  detail: PropertyDetailDto | null,
  row: AssetTableRow | null,
  detailKeys: string[],
  rowValue: number | null | undefined,
): number | null {
  const fromDetail = readPropertyDetailNumber(detail, ...detailKeys);
  if (fromDetail != null) {
    return fromDetail;
  }
  if (rowValue != null && Number.isFinite(rowValue)) {
    return rowValue;
  }
  return null;
}

export function kpiCardsFromAssetDetail(
  detail: PropertyDetailDto | null,
  row: AssetTableRow | null,
): AssetDetailKpiCards {
  const totalGlaSf = pickNumber(detail, row, ['total_gla_sf', 'totalGlaSf'], row?.glaSf);
  const committedSf = pickNumber(
    detail,
    row,
    ['committed_area_sf', 'committedAreaSf'],
    row?.committedSf,
  );
  const vacantSf = pickNumber(detail, row, ['vacant_area_sf', 'vacantAreaSf'], row?.vacantSf);
  const occupiedPercent = pickNumber(
    detail,
    row,
    ['occupancy_rate', 'occupancyRate'],
    row?.occupiedPercent,
  );
  const vacancyRate = readPropertyDetailNumber(detail, 'vacancy_rate', 'vacancyRate');
  const vacantPercent =
    vacancyRate ??
    (totalGlaSf != null && totalGlaSf > 0 && vacantSf != null
      ? (vacantSf / totalGlaSf) * 100
      : null);
  const marketValue = readPropertyDetailNumber(detail, 'est_market_value', 'estMarketValue');

  return {
    totalGlaSf,
    committedSf,
    vacantSf,
    occupiedPercent,
    vacantPercent,
    marketValue,
  };
}

function buildAreaSummaryGrid(
  detail: PropertyDetailDto | null,
  kpi: AssetDetailKpiCards,
  row: AssetTableRow | null,
): InvestorDetailFieldGridBlock {
  const status = formatAssetDisplayString(
    readPropertyDetailString(detail, 'status') || row?.status || '',
  );
  const occupiedPct = kpi.occupiedPercent;
  const vacantPct = kpi.vacantPercent;

  return {
    kind: 'field-grid',
    id: 'area-summary',
    title: 'Asset Overview',
    collapsible: true,
    defaultExpanded: true,
    columns: [
      {
        fields: [
          {
            label: 'Property Code',
            value: formatAssetDisplayString(
              readPropertyDetailString(detail, 'property_code', 'propertyCode') || row?.code || '',
            ),
          },
          {
            label: 'Property Name',
            value: formatAssetDisplayString(
              readPropertyDetailString(detail, 'property_name', 'propertyName') || row?.name || '',
            ),
          },
          {
            label: 'Geography',
            value: formatAssetDisplayString(
              readPropertyDetailString(detail, 'geography') || row?.geography || '',
            ),
          },
          {
            label: 'Asset Type',
            value: formatAssetDisplayString(
              readPropertyDetailString(detail, 'asset_type', 'assetType') || row?.assetType || '',
            ),
          },
          {
            label: 'Investment Type',
            value: formatAssetDisplayString(
              readPropertyDetailString(detail, 'investment_type', 'investmentType') ||
                row?.investmentType ||
                '',
            ),
          },
          {
            label: 'Development Type',
            value: formatAssetDisplayString(
              readPropertyDetailString(detail, 'development_type', 'developmentType') ||
                row?.developmentType ||
                '',
            ),
          },
          {
            label: 'Status',
            value: status,
            tone: status !== ASSET_DETAIL_EMPTY && status.toLowerCase() === 'active' ? 'positive' : undefined,
          },
        ],
      },
      {
        fields: [
          { label: 'Total GLA', value: formatAssetDisplaySqFt(kpi.totalGlaSf) },
          { label: 'Committed Area', value: formatAssetDisplaySqFt(kpi.committedSf) },
          { label: 'Vacant Area', value: formatAssetDisplaySqFt(kpi.vacantSf) },
          {
            label: 'Occupancy Rate',
            value: formatAssetDisplayPercent(occupiedPct),
          },
          {
            label: 'Vacancy Rate',
            value: formatAssetDisplayPercent(vacantPct),
          },
        ],
      },
    ],
  };
}

function buildAssetTypeSummaryBlock(
  rows: AssetTypeSummaryRow[],
): InvestorDetailAssetTypeSummaryBlock {
  return {
    kind: 'asset-type-summary',
    id: 'asset-type-summary',
    title: 'GLA share by asset type',
    collapsible: true,
    defaultExpanded: true,
    rows: rows.map((row) => ({ ...row })),
  };
}

function buildLeasingSummary(
  leasingSummary: PropertyLeasingSummaryDto | null,
): InvestorDetailLeasingSummaryBlock {
  return {
    kind: 'leasing-summary',
    id: 'leasing-summary',
    title: 'Leasing Summary',
    collapsible: true,
    defaultExpanded: true,
    metricGroups: [
      [
        {
          label: 'Gross Leasable Area',
          value: formatAssetDisplaySqFt(
            readLeasingSummaryNumber(
              leasingSummary,
              'gross_leasable_area_sqft',
              'grossLeasableAreaSqft',
            ),
          ),
        },
        {
          label: 'Occupied Area',
          value: formatAssetDisplaySqFt(
            readLeasingSummaryNumber(leasingSummary, 'occupied_area_sqft', 'occupiedAreaSqft'),
          ),
        },
        {
          label: 'Committed Area',
          value: formatAssetDisplaySqFt(
            readLeasingSummaryNumber(leasingSummary, 'committed_area_sqft', 'committedAreaSqft'),
          ),
        },
        {
          label: 'Vacant Area',
          value: formatAssetDisplaySqFt(
            readLeasingSummaryNumber(leasingSummary, 'vacant_area_sqft', 'vacantAreaSqft'),
          ),
        },
      ],
      [
        {
          label: 'Occupancy Rate',
          value: formatAssetDisplayPercent(
            readLeasingSummaryNumber(leasingSummary, 'occupancy_rate', 'occupancyRate'),
          ),
        },
        {
          label: 'Vacancy Rate',
          value: formatAssetDisplayPercent(
            readLeasingSummaryNumber(leasingSummary, 'vacancy_rate', 'vacancyRate'),
          ),
        },
        {
          label: 'Total Units',
          value: formatAssetDisplayCount(
            readLeasingSummaryNumber(leasingSummary, 'total_units', 'totalUnits'),
          ),
        },
        {
          label: 'Occupied Units',
          value: formatAssetDisplayCount(
            readLeasingSummaryNumber(leasingSummary, 'occupied_units', 'occupiedUnits'),
          ),
        },
        {
          label: 'Vacant Units',
          value: formatAssetDisplayCount(
            readLeasingSummaryNumber(leasingSummary, 'vacant_units', 'vacantUnits'),
          ),
        },
      ],
      [
        {
          label: 'WALT',
          value: formatAssetDisplayMonths(
            readLeasingSummaryNumber(
              leasingSummary,
              'weighted_avg_lease_term_months',
              'weightedAvgLeaseTermMonths',
            ),
          ),
        },
        {
          label: 'WALT (Rent)',
          value: formatAssetDisplayMonths(
            readLeasingSummaryNumber(
              leasingSummary,
              'weighted_avg_lease_term_rent_months',
              'weightedAvgLeaseTermRentMonths',
            ),
          ),
        },
        {
          label: 'GLA Available to Lease',
          value: formatAssetDisplaySqFt(
            readLeasingSummaryNumber(
              leasingSummary,
              'gla_available_to_lease_sqft',
              'glaAvailableToLeaseSqft',
            ),
          ),
        },
        {
          label: 'Total Leasing Committed',
          value: formatAssetDisplaySqFt(
            readLeasingSummaryNumber(
              leasingSummary,
              'total_leasing_committed_sqft',
              'totalLeasingCommittedSqft',
            ),
          ),
        },
        {
          label: 'New Leasing Committed',
          value: formatAssetDisplaySqFt(
            readLeasingSummaryNumber(
              leasingSummary,
              'new_leasing_committed_sqft',
              'newLeasingCommittedSqft',
            ),
          ),
        },
        {
          label: 'Renewal Leasing Committed',
          value: formatAssetDisplaySqFt(
            readLeasingSummaryNumber(
              leasingSummary,
              'renewal_leasing_committed_sqft',
              'renewalLeasingCommittedSqft',
            ),
          ),
        },
      ],
    ],
    leaseExpirySchedule: [],
  };
}

function buildAcquisitionSaleBlock(
  data: AssetAcquisitionSaleRow | null,
): InvestorDetailAcquisitionSaleBlock {
  const currency = (value: number | null | undefined) => formatAssetDisplayCurrency(value, true);
  const percent = (value: number | null | undefined) => formatAssetDisplayPercent(value);
  const text = (value: string | null | undefined) => formatAssetDisplayString(value ?? '');
  const acquisition = data?.acquisition ?? null;
  const sale = data?.sale ?? null;

  return {
    kind: 'acquisition-sale',
    id: 'acquisition-sale',
    title: 'Acquisition & Sale',
    collapsible: true,
    defaultExpanded: true,
    leftTitle: 'Acquisition',
    leftItems: [
      { label: 'Fund Name', value: text(acquisition?.fundName) },
      { label: 'Fund Code', value: text(acquisition?.fundCode) },
      { label: 'Acquisition Date', value: text(acquisition?.acquisitionDate) },
      { label: 'Debt', value: currency(acquisition?.atAcquisitionDebt) },
      { label: 'Equity', value: currency(acquisition?.atAcquisitionEquity) },
      { label: 'Total Asset Value', value: currency(acquisition?.atAcquisitionTotalAssetValue) },
      { label: 'Purchase Costs', value: currency(acquisition?.atAcquisitionPurchaseCosts) },
      { label: 'LTV', value: percent(acquisition?.atAcquisitionLtv) },
    ],
    rightTitle: 'At Sale',
    rightItems: [
      { label: 'Fund Name', value: text(sale?.fundName) },
      { label: 'Fund Code', value: text(sale?.fundCode) },
      { label: 'Sale Date', value: text(sale?.saleDate) },
      { label: 'Debt', value: currency(sale?.atSaleDebt) },
      { label: 'Equity', value: currency(sale?.atSaleEquity) },
      { label: 'Total Asset Value', value: currency(sale?.atSaleTotalAssetValue) },
      { label: 'Selling Costs', value: currency(sale?.atSaleSellingCosts) },
      { label: 'LTV', value: percent(sale?.atSaleLtv) },
      { label: 'NOI', value: currency(sale?.atSaleNoi) },
    ],
  };
}

function buildFinancialMetricsBlock(
  metrics: AssetFinancialMetricsRow | null,
): InvestorDetailFinancialMetricsBlock {
  const currency = (value: number | null | undefined) => formatAssetDisplayCurrency(value, true);
  const percent = (value: number | null | undefined) => formatAssetDisplayPercent(value);
  const text = (value: string | null | undefined) => formatAssetDisplayString(value ?? '');

  return {
    kind: 'financial-metrics',
    id: 'financial-metrics',
    title: 'Financial Metrics',
    collapsible: true,
    defaultExpanded: true,
    leftItems: [
      { label: 'Fund Code', value: text(metrics?.fundCode) },
      { label: 'As of Date', value: text(metrics?.asOfDate) },
      { label: 'KS Ownership %', value: percent(metrics?.assetKsOwnershipPct) },
      { label: 'Gross Market Value', value: currency(metrics?.assetGrossMarketValue) },
      { label: 'Total Asset Value', value: currency(metrics?.assetTotalAssetValue) },
      { label: 'GAV Amount', value: currency(metrics?.assetGavAmount) },
      { label: 'NAV Amount', value: currency(metrics?.assetNavAmount) },
      { label: 'Debt', value: currency(metrics?.assetDebt) },
      { label: 'Equity', value: currency(metrics?.assetEquity) },
      { label: 'LTV', value: percent(metrics?.assetLtv) },
      { label: 'Cash at Quarter End', value: currency(metrics?.assetCashAtQuarterEnd) },
      { label: 'Current Cost', value: currency(metrics?.currentCostAmount) },
      { label: 'Cost Basis', value: currency(metrics?.costBasisAmount) },
    ],
    rightItems: [
      { label: 'NOI', value: currency(metrics?.assetNoi) },
      { label: 'FFO', value: currency(metrics?.assetFfo) },
      { label: 'AFFO', value: currency(metrics?.assetAffo) },
      { label: 'NCF', value: currency(metrics?.assetNcf) },
      { label: 'EBITDA', value: currency(metrics?.assetEbitda) },
      { label: 'Revenue', value: currency(metrics?.assetRevenue) },
      { label: 'Expense', value: currency(metrics?.assetExpense) },
      { label: 'CapEx', value: currency(metrics?.assetCapex) },
      { label: 'CapEx % NOI', value: percent(metrics?.assetCapexPctNoi) },
      { label: 'Total NOI Growth', value: currency(metrics?.totalNoiGrowthAmount) },
      { label: 'Total NOI Growth %', value: percent(metrics?.totalNoiGrowthPct) },
      { label: 'Same Store NOI Growth', value: currency(metrics?.sameStoreNoiGrowthAmount) },
      { label: 'Same Store NOI Growth %', value: percent(metrics?.sameStoreNoiGrowthPct) },
      { label: 'Budgeted NOI (Current Year)', value: currency(metrics?.budgetedNoiCurrentYear) },
      { label: 'Forecasted NOI (Current Year)', value: currency(metrics?.forecastedNoiCurrentYear) },
      { label: 'Budgeted FFO', value: currency(metrics?.budgetedFfo) },
      { label: 'Forecasted FFO', value: currency(metrics?.forecastedFfo) },
    ],
  };
}

function buildPropertyDetailsTable(
  rows: AssetPropertyDetailTabRow[],
): InvestorDetailTableBlock {
  const columns: InvestorDetailTableColumn[] = [
    { key: 'propertyCode', label: 'Property Code', type: 'text', align: 'left', tone: 'muted' },
    { key: 'propertyName', label: 'Property Name', type: 'text', align: 'left' },
    { key: 'assetToSharePct', label: 'Asset to Share %', type: 'percent', align: 'right' },
    { key: 'assetType', label: 'Asset Type', type: 'text', align: 'left' },
    { key: 'investmentType', label: 'Investment Type', type: 'text', align: 'left' },
    { key: 'developmentType', label: 'Development Type', type: 'text', align: 'left' },
    { key: 'grossLeasableAreaSqft', label: 'GLA (sf)', type: 'number', align: 'right' },
    { key: 'committedAreaSqft', label: 'Committed (sf)', type: 'number', align: 'right' },
    { key: 'vacantAreaSqft', label: 'Vacant (sf)', type: 'number', align: 'right' },
    { key: 'occupancyRate', label: 'Occupancy %', type: 'percent', align: 'right' },
    { key: 'vacancyRate', label: 'Vacancy %', type: 'percent', align: 'right' },
  ];

  const tableRows: InvestorDetailTableRow[] = rows.map((row) => ({
    propertyCode: row.propertyCode,
    propertyName: row.propertyName,
    assetToSharePct: row.assetToSharePct,
    assetType: row.assetType,
    investmentType: row.investmentType,
    developmentType: row.developmentType,
    grossLeasableAreaSqft: row.grossLeasableAreaSqft,
    committedAreaSqft: row.committedAreaSqft,
    vacantAreaSqft: row.vacantAreaSqft,
    occupancyRate: row.occupancyRate,
    vacancyRate: row.vacancyRate,
  }));

  return tableBlock({
    id: 'property-details',
    title: 'Property Details',
    columns,
    rows: tableRows,
    collapsible: true,
    defaultExpanded: true,
    variant: 'property-details',
  });
}

function buildTransactionsTable(): InvestorDetailTableBlock {
  const columns: InvestorDetailTableColumn[] = [
    { key: 'date', label: 'Date', type: 'date', align: 'left', tone: 'muted' },
    { key: 'type', label: 'Type', type: 'transaction-type', align: 'left' },
    { key: 'description', label: 'Description', type: 'text', align: 'left' },
    { key: 'amountFund', label: 'AmountFund', type: 'amount-fund', align: 'left' },
    { key: 'status', label: 'Status', type: 'status', align: 'left' },
  ];

  const rows: InvestorDetailTableRow[] = ASSET_DETAIL_DUMMY.transactions.map((tx) => ({
    date: tx.date,
    type: tx.type,
    description: tx.description,
    amount: tx.amountTone === 'positive' ? tx.amount : -tx.amount,
    fund: tx.fund,
    status: tx.status,
    [INVESTOR_DETAIL_CELL_TONES_KEY]: {
      amount: tx.amountTone,
    },
  }));

  return tableBlock({
    id: 'transactions',
    title: 'Transactions',
    subtitle: 'Acquisitions, capex, financing and dispositions',
    columns,
    rows,
    collapsible: true,
    defaultExpanded: true,
    variant: 'asset-transactions',
  });
}

function buildAssetFundHoldingsTable(
  rows: AssetFundHoldingTabRow[],
): InvestorDetailTableBlock {
  const columns: InvestorDetailTableColumn[] = [
    { key: 'fund', label: 'Fund', type: 'text', align: 'left' },
    { key: 'fundCode', label: 'Fund Code', type: 'text', align: 'left' },
    { key: 'strategy', label: 'Strategy', type: 'text', align: 'left' },
    { key: 'startDate', label: 'Start Date', type: 'text', align: 'left' },
  ];

  const tableRows: InvestorDetailTableRow[] = rows.map((row) => ({
    fund: row.fundName,
    fundKey: row.fundKey,
    fundType: row.fundType !== ASSET_DETAIL_EMPTY ? row.fundType : '',
    fundCode: row.fundCode,
    strategy: row.fundStrategy,
    startDate: row.fundStartDate,
  }));

  return tableBlock({
    id: 'asset-fund-holdings',
    title: 'Fund Holdings',
    columns,
    rows: tableRows,
    variant: 'asset-fund-holdings',
    collapsible: true,
    defaultExpanded: true,
  });
}

function buildDocumentsList(): InvestorDetailDocumentListBlock {
  return {
    kind: 'document-list',
    id: 'documents',
    title: 'Documents',
    subtitle: 'Appraisals, leases, permits, and environmental reports',
    collapsible: true,
    defaultExpanded: true,
    documents: [...ASSET_DETAIL_DUMMY.documents],
  };
}

function buildEsgOperations(): InvestorDetailEsgMetricsBlock {
  return {
    kind: 'esg-metrics',
    id: 'esg-operations',
    title: 'ESG & Operations',
    collapsible: true,
    defaultExpanded: true,
    cards: ASSET_DETAIL_DUMMY.esg.map((card) => ({ ...card })),
  };
}

function buildRiskInsurance(): InvestorDetailRiskInsuranceBlock {
  const risk = ASSET_DETAIL_DUMMY.risk;
  return {
    kind: 'risk-insurance',
    id: 'risk-insurance',
    title: 'Risk & Insurance',
    collapsible: true,
    defaultExpanded: true,
    coverageTitle: 'Coverage Summary',
    coverage: risk.coverage.map((item) => ({ ...item })),
    riskTitle: 'Risk Flags',
    banner: { ...risk.banner },
    riskFlags: risk.flags.map((flag) => ({ ...flag })),
  };
}

export function buildBlocksForSection(
  sectionId: AssetDetailSectionId,
  detail: PropertyDetailDto | null,
  leasingSummary: PropertyLeasingSummaryDto | null,
  kpi: AssetDetailKpiCards,
  listRow: AssetTableRow | null,
  fundHoldings: AssetFundHoldingTabRow[],
  propertyDetails: AssetPropertyDetailTabRow[],
  assetTypeSummary: AssetTypeSummaryRow[],
  financialMetrics: AssetFinancialMetricsRow | null,
  acquisitionSale: AssetAcquisitionSaleRow | null,
): InvestorDetailBlock[] {
  switch (sectionId) {
    case 'overview':
      return [];
    case 'area-summary':
      return [buildAreaSummaryGrid(detail, kpi, listRow)];
    case 'acquisition-sale':
      return [buildAcquisitionSaleBlock(acquisitionSale)];
    case 'asset-type-summary':
      return [buildAssetTypeSummaryBlock(assetTypeSummary)];
    case 'property-details':
      return [buildPropertyDetailsTable(propertyDetails)];
    case 'leasing':
      return [buildLeasingSummary(leasingSummary)];
    case 'financial-metrics':
      return [buildFinancialMetricsBlock(financialMetrics)];
    case 'fund-holdings':
      return [buildAssetFundHoldingsTable(fundHoldings)];
    case 'transactions':
      return [buildTransactionsTable()];
    case 'documents':
      return [buildDocumentsList()];
    case 'esg-operations':
      return [buildEsgOperations()];
    case 'risk-insurance':
      return [buildRiskInsurance()];
    default:
      return [];
  }
}

export function buildFlatAssetBlocks(
  detail: PropertyDetailDto | null,
  leasingSummary: PropertyLeasingSummaryDto | null,
  kpi: AssetDetailKpiCards,
  listRow: AssetTableRow | null,
  fundHoldings: AssetFundHoldingTabRow[],
  propertyDetails: AssetPropertyDetailTabRow[],
  assetTypeSummary: AssetTypeSummaryRow[],
  financialMetrics: AssetFinancialMetricsRow | null,
  acquisitionSale: AssetAcquisitionSaleRow | null,
): AssetDetailFlatBlock[] {
  const sections = ASSET_DETAIL_SIDEBAR_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      sectionId: item.id,
      blocks: buildBlocksForSection(
        item.id as AssetDetailSectionId,
        detail,
        leasingSummary,
        kpi,
        listRow,
        fundHoldings,
        propertyDetails,
        assetTypeSummary,
        financialMetrics,
        acquisitionSale,
      ),
    })),
  );

  const flat: AssetDetailFlatBlock[] = [];
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

export function formatAssetKpiHint(
  type: 'gla' | 'committed' | 'vacant' | 'value',
  kpi: AssetDetailKpiCards,
): string {
  switch (type) {
    case 'gla':
      return 'Gross leasable area';
    case 'committed':
      return kpi.occupiedPercent != null
        ? `${formatAssetDisplayPercent(kpi.occupiedPercent)} occupied`
        : ASSET_DETAIL_EMPTY;
    case 'vacant':
      return kpi.vacantPercent != null
        ? `${formatAssetDisplayPercent(kpi.vacantPercent)} vacant`
        : ASSET_DETAIL_EMPTY;
    case 'value':
      return 'Appraised';
    default:
      return '';
  }
}

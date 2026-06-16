import {
  PropertyDetailDto,
  PropertyInvestmentDto,
} from '../../../shared/models/api.models';
import {
  formatOccupiedPercent,
  formatSquareFeet,
  AssetTableRow,
} from '../../../shared/utils/asset-list-row.util';
import {
  InvestorDetailBlock,
  InvestorDetailDocumentListBlock,
  InvestorDetailEsgMetricsBlock,
  InvestorDetailFieldGridBlock,
  InvestorDetailLeasingSummaryBlock,
  InvestorDetailRiskInsuranceBlock,
  InvestorDetailSectionBlock,
  InvestorDetailTableBlock,
} from '../../../investors/investor-detail/models/investor-detail-block.models';
import {
  INVESTOR_DETAIL_CELL_TONES_KEY,
  InvestorDetailTableColumn,
  InvestorDetailTableRow,
} from '../../../investors/investor-detail/models/investor-detail-table.models';
import { ASSET_DETAIL_SIDEBAR_SECTIONS } from '../models/asset-detail-sidebar.config';
import { ASSET_DETAIL_DUMMY } from '../data/asset-detail-dummy.data';

export type AssetDetailSectionId =
  | 'overview'
  | 'area-summary'
  | 'leasing'
  | 'valuation'
  | 'transactions'
  | 'documents'
  | 'esg-operations'
  | 'risk-insurance';

export interface AssetDetailKpiCards {
  totalGlaSf: number;
  committedSf: number;
  vacantSf: number;
  occupiedPercent: number;
  vacantPercent: number;
  marketValue: number;
}

export interface AssetDetailFlatBlock {
  sectionId: string;
  block: InvestorDetailBlock;
  isSectionStart: boolean;
}

function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function tableBlock(config: Omit<InvestorDetailTableBlock, 'kind'>): InvestorDetailTableBlock {
  return { kind: 'table', ...config };
}

export function kpiCardsFromAssetRow(row: AssetTableRow | null): AssetDetailKpiCards {
  const dummy = ASSET_DETAIL_DUMMY;
  const totalGla = row?.glaSf ?? dummy.totalGlaSf;
  const committed = row?.committedSf ?? dummy.committedSf;
  const vacant = row?.vacantSf ?? dummy.vacantSf;
  const occupied = row?.occupiedPercent ?? dummy.occupiedPercent;
  const vacantPct =
    totalGla > 0 ? (vacant / totalGla) * 100 : dummy.vacantPercent;

  return {
    totalGlaSf: totalGla,
    committedSf: committed,
    vacantSf: vacant,
    occupiedPercent: occupied,
    vacantPercent: vacantPct,
    marketValue: dummy.marketValue,
  };
}

function buildAreaSummaryGrid(kpi: AssetDetailKpiCards, row: AssetTableRow | null): InvestorDetailFieldGridBlock {
  const dummy = ASSET_DETAIL_DUMMY;
  return {
    kind: 'field-grid',
    id: 'area-summary',
    title: 'Area Summary',
    collapsible: true,
    defaultExpanded: true,
    columns: [
      {
        fields: [
          { label: 'Property Code', value: row?.code ?? dummy.propertyCode },
          { label: 'Property Name', value: row?.name ?? dummy.propertyName },
          { label: 'Geography', value: row?.geography ?? dummy.geography },
          { label: 'Asset Type', value: row?.assetType ?? dummy.assetType },
          { label: 'Investment Type', value: row?.investmentType ?? dummy.investmentType },
          { label: 'Development Type', value: row?.developmentType ?? dummy.developmentType },
          { label: 'Status', value: row?.status ?? dummy.status, tone: 'positive' },
        ],
      },
      {
        fields: [
          { label: 'Total GLA', value: formatSquareFeet(kpi.totalGlaSf) },
          { label: 'Committed Area', value: formatSquareFeet(kpi.committedSf) },
          { label: 'Vacant Area', value: formatSquareFeet(kpi.vacantSf) },
          { label: 'Occupancy Rate', value: formatPercent(kpi.occupiedPercent) },
          { label: 'Vacancy Rate', value: formatPercent(kpi.vacantPercent) },
          { label: 'Est. Market Value', value: formatCurrencyCompact(kpi.marketValue) },
          { label: 'Est. Annual NOI', value: formatCurrencyCompact(dummy.estAnnualNoi) },
        ],
      },
    ],
    occupancyFooter: {
      label: 'Occupancy',
      percent: kpi.occupiedPercent,
      committedLabel: `${formatSquareFeet(kpi.committedSf, true)} committed`,
      vacantLabel: `${formatSquareFeet(kpi.vacantSf, true)} vacant`,
    },
  };
}

function buildLeasingSummary(): InvestorDetailLeasingSummaryBlock {
  const leasing = ASSET_DETAIL_DUMMY.leasing;
  return {
    kind: 'leasing-summary',
    id: 'leasing-summary',
    title: 'Leasing Summary',
    collapsible: true,
    defaultExpanded: true,
    metricGroups: [
      [
        { label: 'Avg Lease Term', value: `${leasing.avgLeaseTermYears} yrs` },
        { label: 'Renewal Rate', value: formatPercent(leasing.renewalRate) },
      ],
      [
        { label: "Leases Expiring '24", value: String(leasing.leasesExpiring24) },
        { label: 'Retention Rate', value: formatPercent(leasing.retentionRate) },
        { label: '', value: '', hint: leasing.retentionHint },
      ],
      [
        { label: 'New Leases YTD', value: String(leasing.newLeasesYtd) },
        { label: 'Avg Rent / sf', value: formatCurrency(leasing.avgRentPerSf) },
        { label: '', value: '', hint: leasing.avgRentHint },
      ],
    ],
    leaseExpirySchedule: [...leasing.leaseExpirySchedule],
  };
}

function buildValuationGrid(kpi: AssetDetailKpiCards): InvestorDetailFieldGridBlock {
  const dummy = ASSET_DETAIL_DUMMY;
  return {
    kind: 'field-grid',
    id: 'valuation',
    title: 'Valuation & Financial Metrics',
    collapsible: true,
    defaultExpanded: true,
    layout: 'paired-rows',
    columns: [
      {
        fields: [
          { label: 'Est. Market Value', value: formatCurrencyCompact(kpi.marketValue) },
          { label: 'Going-in Cap Rate', value: formatPercent(dummy.goingInCapRate) },
          { label: 'Est. Annual NOI', value: formatCurrencyCompact(dummy.estAnnualNoi) },
          { label: 'Price / sf', value: formatCurrency(dummy.pricePerSf) },
        ],
      },
      {
        fields: [
          { label: 'Last Appraisal', value: dummy.lastAppraisal },
          { label: 'Appraiser', value: dummy.appraiser },
          { label: 'Debt Outstanding', value: formatCurrencyCompact(dummy.debtOutstanding) },
          { label: 'LTV', value: formatPercent(dummy.ltvRatio) },
        ],
      },
    ],
  };
}

function buildTransactionsTable(
  investments: PropertyInvestmentDto[],
): InvestorDetailTableBlock {
  void investments;
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
  investments: PropertyInvestmentDto[],
  kpi: AssetDetailKpiCards,
  listRow: AssetTableRow | null,
): InvestorDetailBlock[] {
  void detail;
  switch (sectionId) {
    case 'overview':
      return [];
    case 'area-summary':
      return [buildAreaSummaryGrid(kpi, listRow)];
    case 'leasing':
      return [buildLeasingSummary()];
    case 'valuation':
      return [buildValuationGrid(kpi)];
    case 'transactions':
      return [buildTransactionsTable(investments)];
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
  investments: PropertyInvestmentDto[],
  kpi: AssetDetailKpiCards,
  listRow: AssetTableRow | null,
): AssetDetailFlatBlock[] {
  const sections = ASSET_DETAIL_SIDEBAR_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      sectionId: item.id,
      blocks: buildBlocksForSection(
        item.id as AssetDetailSectionId,
        detail,
        investments,
        kpi,
        listRow,
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
      return formatOccupiedPercent(kpi.occupiedPercent) ?? `${formatPercent(kpi.occupiedPercent)} occupied`;
    case 'vacant':
      return `${formatPercent(kpi.vacantPercent)} vacant`;
    case 'value':
      return 'Appraised';
    default:
      return '';
  }
}

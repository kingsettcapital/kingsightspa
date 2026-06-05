import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ArrowLeftRight,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronRight,
  Columns3,
  Download,
  LayoutGrid,
  Layers,
  LineChart,
  LUCIDE_ICONS,
  LucideAngularModule,
  LucideIconProvider,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
} from 'lucide-angular';

import { ExcelService } from '../../../core/services/excel.service';
import {
  DATA_PRODUCTS,
  FILTER_OPERATORS,
  QUICK_START_TEMPLATES,
} from '../constants/data-explorer.constants';
import {
  DataExplorerRecord,
  DataGroup,
  DataProduct,
  DataProductField,
  FilterLogic,
  FilterOperator,
  QueryFilter,
  QuickStartTemplate,
  SaveQueryPayload,
  SavedQuery,
} from '../interfaces/data-explorer.interfaces';
import { DataExplorerService } from '../services/data-explorer.service';
import {
  applyFilters,
  formatCellValue,
  generateFilterId,
  getFieldById,
  getRecordValue,
  getTypeBadge,
  getTypeBadgeClass,
  groupRecords,
  isFilterApplied,
} from '../utils/data-explorer.utils';
import { KsCurrencyPipe } from '../../../shared/pipes/ks-currency.pipe';
import { SaveQueryModalComponent } from './save-query-modal/save-query-modal.component';
import { SavedQueriesModalComponent } from './saved-queries-modal/saved-queries-modal.component';

@Component({
  selector: 'app-data-explorer',
  standalone: true,
  imports: [
    FormsModule,
    KsCurrencyPipe,
    LucideAngularModule,
    SaveQueryModalComponent,
    SavedQueriesModalComponent,
  ],
  providers: [
    {
      provide: LUCIDE_ICONS,
      useValue: new LucideIconProvider({
        RotateCcw,
        BookOpen,
        Save,
        Download,
        Columns3,
        SlidersHorizontal,
        Search,
        ChevronDown,
        ChevronRight,
        LayoutGrid,
        Layers,
        Building2,
        Users,
        LineChart,
        ArrowLeftRight,
        Trash2,
      }),
    },
  ],
  templateUrl: './data-explorer.component.html',
  styleUrl: './data-explorer.component.scss',
})
export class DataExplorerComponent {
  private readonly dataExplorerService = inject(DataExplorerService);
  private readonly excelService = inject(ExcelService);

  readonly dataProducts = DATA_PRODUCTS;
  readonly quickStartTemplates = QUICK_START_TEMPLATES;
  readonly filterOperators = FILTER_OPERATORS;

  readonly resetIcon = RotateCcw;
  readonly savedIcon = BookOpen;
  readonly saveIcon = Save;
  readonly exportIcon = Download;
  readonly columnsIcon = Columns3;
  readonly filtersIcon = SlidersHorizontal;
  readonly trashIcon = Trash2;
  readonly searchIcon = Search;
  readonly chevronDownIcon = ChevronDown;
  readonly chevronRightIcon = ChevronRight;
  readonly gridIcon = LayoutGrid;
  readonly dataProductsIcon = Layers;
  readonly buildingIcon = Building2;
  readonly usersIcon = Users;
  readonly lineChartIcon = LineChart;
  readonly transactionsIcon = ArrowLeftRight;

  readonly productIcons: Record<string, typeof Building2> = {
    properties: Building2,
    tenants: Users,
    financials: LineChart,
    transactions: ArrowLeftRight,
  };

  readonly allFields = computed(() =>
    this.dataProducts.flatMap((product) => product.fields),
  );

  readonly selectedFieldIds = signal<string[]>([]);
  readonly columnSearch = signal('');
  readonly expandedProducts = signal<string[]>(['properties']);
  readonly filters = signal<QueryFilter[]>([]);
  readonly filterLogic = signal<FilterLogic>('and');
  readonly groupByFieldId = signal<string | null>(null);
  readonly sortFieldId = signal<string | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly expandedGroupKeys = signal<string[]>([]);

  readonly isColumnsPanelOpen = signal(true);
  readonly isFiltersPanelOpen = signal(false);
  readonly isGroupByOpen = signal(false);
  readonly isSaveModalOpen = signal(false);
  readonly isSavedModalOpen = signal(false);
  readonly savedQueries = signal<SavedQuery[]>([]);
  readonly highlightedRowId = signal<string | null>(null);

  readonly hasQuery = computed(() => this.selectedFieldIds().length > 0);
  readonly selectedFields = computed(() => {
    const ids = new Set(this.selectedFieldIds());
    return this.allFields().filter((field) => ids.has(field.id));
  });

  readonly selectedFieldsByProduct = computed(() => {
    const ids = new Set(this.selectedFieldIds());
    return this.dataProducts
      .map((product) => ({
        ...product,
        fields: product.fields.filter((field) => ids.has(field.id)),
      }))
      .filter((product) => product.fields.length > 0);
  });

  readonly filteredFieldsForSearch = computed(() => {
    const query = this.columnSearch().trim().toLowerCase();
    if (!query) {
      return this.dataProducts;
    }

    return this.dataProducts
      .map((product) => ({
        ...product,
        fields: product.fields.filter((field) =>
          field.label.toLowerCase().includes(query),
        ),
      }))
      .filter((product) => product.fields.length > 0);
  });

  readonly displayColumns = computed(() => {
    const groupBy = this.groupByFieldId();
    if (!groupBy) {
      return this.selectedFields();
    }
    return this.selectedFields().filter((field) => field.id !== groupBy);
  });

  readonly groupByOptions = computed(() => [
    { id: null as string | null, label: 'None' },
    ...this.selectedFields().map((field) => ({ id: field.id, label: field.label })),
  ]);

  readonly groupByLabel = computed(() => {
    const id = this.groupByFieldId();
    if (!id) {
      return 'None';
    }
    return getFieldById(this.allFields(), id)?.label ?? 'None';
  });

  readonly filteredRecords = computed(() => {
    const records = this.dataExplorerService.getRecords();
    return applyFilters(records, this.filters(), this.filterLogic(), this.allFields());
  });

  readonly sortedRecords = computed(() => {
    const records = [...this.filteredRecords()];
    const sortFieldId = this.sortFieldId();
    if (!sortFieldId) {
      return records;
    }

    const field = getFieldById(this.allFields(), sortFieldId);
    if (!field) {
      return records;
    }

    const direction = this.sortDirection();
    return records.sort((a, b) => {
      const aVal = getRecordValue(a, field);
      const bVal = getRecordValue(b, field);
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return direction === 'asc' ? cmp : -cmp;
    });
  });

  readonly tableGroups = computed((): DataGroup[] => {
    const groupByField = this.groupByFieldId()
      ? getFieldById(this.allFields(), this.groupByFieldId()!)
      : null;

    const groupsMap = groupRecords(this.sortedRecords(), groupByField ?? null);
    const expanded = new Set(this.expandedGroupKeys());

    if (!groupByField) {
      return [
        {
          key: '__flat__',
          label: '',
          records: this.sortedRecords(),
          expanded: true,
        },
      ];
    }

    return Array.from(groupsMap.entries()).map(([key, records]) => ({
      key,
      label: `${groupByField.label}: ${key}`,
      records,
      expanded: expanded.size === 0 || expanded.has(key),
    }));
  });

  readonly filterCardsCount = computed(() => this.filters().length);

  readonly appliedFilterCount = computed(
    () => this.filters().filter((filter) => isFilterApplied(filter)).length,
  );

  readonly totalRecords = computed(() => this.filteredRecords().length);
  readonly totalDataProducts = this.dataProducts.length;
  readonly totalAvailableRecords = this.dataExplorerService.getRecords().length;

  constructor() {
    this.savedQueries.set(this.dataExplorerService.getSavedQueries());
  }

  getTypeBadge = getTypeBadge;
  getTypeBadgeClass = getTypeBadgeClass;

  getProductIcon(productId: string): typeof Building2 {
    return this.productIcons[productId] ?? Building2;
  }

  appliedFilterLabel(): string {
    const count = this.appliedFilterCount();
    if (count === 1) {
      return '1 active filter';
    }
    if (count === 0) {
      return '0 active filter';
    }
    return `${count} active filters`;
  }

  getProductFieldIds(product: DataProduct): string[] {
    return product.fields.map((field) => field.id);
  }

  isProductFullySelected(product: DataProduct): boolean {
    const fieldIds = this.getProductFieldIds(product);
    return fieldIds.length > 0 && fieldIds.every((id) => this.isFieldSelected(id));
  }

  isProductPartiallySelected(product: DataProduct): boolean {
    const fieldIds = this.getProductFieldIds(product);
    const selectedCount = fieldIds.filter((id) => this.isFieldSelected(id)).length;
    return selectedCount > 0 && selectedCount < fieldIds.length;
  }

  formatValue(record: DataExplorerRecord, field: DataProductField): string {
    const value = record[field.dataKey as keyof DataExplorerRecord];
    return formatCellValue(value as string | number, field.type);
  }

  getNumericCellValue(record: DataExplorerRecord, field: DataProductField): number | null {
    const value = record[field.dataKey as keyof DataExplorerRecord];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  formatPercentCell(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  isFieldSelected(fieldId: string): boolean {
    return this.selectedFieldIds().includes(fieldId);
  }

  isProductExpanded(productId: string): boolean {
    return this.expandedProducts().includes(productId);
  }

  toggleProductExpanded(productId: string): void {
    this.expandedProducts.update((ids) =>
      ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId],
    );
  }

  toggleProductFields(product: DataProduct, event: Event): void {
    event.stopPropagation();
    const fieldIds = this.getProductFieldIds(product);
    const allSelected = this.isProductFullySelected(product);

    this.selectedFieldIds.update((ids) => {
      const next = allSelected
        ? ids.filter((id) => !fieldIds.includes(id))
        : [...new Set([...ids, ...fieldIds])];

      if (!next.includes(this.groupByFieldId() ?? '')) {
        this.groupByFieldId.set(null);
      }

      return next;
    });
  }

  toggleField(fieldId: string): void {
    this.selectedFieldIds.update((ids) => {
      const next = ids.includes(fieldId)
        ? ids.filter((id) => id !== fieldId)
        : [...ids, fieldId];

      if (!next.includes(this.groupByFieldId() ?? '')) {
        this.groupByFieldId.set(null);
      }

      return next;
    });
  }

  toggleColumnsPanel(): void {
    this.isColumnsPanelOpen.update((open) => !open);
  }

  toggleFiltersPanel(): void {
    this.isFiltersPanelOpen.update((open) => !open);
  }

  toggleGroupByDropdown(): void {
    this.isGroupByOpen.update((open) => !open);
  }

  closeGroupByDropdown(): void {
    this.isGroupByOpen.set(false);
  }

  selectGroupBy(fieldId: string | null): void {
    this.groupByFieldId.set(fieldId);
    this.expandedGroupKeys.set([]);
    this.closeGroupByDropdown();
  }

  applyQuickStart(template: QuickStartTemplate): void {
    this.selectedFieldIds.set([...template.fieldIds]);
    this.groupByFieldId.set(null);
    this.filters.set([]);
    this.isColumnsPanelOpen.set(true);
  }

  addFilter(): void {
    const firstField = this.selectedFields()[0];
    this.filters.update((items) => [
      ...items,
      {
        id: generateFilterId(),
        fieldId: firstField?.id ?? '',
        operator: 'equals',
        value: '',
      },
    ]);
    this.isFiltersPanelOpen.set(true);
  }

  updateFilter(filterId: string, patch: Partial<QueryFilter>): void {
    this.filters.update((items) =>
      items.map((item) => (item.id === filterId ? { ...item, ...patch } : item)),
    );
  }

  updateFilterOperator(filterId: string, operator: string): void {
    this.updateFilter(filterId, { operator: operator as FilterOperator });
  }

  removeFilter(filterId: string): void {
    this.filters.update((items) => items.filter((item) => item.id !== filterId));
  }

  clearFilters(): void {
    this.filters.set([]);
  }

  setFilterLogic(logic: FilterLogic): void {
    this.filterLogic.set(logic);
  }

  toggleGroupExpanded(groupKey: string): void {
    this.expandedGroupKeys.update((keys) => {
      const allGroupKeys = this.tableGroups()
        .filter((g) => g.key !== '__flat__')
        .map((g) => g.key);

      if (keys.length === 0) {
        return allGroupKeys.filter((key) => key !== groupKey);
      }

      return keys.includes(groupKey)
        ? keys.filter((key) => key !== groupKey)
        : [...keys, groupKey];
    });
  }

  toggleSort(fieldId: string): void {
    if (this.sortFieldId() === fieldId) {
      this.sortDirection.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }

    this.sortFieldId.set(fieldId);
    this.sortDirection.set('asc');
  }

  selectRow(propertyId: string): void {
    this.highlightedRowId.set(propertyId);
  }

  resetQuery(): void {
    this.selectedFieldIds.set([]);
    this.filters.set([]);
    this.filterLogic.set('and');
    this.groupByFieldId.set(null);
    this.sortFieldId.set(null);
    this.sortDirection.set('asc');
    this.columnSearch.set('');
    this.expandedGroupKeys.set([]);
    this.highlightedRowId.set(null);
  }

  openSaveModal(): void {
    this.isSaveModalOpen.set(true);
  }

  closeSaveModal(): void {
    this.isSaveModalOpen.set(false);
  }

  openSavedModal(): void {
    this.isSavedModalOpen.set(true);
  }

  closeSavedModal(): void {
    this.isSavedModalOpen.set(false);
  }

  onSaveQuery(payload: SaveQueryPayload): void {
    const saved = this.dataExplorerService.saveQuery(payload, {
      selectedFieldIds: [...this.selectedFieldIds()],
      filters: [...this.filters()],
      filterLogic: this.filterLogic(),
      groupByFieldId: this.groupByFieldId(),
    });
    this.savedQueries.set(this.dataExplorerService.getSavedQueries());
    this.closeSaveModal();
    void saved;
  }

  loadSavedQuery(query: SavedQuery): void {
    this.selectedFieldIds.set([...query.selectedFieldIds]);
    this.filters.set(query.filters.map((filter) => ({ ...filter })));
    this.filterLogic.set(query.filterLogic);
    this.groupByFieldId.set(query.groupByFieldId);
    this.expandedGroupKeys.set([]);
    this.isColumnsPanelOpen.set(true);
  }

  onDeleteSavedQuery(query: SavedQuery): void {
    this.dataExplorerService.deleteQuery(query.id);
    this.savedQueries.set(this.dataExplorerService.getSavedQueries());
  }

  exportData(): void {
    const columns = this.selectedFields();
    const rows = this.sortedRecords();

    if (!columns.length || !rows.length) {
      return;
    }

    this.excelService.export<DataExplorerRecord>({
      filename: `data-explorer-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Data Explorer',
      title: 'Data Explorer',
      columns: columns.map((field) => ({
        header: field.label,
        value: (row: DataExplorerRecord) => this.formatValue(row, field),
      })),
      rows,
    });
  }
}

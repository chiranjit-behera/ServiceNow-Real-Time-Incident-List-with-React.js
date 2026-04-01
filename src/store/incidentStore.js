import { create } from 'zustand';

const DEFAULT_COLUMN_WIDTHS = {
  number: 160,
  short_description: 420,
  state: 160,
  approval_state: 190,
  action: 170
};

export const useIncidentStore = create((set) => ({
  incidents: [],
  selectedIncident: null,
  isLoading: false,
  initialLoad: true,
  sortConfig: { key: 'number', direction: 'desc' },
  columnWidths: DEFAULT_COLUMN_WIDTHS,
  updatingIds: new Set(),
  page: 1,
  filter: 'active=true',
  searchText: '',
  totalPage: 1,

  setIncidents: (incidents) => set({ incidents }),
  setSelectedIncident: (incident) => set({ selectedIncident: incident }),
  setIsLoading: (value) => set({ isLoading: value }),
  setInitialLoad: (value) => set({ initialLoad: value }),
  setSortConfig: (config) => set({ sortConfig: config }),
  setColumnWidths: (value) => set({ columnWidths: value }),
  setUpdatingIds: (ids) => set({ updatingIds: ids }),
  setPage: (page) => set({ page }),
  setFilter: (filter) => set({ filter }),
  setSearchText: (text) => set({ searchText: text }),
  setTotalPage: (value) => set({ totalPage: value }),
  resetIncidentState: () =>
    set({
      incidents: [],
      selectedIncident: null,
      isLoading: false,
      initialLoad: true,
      sortConfig: { key: 'number', direction: 'desc' },
      columnWidths: DEFAULT_COLUMN_WIDTHS,
      updatingIds: new Set(),
      page: 1,
      filter: 'active=true',
      searchText: '',
      totalPage: 1
    })
}));

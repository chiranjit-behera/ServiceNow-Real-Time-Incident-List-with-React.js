import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { fetchIncidentDetails, fetchIncidents, updateIncidentState } from '../api';
import CreateIncident from '../components/CreateIncident';
import SkeletonRow from '../components/SkeletonRow';

const TABLE_COLUMNS = [
  { key: 'number', label: 'Number', sortable: true, minWidth: 140 },
  { key: 'short_description', label: 'Description', sortable: true, minWidth: 280 },
  { key: 'state', label: 'State', sortable: true, minWidth: 150 },
  { key: 'approval_state', label: 'Approval State', sortable: true, minWidth: 170 },
  { key: 'action', label: 'Action', sortable: false, minWidth: 160 }
];

const DEFAULT_COLUMN_WIDTHS = {
  number: 160,
  short_description: 420,
  state: 160,
  approval_state: 190,
  action: 170
};

const getDisplayValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    return value.display_value || value.name || value.label || value.value || '—';
  }
  return String(value);
};

const formatDateValue = (value) => {
  const text = getDisplayValue(value);
  if (text === '—') return text;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : date.toLocaleString();
};

const getStateBadgeClass = (value, type = 'state') => {
  const normalized = getDisplayValue(value).toLowerCase();

  if (type === 'approval') {
    if (normalized === 'approved') return 'state-approved';
    if (normalized === 'rejected') return 'state-rejected';
    return 'state-other';
  }

  if (normalized === 'new') return 'state-new';
  if (normalized === 'in progress') return 'state-progress';
  return 'state-other';
};

const IncidentDashboard = ({ user }) => {
  const urlParams = new URLSearchParams(window.location.search);
  const resizeStateRef = useRef(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'number', direction: 'desc' });
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS);

  const [incidents, setIncidents] = useState([]);
  const [page, setPage] = useState(() => {
    const savedPage = urlParams.get('page');
    return savedPage ? parseInt(savedPage, 10) : 1;
  });
  const [filter, setFilter] = useState(() => urlParams.get('filter') || 'active=true');
  const [searchText, setSearchText] = useState(() => urlParams.get('search') || '');
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText);
  const [isLoading, setIsLoading] = useState(true);
  const [jumpPage, setJumpPage] = useState('');

  const [pageSize] = useState(5);
  const [totalPage, setTotalPage] = useState(1);
  const [pages, setPages] = useState([]);

  useEffect(() => {
    const url = new URL(window.location);
    url.searchParams.set('page', page);
    url.searchParams.set('filter', filter);

    if (searchText) {
      url.searchParams.set('search', searchText);
    } else {
      url.searchParams.delete('search');
    }

    window.history.replaceState({}, '', url);
  }, [page, filter, searchText]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!resizeStateRef.current) return;

      const { columnKey, startX, startWidth, minWidth } = resizeStateRef.current;
      const nextWidth = Math.max(minWidth, startWidth + (event.clientX - startX));

      setColumnWidths((prev) => ({
        ...prev,
        [columnKey]: nextWidth
      }));
    };

    const handleMouseUp = () => {
      resizeStateRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!selectedIncident?.sys_id) return;

    const refreshedIncident = incidents.find((inc) => inc.sys_id === selectedIncident.sys_id);
    if (refreshedIncident && refreshedIncident !== selectedIncident) {
      setSelectedIncident(refreshedIncident);
    }
  }, [incidents, selectedIncident]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (selectedIncident) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedIncident]);

  const updatePagination = useCallback((currentPage, maxPages) => {
    const pagesArr = [];
    const maxVisible = 5;

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;

    if (end > maxPages) {
      end = maxPages;
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pagesArr.push(1);
      if (start > 2) pagesArr.push('...');
    }

    for (let i = start; i <= end; i += 1) {
      pagesArr.push(i);
    }

    if (end < maxPages) {
      if (end < maxPages - 1) pagesArr.push('...');
      pagesArr.push(maxPages);
    }

    setPages(pagesArr);
  }, []);

  const loadData = useCallback(async (currentPage, currentFilter, currentSearch) => {
    setIsLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      const res = await fetchIncidents({
        filter: currentFilter,
        search: currentSearch,
        limit: pageSize,
        offset
      });

      setIncidents(res.data.incidents);

      const newTotalPage = Math.max(1, Math.ceil(res.data.total / pageSize));
      setTotalPage(newTotalPage);
      updatePagination(currentPage, newTotalPage);
    } catch (error) {
      toast.error('Failed to load data.');
    } finally {
      setIsLoading(false);
      setInitialLoad(false);
    }
  }, [pageSize, updatePagination]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchText]);

  useEffect(() => {
    loadData(page, filter, debouncedSearchText);
  }, [page, filter, debouncedSearchText, loadData]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadData(page, filter, debouncedSearchText);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [page, filter, debouncedSearchText, loadData]);

  const sortedIncidents = useMemo(() => {
    const data = [...incidents];
    const { key, direction } = sortConfig;

    if (!key) return data;

    data.sort((a, b) => {
      const aRaw = key === 'approval_state' ? a[key] || 'Pending' : a[key];
      const bRaw = key === 'approval_state' ? b[key] || 'Pending' : b[key];

      let aValue = getDisplayValue(aRaw).toLowerCase();
      let bValue = getDisplayValue(bRaw).toLowerCase();

      if (key === 'number') {
        aValue = parseInt(aValue.replace(/\D/g, ''), 10) || 0;
        bValue = parseInt(bValue.replace(/\D/g, ''), 10) || 0;
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [incidents, sortConfig]);

  const detailItems = useMemo(() => {
    if (!selectedIncident) return [];

    return [
      { label: 'Record ID', value: getDisplayValue(selectedIncident.sys_id) },
      { label: 'Caller', value: getDisplayValue(selectedIncident.caller_id) },
      { label: 'Priority', value: getDisplayValue(selectedIncident.priority) },
      { label: 'Urgency', value: getDisplayValue(selectedIncident.urgency) },
      { label: 'Category', value: getDisplayValue(selectedIncident.category) },
      { label: 'Assigned To', value: getDisplayValue(selectedIncident.assigned_to) },
      { label: 'Active', value: getDisplayValue(selectedIncident.active) },
      { label: 'Opened At', value: formatDateValue(selectedIncident.opened_at || selectedIncident.sys_created_on) },
      { label: 'Last Updated', value: formatDateValue(selectedIncident.sys_updated_on) }
    ];
  }, [selectedIncident]);

  const handleSort = (columnKey) => {
    setSortConfig((prev) => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleResizeStart = (event, column) => {
    event.preventDefault();
    event.stopPropagation();

    resizeStateRef.current = {
      columnKey: column.key,
      startX: event.clientX,
      startWidth: columnWidths[column.key],
      minWidth: column.minWidth
    };
  };

  const handleOpenIncident = useCallback(async (incident) => {
    setSelectedIncident(incident);
    setIsDetailLoading(true);

    try {
      const detailData = await fetchIncidentDetails(incident.sys_id);
      setSelectedIncident((prev) => {
        if (!prev || prev.sys_id !== incident.sys_id) return prev;

        return {
          ...prev,
          ...detailData,
          approval_state: detailData.approval_state || detailData.u_approval_state || prev.approval_state
        };
      });
    } catch (error) {
      toast.error('Could not load full incident details.');
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const handleRowKeyDown = (event, incident) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpenIncident(incident);
    }
  };

  const handleUpdateState = async (sysId, action) => {
    const previousIncidents = incidents;
    const optimisticState = action === 'approve' ? 'Approved' : 'Rejected';

    setIncidents((prev) =>
      prev.map((inc) => (
        inc.sys_id === sysId
          ? { ...inc, approval_state: optimisticState }
          : inc
      ))
    );

    setUpdatingIds((prev) => new Set(prev).add(sysId));

    try {
      const offset = (page - 1) * pageSize;
      const res = await updateIncidentState({
        sys_id: sysId,
        action,
        filter,
        search: debouncedSearchText,
        limit: pageSize,
        offset
      });

      setIncidents(res.data.incidents);

      const newTotalPage = Math.max(1, Math.ceil(res.data.total / pageSize));
      setTotalPage(newTotalPage);
      updatePagination(page, newTotalPage);

      if (selectedIncident?.sys_id === sysId) {
        const updatedIncident = res.data.incidents.find((inc) => inc.sys_id === sysId);
        if (updatedIncident) setSelectedIncident(updatedIncident);
      }

      if (res.data.message) {
        toast.success(res.data.message);
      }
    } catch (error) {
      setIncidents(previousIncidents);
      toast.error('Failed to update state. Changes rolled back.');
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(sysId);
        return next;
      });
    }
  };

  const handleJumpToPage = () => {
    const parsedPage = parseInt(jumpPage, 10);

    if (!parsedPage || parsedPage < 1) {
      toast.error('Enter a valid page number');
      return;
    }

    if (parsedPage > totalPage) {
      toast.error(`Max page is ${totalPage}`);
      return;
    }

    setPage(parsedPage);
    setJumpPage('');
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleJumpToPage();
    }
  };

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setPage(1);
    loadData(1, filter, debouncedSearchText);
  }, [filter, debouncedSearchText, loadData]);

  return (
    <>
      <div className="incident-container">
        <div className="header">
          <h3>Incident Dashboard</h3>
          <div className="controls">
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
              style={{ marginRight: '16px' }}
            >
              + Create Incident
            </button>
            <div className="search-container">
              <input
                type="text"
                className="form-control search-box"
                placeholder="Search..."
                value={searchText}
                onChange={(event) => {
                  setPage(1);
                  setSearchText(event.target.value);
                }}
              />
            </div>
            <select
              className="form-control filter-dropdown"
              value={filter}
              onChange={(event) => {
                setPage(1);
                setFilter(event.target.value);
              }}
            >
              <option value="active=true">Active</option>
              <option value="active=false">Closed</option>
              <option value="state=6">Resolved</option>
              <option value="state=8">Canceled</option>
              <option value="u_approval_state=approved">Approved</option>
              <option value="u_approval_state=rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="card">
          <table className="table custom-table">
            <colgroup>
              {TABLE_COLUMNS.map((column) => (
                <col key={column.key} style={{ width: `${columnWidths[column.key]}px` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {TABLE_COLUMNS.map((column) => {
                  const isSorted = sortConfig.key === column.key;
                  const sortIndicator = !column.sortable
                    ? ''
                    : isSorted
                      ? (sortConfig.direction === 'asc' ? '▲' : '▼')
                      : '↕';

                  return (
                    <th
                      key={column.key}
                      className="resizable-header"
                      aria-sort={column.sortable ? (isSorted ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                    >
                      <div
                        className={`th-content ${column.sortable ? 'is-sortable' : ''}`}
                        onClick={column.sortable ? () => handleSort(column.key) : undefined}
                        title={column.sortable ? `Sort by ${column.label}` : column.label}
                      >
                        <span>{column.label}</span>
                        {column.sortable && <span className="sort-indicator">{sortIndicator}</span>}
                      </div>
                      <span
                        className="column-resizer"
                        onMouseDown={(event) => handleResizeStart(event, column)}
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={`Resize ${column.label} column`}
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {initialLoad && isLoading
                ? Array.from({ length: 5 }).map((_, index) => <SkeletonRow key={index} />)
                : sortedIncidents.map((inc) => (
                  <tr
                    key={inc.sys_id}
                    className={`row-hover clickable-row ${updatingIds.has(inc.sys_id) ? 'row-updating' : ''}`}
                    tabIndex={0}
                    title="Click to view incident details"
                  >
                    <td className="number" onClick={() => handleOpenIncident(inc)} onKeyDown={(event) => handleRowKeyDown(event, inc)}>{getDisplayValue(inc.number)}</td>
                    <td className="desc">{getDisplayValue(inc.short_description)}</td>
                    <td>
                      <span className={`state-badge ${getStateBadgeClass(inc.state)}`}>
                        {getDisplayValue(inc.state)}
                      </span>
                    </td>
                    <td>
                      <span className={`state-badge ${getStateBadgeClass(inc.approval_state || 'Pending', 'approval')}`}>
                        {getDisplayValue(inc.approval_state || 'Pending')}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleUpdateState(inc.sys_id, 'approve');
                        }}
                        disabled={!!inc.approval_state || updatingIds.has(inc.sys_id)}
                      >
                        {updatingIds.has(inc.sys_id) ? '...' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleUpdateState(inc.sys_id, 'reject');
                        }}
                        disabled={!!inc.approval_state || updatingIds.has(inc.sys_id)}
                      >
                        {updatingIds.has(inc.sys_id) ? '...' : 'Reject'}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {incidents.length === 0 && !isLoading && (
            <div className="no-data">
              No incidents found
            </div>
          )}
          {isLoading && incidents.length === 0 && (
            <div className="no-data">
              Loading incidents...
            </div>
          )}
        </div>

        <div className="pagination-bar">
          <button
            className="btn btn-default"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Prev
          </button>

          {pages.map((p, idx) => (
            <span key={idx}>
              {p !== '...' ? (
                <button
                  className={`btn ${p === page ? 'btn-primary' : 'btn-default'}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ) : (
                <span style={{ margin: '0 5px' }}>...</span>
              )}
            </span>
          ))}

          <button
            className="btn btn-default"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPage}
          >
            Next
          </button>

          <div className="page-jump">
            <input
              type="number"
              className="form-control page-input"
              placeholder="Go to page"
              value={jumpPage}
              onChange={(event) => setJumpPage(event.target.value)}
              min="1"
              max={totalPage}
              onKeyPress={handleKeyPress}
            />
            <button
              className="btn btn-primary"
              onClick={handleJumpToPage}
            >
              Go
            </button>
          </div>
        </div>
      </div>

      {selectedIncident && (
        <>
          <div
            className="detail-panel-overlay"
            onClick={() => {
              setSelectedIncident(null);
              setIsDetailLoading(false);
            }}
          />
          <aside className="incident-detail-panel" aria-label="Incident details panel">
            <div className="detail-panel-header">
              <div>
                <p className="detail-panel-kicker">Incident Details</p>
                <h3>{getDisplayValue(selectedIncident.number)}</h3>
              </div>
              <button
                type="button"
                className="detail-close-btn"
                onClick={() => {
                  setSelectedIncident(null);
                  setIsDetailLoading(false);
                }}
                aria-label="Close incident details"
              >
                ×
              </button>
            </div>

            <div className="detail-panel-body">
              <div className="detail-highlight">
                <p className="detail-title">{getDisplayValue(selectedIncident.short_description)}</p>
                <div className="detail-badges">
                  <span className={`state-badge ${getStateBadgeClass(selectedIncident.state)}`}>
                    {getDisplayValue(selectedIncident.state)}
                  </span>
                  <span className={`state-badge ${getStateBadgeClass(selectedIncident.approval_state || selectedIncident.u_approval_state || 'Pending', 'approval')}`}>
                    {getDisplayValue(selectedIncident.approval_state || selectedIncident.u_approval_state || 'Pending')}
                  </span>
                </div>
              </div>

              {isDetailLoading && (
                <div className="detail-loading">Loading full incident details...</div>
              )}

              <div className="detail-description">
                <h4>Description</h4>
                <p>{getDisplayValue(selectedIncident.description || 'No additional description available.')}</p>
              </div>

              <div className="detail-grid">
                {detailItems.map((item) => (
                  <div key={item.label} className="detail-item">
                    <span className="detail-label">{item.label}</span>
                    <span className="detail-value">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </>
      )}

      {showCreateModal && (
        <CreateIncident
          user={user}
          onClose={handleCloseCreateModal}
          onSuccess={handleCreateSuccess}
        />
      )}
    </>
  );
};

export default IncidentDashboard;

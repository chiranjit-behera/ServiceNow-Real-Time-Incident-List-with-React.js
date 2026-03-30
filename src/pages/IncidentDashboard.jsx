import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { fetchIncidents, updateIncidentState } from '../api';
import CreateIncident from '../components/CreateIncident';

const IncidentDashboard = ({ user }) => {
  const urlParams = new URLSearchParams(window.location.search);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [incidents, setIncidents] = useState([]);
  const [page, setPage] = useState(() => {
    const savedPage = urlParams.get('page');
    return savedPage ? parseInt(savedPage, 10) : 1;
  });
  const [filter, setFilter] = useState(() => {
    return urlParams.get('filter') || "active=true";
  });
  const [searchText, setSearchText] = useState(() => {
    return urlParams.get('search') || "";
  });
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText);
  const [isLoading, setIsLoading] = useState(true);
  const [jumpPage, setJumpPage] = useState("");

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

  const updatePagination = useCallback((currentPage, maxPages) => {
    let pagesArr = [];
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

    for (let i = start; i <= end; i++) {
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

  const handleUpdateState = async (sysId, action) => {
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

      if (res.data.message) {
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error('Failed to update state.');
    }
  };

  const handleJumpToPage = () => {
    const parsedPage = parseInt(jumpPage, 10);
    if (!parsedPage || parsedPage < 1) {
      toast.error("Enter a valid page number");
      return;
    }
    if (parsedPage > totalPage) {
      toast.error(`Max page is ${totalPage}`);
      return;
    }
    setPage(parsedPage);
    setJumpPage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJumpToPage();
    }
  };

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
                onChange={(e) => {
                  setPage(1);
                  setSearchText(e.target.value);
                }}
              />
            </div>
            <select
              className="form-control filter-dropdown"
              value={filter}
              onChange={(e) => {
                setPage(1);
                setFilter(e.target.value);
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
            <thead>
              <tr>
                <th>Number</th>
                <th>Description</th>
                <th>State</th>
                <th>Approval State</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map(inc => (
                <tr key={inc.sys_id} className="row-hover">
                  <td className="number">{inc.number}</td>
                  <td className="desc">{inc.short_description}</td>
                  <td>
                    <span className={`state-badge ${inc.state === 'New' ? 'state-new' : inc.state === 'In Progress' ? 'state-progress' : 'state-other'}`}>
                      {inc.state}
                    </span>
                  </td>
                  <td>
                    <span className={`state-badge ${inc.approval_state === 'Approved' ? 'state-approved' : (inc.approval_state === 'Rejected' ? 'state-rejected' : 'state-other')}`}>
                      {inc.approval_state || 'Pending'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleUpdateState(inc.sys_id, 'approve')}
                      disabled={!!inc.approval_state}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleUpdateState(inc.sys_id, 'reject')}
                      disabled={!!inc.approval_state}
                    >
                      Reject
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
              onChange={(e) => setJumpPage(e.target.value)}
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

      {showCreateModal && (
        <CreateIncident
          user={user}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setPage(1);
            loadData(1, filter, debouncedSearchText);
          }}
        />
      )}
    </>
  );
};

export default IncidentDashboard;

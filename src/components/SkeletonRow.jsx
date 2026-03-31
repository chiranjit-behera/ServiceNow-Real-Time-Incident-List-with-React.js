import React, { memo } from 'react';

const SkeletonRow = memo(() => (
  <tr className="skeleton-row">
    <td><span className="skeleton skeleton-text skeleton-short" /></td>
    <td><span className="skeleton skeleton-text skeleton-long" /></td>
    <td><span className="skeleton skeleton-badge" /></td>
    <td><span className="skeleton skeleton-badge" /></td>
    <td>
      <span className="skeleton skeleton-btn" />
      <span className="skeleton skeleton-btn" />
    </td>
  </tr>
));

export default SkeletonRow;
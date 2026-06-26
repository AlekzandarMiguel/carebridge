import React from 'react';

const statusLabels = {
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Declined',
    reserved: 'Reserved',
    in_transfer: 'In Transfer',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

export default function StatusBadge({ status }) {
    return (
        <span className={`badge badge-${status}`}>
            {statusLabels[status] || status}
        </span>
    );
}

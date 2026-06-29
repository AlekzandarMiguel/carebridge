import React from 'react';

const deliveryProgress = {
    not_started: 0.08,
    en_route: 0.58,
    arrived: 0.92,
    delivered: 1,
};

const hasCoordinates = (hospital) => hospital?.latitude !== null
    && hospital?.latitude !== undefined
    && hospital?.longitude !== null
    && hospital?.longitude !== undefined;

export default function RouteMap({ transfer }) {
    const origin = transfer?.sending_hospital;
    const destination = transfer?.receiving_hospital;
    const canPlot = hasCoordinates(origin) && hasCoordinates(destination);
    const status = transfer?.delivery_status || 'not_started';
    const progress = deliveryProgress[status] ?? 0.08;

    if (!canPlot) {
        return (
            <div className="route-map route-map-empty">
                <div>
                    <strong>Built-in Route Map</strong>
                    <span>Add coordinates to both hospitals to plot the placement route.</span>
                </div>
            </div>
        );
    }

    const start = { x: 78, y: 226 };
    const end = { x: 522, y: 72 };
    const control = { x: 274, y: 48 };
    const current = {
        x: ((1 - progress) ** 2 * start.x) + (2 * (1 - progress) * progress * control.x) + (progress ** 2 * end.x),
        y: ((1 - progress) ** 2 * start.y) + (2 * (1 - progress) * progress * control.y) + (progress ** 2 * end.y),
    };

    return (
        <div className="route-map">
            <div className="route-map-head">
                <div>
                    <strong>Built-in Route Map</strong>
                    <span>{origin.name} to {destination.name}</span>
                </div>
                <div>
                    <strong>{transfer.route_distance_km ? `${transfer.route_distance_km} km` : 'Route'}</strong>
                    <span>{transfer.estimated_travel_minutes ? `${transfer.estimated_travel_minutes} min estimate` : 'Estimate pending'}</span>
                </div>
            </div>
            <svg viewBox="0 0 600 300" role="img" aria-label="Patient delivery route from origin to accepting hospital">
                <defs>
                    <linearGradient id={`routeGradient-${transfer.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="52%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                </defs>
                <rect x="22" y="22" width="556" height="256" rx="18" className="route-map-grid" />
                <path d="M78 226 C184 74 350 28 522 72" className="route-map-shadow" />
                <path d="M78 226 C184 74 350 28 522 72" className="route-map-line" stroke={`url(#routeGradient-${transfer.id})`} />
                <circle cx={start.x} cy={start.y} r="16" className="route-node route-node-start" />
                <circle cx={end.x} cy={end.y} r="16" className="route-node route-node-end" />
                <circle cx={current.x} cy={current.y} r="12" className="route-current" />
                <text x="78" y="262" textAnchor="middle">{origin.name}</text>
                <text x="522" y="44" textAnchor="middle">{destination.name}</text>
            </svg>
            <div className="route-map-foot">
                <span>Last update: {transfer.delivery_last_location || 'Waiting for dispatch'}</span>
                <span>{status.replace('_', ' ')}</span>
            </div>
        </div>
    );
}

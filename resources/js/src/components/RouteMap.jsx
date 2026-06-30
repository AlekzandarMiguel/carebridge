import React, { useEffect, useState } from 'react';
import { getRouteSuggestion } from '../api/axios';

const hasCoordinates = (hospital) => hospital?.latitude !== null
    && hospital?.latitude !== undefined
    && hospital?.longitude !== null
    && hospital?.longitude !== undefined;

const mapPlace = (hospital) => {
    if (hospital?.name && hospital?.address) {
        return `${hospital.name}, ${hospital.address}`;
    }

    return `${hospital.latitude},${hospital.longitude}`;
};

export default function RouteMap({ transfer }) {
    const origin = transfer?.sending_hospital;
    const destination = transfer?.receiving_hospital;
    const canPlot = hasCoordinates(origin) && hasCoordinates(destination);
    const status = transfer?.delivery_status || 'not_started';
    const [routeInfo, setRouteInfo] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);

    useEffect(() => {
        let active = true;

        if (!canPlot || !transfer?.id) {
            setRouteInfo(null);
            return () => {
                active = false;
            };
        }

        setRouteLoading(true);
        getRouteSuggestion(transfer.id)
            .then((res) => {
                if (active) {
                    setRouteInfo(res.data);
                }
            })
            .catch(() => {
                if (active) {
                    setRouteInfo(null);
                }
            })
            .finally(() => {
                if (active) {
                    setRouteLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [canPlot, transfer?.id]);

    if (!canPlot) {
        return (
            <div className="route-map route-map-empty">
                <div>
                    <strong>Delivery Route Map</strong>
                    <span>Add coordinates to both hospitals to plot the placement route.</span>
                </div>
            </div>
        );
    }

    const distance = routeInfo?.distance_km ?? transfer.route_distance_km;
    const travelMinutes = routeInfo?.estimated_travel_minutes ?? transfer.estimated_travel_minutes;
    const googleEmbedUrl = `https://maps.google.com/maps?saddr=${encodeURIComponent(mapPlace(origin))}&daddr=${encodeURIComponent(mapPlace(destination))}&output=embed`;
    const source = routeInfo?.source === 'geo'
        ? 'Geo route'
        : routeInfo?.source === 'road'
            ? 'Road route'
            : routeInfo?.source === 'estimated'
                ? 'Estimated route'
                : 'Stored route';

    return (
        <div className="route-map">
            <div className="route-map-head">
                <div>
                    <strong>Delivery Route Map</strong>
                    <span>{origin.name} to {destination.name}</span>
                </div>
                <div>
                    <strong>{distance ? `${distance} km` : 'Route'}</strong>
                    <span>{travelMinutes ? `${travelMinutes} min estimate` : 'Estimate pending'}</span>
                </div>
                <div className={`route-source-pill route-source-${routeInfo?.source || 'stored'}`}>
                    <strong>{routeLoading ? 'Checking route' : source}</strong>
                    <span>{routeInfo?.provider || 'Local estimate'}</span>
                </div>
            </div>
            <div className="route-map-canvas" role="img" aria-label="Patient delivery road map from origin to accepting hospital">
                <iframe
                    className="route-google-frame"
                    title={`Route map for ${transfer.patient_reference_code || 'placement case'}`}
                    src={googleEmbedUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />
            </div>
            <div className="route-summary-grid">
                <div>
                    <span>Origin</span>
                    <strong>{origin.name}</strong>
                </div>
                <div>
                    <span>Accepting</span>
                    <strong>{destination.name}</strong>
                </div>
                <div>
                    <span>Distance</span>
                    <strong>{distance ? `${distance} km` : 'Pending'}</strong>
                </div>
                <div>
                    <span>ETA</span>
                    <strong>{travelMinutes ? `${travelMinutes} min` : 'Pending'}</strong>
                </div>
            </div>
            <div className="route-map-foot">
                <span>Last update: {transfer.delivery_last_location || 'Waiting for dispatch'}</span>
                <span>{routeInfo?.message || status.replace('_', ' ')}</span>
            </div>
        </div>
    );
}

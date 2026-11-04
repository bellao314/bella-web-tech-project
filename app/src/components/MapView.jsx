import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  APIProvider,
  Map,
  useMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from '@vis.gl/react-google-maps';

function BoundsTracker({ onBoundsChange }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !onBoundsChange) return;

    const reportBounds = () => {
      const b = map.getBounds();
      if (b) {
        const ne = b.getNorthEast();
        const sw = b.getSouthWest();
        onBoundsChange({
          north: ne.lat(),
          south: sw.lat(),
          east: ne.lng(),
          west: sw.lng(),
        });
      }
    };

    reportBounds();
    const listener = map.addListener('bounds_changed', reportBounds);
    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, onBoundsChange]);

  return null;
}

const VendorMarkers = ({
  vendors,
  selectedVendorId,
  onSelectVendor,
}) => {
  const map = useMap();

  const selectedVendor = useMemo(() => {
    if (!selectedVendorId) return null;
    return vendors.find((v) => String(v.id) === String(selectedVendorId)) || null;
  }, [vendors, selectedVendorId]);

  const handleMarkerClick = useCallback(
    (vendor) => {
      if (!map) return;
      if (Number.isFinite(vendor.latitude) && Number.isFinite(vendor.longitude)) {
        map.panTo({ lat: vendor.latitude, lng: vendor.longitude });
      }
      onSelectVendor?.(vendor);
    },
    [map, onSelectVendor]
  );

  return (
    <>
      {vendors.map((vendor) => {
        const isSelected = String(vendor.id) === String(selectedVendorId);
        return (
          <AdvancedMarker
            key={vendor.id}
            position={{ lat: vendor.latitude, lng: vendor.longitude }}
            clickable={true}
            onClick={() => handleMarkerClick(vendor)}
          >
            <Pin
              background={isSelected ? '#9c88c0' : '#422e65'}
              glyphColor="#ffffff"
              borderColor={isSelected ? '#422e65' : '#2a1d42'}
              scale={isSelected ? 1.2 : 1.0}
            />
          </AdvancedMarker>
        );
      })}

      {selectedVendor &&
        Number.isFinite(selectedVendor.latitude) &&
        Number.isFinite(selectedVendor.longitude) && (
          <InfoWindow
            position={{ lat: selectedVendor.latitude, lng: selectedVendor.longitude }}
            onCloseClick={() => onSelectVendor?.(null)}
          >
            <div style={{ padding: '4px 6px', minWidth: '150px', color: '#1f2521', fontFamily: 'Inter, sans-serif' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>
                {selectedVendor.name}
              </div>
              <div style={{ fontSize: '11px', color: '#847f8b', marginBottom: '4px' }}>
                {selectedVendor.type} {selectedVendor.rating ? `· ★ ${selectedVendor.rating}` : ''}
              </div>
              {selectedVendor.city && (
                <div style={{ fontSize: '10px', color: '#422e65', fontWeight: 600, marginBottom: '8px' }}>
                  {selectedVendor.city}
                </div>
              )}
              <button
                type="button"
                onClick={() => onSelectVendor?.(selectedVendor, true)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: '#422e65',
                  color: '#ffffff',
                  border: 0,
                  borderRadius: '7px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                View details
              </button>
            </div>
          </InfoWindow>
        )}
    </>
  );
};

function MapView({
  vendors = [],
  onBoundsChange,
  selectedVendorId = null,
  onSelectVendor,
  placing = false,
}) {
  const validVendors = useMemo(() => {
    return vendors.filter(
      (v) => Number.isFinite(v.latitude) && Number.isFinite(v.longitude)
    );
  }, [vendors]);

  // Center on St. Louis coordinates or the first vendor's location
  const center = useMemo(() => {
    if (placing) {
      return { lat: 45.523064, lng: -122.676483 }; // Portland for placing pin demo
    }
    if (validVendors.length > 0) {
      return { lat: validVendors[0].latitude, lng: validVendors[0].longitude };
    }
    return { lat: 38.635745, lng: -90.234145 }; // St. Louis Midtown
  }, [validVendors, placing]);

  const handleCameraChanged = useCallback(
    (ev) => {
      if (onBoundsChange && ev.detail.bounds) {
        onBoundsChange(ev.detail.bounds);
      }
    },
    [onBoundsChange]
  );

  if (!import.meta.env.VITE_GOOGLE_API_KEY) {
    return (
      <div className="map-artwork">
        <p className="map-empty-state">Map coordinates will appear when supplied by the API.</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_API_KEY}>
      <Map
        defaultZoom={placing ? 14 : 12}
        defaultCenter={center}
        style={{ width: '100%', height: '100vh' }}
        onCameraChanged={handleCameraChanged}
        mapId="da37f3254c6a6d1c"
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        <BoundsTracker onBoundsChange={onBoundsChange} />

        {placing ? (
          <AdvancedMarker position={center} draggable={true}>
            <Pin background="#422e65" glyphColor="#ffffff" borderColor="#2a1d42" />
          </AdvancedMarker>
        ) : (
          <VendorMarkers
            vendors={validVendors}
            selectedVendorId={selectedVendorId}
            onSelectVendor={onSelectVendor}
          />
        )}
      </Map>
    </APIProvider>
  );
}

export default MapView;

import { useCallback, useMemo, useEffect, useRef } from 'react';
import Icon from './Icon';
import {
  APIProvider,
  Map,
  useMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from '@vis.gl/react-google-maps';

const VendorMarkers = ({
  vendors,
  selectedVendorId,
  onSelectVendor,
  isFavorite,
  onToggleFavorite,
}) => {
  const map = useMap();

  const selectedVendor = useMemo(() => {
    if (!selectedVendorId) return null;
    return vendors.find((v) => String(v.id) === String(selectedVendorId)) || null;
  }, [vendors, selectedVendorId]);

  useEffect(() => {
    if (!map || !selectedVendor) return;
    if (Number.isFinite(selectedVendor.latitude) && Number.isFinite(selectedVendor.longitude)) {
      map.panTo({ lat: selectedVendor.latitude, lng: selectedVendor.longitude });
    }
  }, [map, selectedVendor]);

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
        const isMyBusiness = String(vendor.id) === 'my-business';
        return (
          <AdvancedMarker
            key={vendor.id}
            position={{ lat: vendor.latitude, lng: vendor.longitude }}
            clickable={true}
            onClick={() => handleMarkerClick(vendor)}
          >
            <Pin
              background={isSelected ? '#9c88c0' : isMyBusiness ? '#422e65' : 'var(--forest)'}
              glyphColor="#ffffff"
              borderColor={isSelected ? 'var(--lime)' : isMyBusiness ? 'var(--lime)' : 'var(--ink)'}
              scale={isSelected || isMyBusiness ? 1.15 : 1.0}
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
            <div style={{ padding: '6px 8px', minWidth: '160px', color: '#1f2521', fontFamily: 'Inter, sans-serif' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '2px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', lineHeight: 1.25 }}>
                  {selectedVendor.name}
                </div>
                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(selectedVendor);
                    }}
                    aria-label={isFavorite?.(selectedVendor.id) ? `Remove ${selectedVendor.name} from favorites` : `Add ${selectedVendor.name} to favorites`}
                    title={isFavorite?.(selectedVendor.id) ? "Favorited" : "Add to favorites"}
                    style={{
                      border: 0,
                      background: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      color: isFavorite?.(selectedVendor.id) ? '#e11d48' : '#847f8b',
                      display: 'grid',
                      placeItems: 'center',
                      flex: '0 0 auto',
                    }}
                  >
                    <Icon
                      name="heart"
                      size={19}
                      fill={isFavorite?.(selectedVendor.id) ? '#e11d48' : 'none'}
                      color={isFavorite?.(selectedVendor.id) ? '#e11d48' : 'currentColor'}
                    />
                  </button>
                )}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                {selectedVendor.type}
              </div>
              {selectedVendor.city && (
                <div style={{ fontSize: '10px', color: 'var(--forest)', fontWeight: 600, marginBottom: '8px' }}>
                  {selectedVendor.city}
                </div>
              )}
              <button
                type="button"
                onClick={() => onSelectVendor?.(selectedVendor, true)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  background: 'var(--forest)',
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

const MapCenterController = ({ center }) => {
  const map = useMap();
  const prevCenterRef = useRef(null);

  useEffect(() => {
    if (!map || !center) return;
    if (
      !prevCenterRef.current ||
      prevCenterRef.current.lat !== center.lat ||
      prevCenterRef.current.lng !== center.lng
    ) {
      prevCenterRef.current = center;
      map.setCenter(center);
    }
  }, [map, center]);

  return null;
};

function MapView({
  vendors = [],
  onBoundsChange,
  selectedVendorId = null,
  onSelectVendor,
  isFavorite,
  onToggleFavorite,
  placing = false,
  userCoordinates = null,
  style = {},
}) {
  const validVendors = useMemo(() => {
    return vendors.filter(
      (v) => Number.isFinite(v.latitude) && Number.isFinite(v.longitude)
    );
  }, [vendors]);

  // Determine user coordinates: check prop first, then fallback to localStorage
  const activeUserCoords = useMemo(() => {
    if (userCoordinates && Number.isFinite(userCoordinates.lat) && Number.isFinite(userCoordinates.lng)) {
      return { lat: Number(userCoordinates.lat), lng: Number(userCoordinates.lng) };
    }
    try {
      const stored = localStorage.getItem("userCityCoords");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) {
          return { lat: Number(parsed.lat), lng: Number(parsed.lng) };
        }
      }
    } catch {
      return null;
    }
    return null;
  }, [userCoordinates]);

  // Center on customer's city coordinates if set, or placing coords, or first vendor, or default St. Louis
  const center = useMemo(() => {
    if (placing) {
      return { lat: 38.614928, lng: -90.348396 };
    }
    if (activeUserCoords) {
      return activeUserCoords;
    }
    if (validVendors.length > 0) {
      return { lat: validVendors[0].latitude, lng: validVendors[0].longitude };
    }
    return { lat: 38.635745, lng: -90.234145 };
  }, [validVendors, placing, activeUserCoords]);

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
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_API_KEY} libraries={["places"]}>
      <Map
        defaultZoom={placing ? 14 : 12}
        defaultCenter={center}
        style={{ width: '100%', height: '100%', ...style }}
        onCameraChanged={handleCameraChanged}
        mapId="da37f3254c6a6d1c"
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        <MapCenterController center={center} />
        {placing ? (
          <AdvancedMarker position={center} draggable={true}>
            <Pin background="#422e65" glyphColor="#ffffff" borderColor="#2a1d42" />
          </AdvancedMarker>
        ) : (
          <VendorMarkers
            vendors={validVendors}
            selectedVendorId={selectedVendorId}
            onSelectVendor={onSelectVendor}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
          />
        )}
      </Map>
    </APIProvider>
  );
}

export default MapView;

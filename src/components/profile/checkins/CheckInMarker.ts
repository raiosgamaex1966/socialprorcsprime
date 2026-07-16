import L from "leaflet";

export const createCheckInIcon = (color = "hsl(var(--primary))") =>
  L.divIcon({
    className: "custom-checkin-marker",
    html: `<div style="
      background: ${color};
      width: 32px; height: 32px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 3px solid white;
      box-shadow: 0 3px 12px rgba(0,0,0,0.35);
      animation: checkin-pulse 2s ease-in-out infinite;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

export const createAddMarkerIcon = () =>
  L.divIcon({
    className: "custom-add-marker",
    html: `<div style="
      background: hsl(var(--primary));
      width: 36px; height: 36px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 3px solid white;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });

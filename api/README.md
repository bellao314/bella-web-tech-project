# Maps API backend

Express API that keeps the Google Maps API key on the server. It requires Node 18+ (for the built-in `fetch`). Create a local `.env` from `.env.example`, then enable **Routes API**, **Geocoding API**, and **Places API (New)** for that key in Google Cloud.

```bash
npm install
npm run dev
```

Endpoints:

- `GET /health`
- `GET /api/maps/geocode?address=1600+Amphitheatre+Parkway`
- `GET /api/maps/reverse-geocode?latitude=37.422&longitude=-122.084`
- `POST /api/maps/places/autocomplete` — `{ "input": "coffee near downtown" }`
- `POST /api/maps/places/search` — `{ "textQuery": "coffee shops in Austin" }`
- `POST /api/maps/routes` — `{ "origin": { "address": "Austin, TX" }, "destination": { "address": "Dallas, TX" } }`

Route requests accept the Routes API request shape. For coordinates, use `{"location":{"latLng":{"latitude":30.2672,"longitude":-97.7431}}}` for `origin` or `destination`.

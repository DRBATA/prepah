import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Geocoding API Handler
 * Securely proxies requests to OpenWeatherMap Geocoding API
 */
export default async function geoHandler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { lat, lon } = req.query;
    
    // Validate parameters
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing latitude or longitude' });
    }
    
    // Call OpenWeatherMap Geocoding API securely from server
    const geoResponse = await fetch(
      `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${process.env.OPENWEATHER_API_KEY}`
    );
    
    if (!geoResponse.ok) {
      throw new Error('Geocoding API request failed');
    }
    
    const data = await geoResponse.json();
    
    if (data && data.length > 0) {
      // Return only the necessary data
      return res.status(200).json({
        name: data[0].name,
        country: data[0].country
      });
    } else {
      return res.status(404).json({ error: 'Location not found' });
    }
  } catch (error) {
    console.error('Geocoding API error:', error);
    return res.status(500).json({ error: 'Failed to fetch location data' });
  }
}

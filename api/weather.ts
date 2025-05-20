import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Weather API Handler
 * Securely proxies requests to OpenWeatherMap API
 */
export default async function weatherHandler(req: NextApiRequest, res: NextApiResponse) {
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
    
    // Call OpenWeatherMap API securely from server
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.OPENWEATHER_API_KEY}`
    );
    
    if (!weatherResponse.ok) {
      throw new Error('Weather API request failed');
    }
    
    const data = await weatherResponse.json();
    
    // Return only the data needed by the frontend
    return res.status(200).json({
      temperature: Math.round(data.main.temp),
      humidity: data.main.humidity,
      conditions: data.weather[0].main,
      icon: data.weather[0].icon
    });
  } catch (error) {
    console.error('Weather API error:', error);
    return res.status(500).json({ error: 'Failed to fetch weather data' });
  }
}

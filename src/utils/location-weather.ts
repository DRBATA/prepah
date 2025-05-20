/**
 * Location and Weather Utilities
 * Provides functions to get user's location and weather data
 * Uses secure server-side API endpoints to protect API keys
 */

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationData {
  city: string;
  country: string;
  coordinates: Coordinates;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  conditions: string;
  icon: string;
}

/**
 * Get the user's current location using the browser's Geolocation API
 */
export const getUserLocation = (): Promise<LocationData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Use our secure API to get city name
          const response = await fetch(
            `/api/geo?lat=${latitude}&lon=${longitude}`
          );
          
          if (!response.ok) {
            throw new Error('Failed to get location data');
          }
          
          const data = await response.json();
          
          if (data && data.length > 0) {
            resolve({
              city: data[0].name,
              country: data[0].country,
              coordinates: { latitude, longitude }
            });
          } else {
            throw new Error('Location data not found');
          }
        } catch (error) {
          console.error('Error getting location name:', error);
          // Return a default location with the coordinates
          resolve({
            city: 'Unknown Location',
            country: '',
            coordinates: { 
              latitude: position.coords.latitude, 
              longitude: position.coords.longitude 
            }
          });
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        reject(error);
      },
      { 
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  });
};

/**
 * Get weather data for the specified coordinates
 */
export const getWeatherData = async (coordinates: Coordinates): Promise<WeatherData> => {
  try {
    // Use our secure API endpoint
    const response = await fetch(
      `/api/weather?lat=${coordinates.latitude}&lon=${coordinates.longitude}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to get weather data');
    }
    
    const data = await response.json();
    
    return {
      temperature: Math.round(data.main.temp),
      humidity: data.main.humidity,
      conditions: data.weather[0].main,
      icon: data.weather[0].icon
    };
  } catch (error) {
    console.error('Error getting weather data:', error);
    // Return default weather data
    return {
      temperature: 35,
      humidity: 65,
      conditions: 'Clear',
      icon: '01d'
    };
  }
};

/**
 * Get both location and weather data together
 */
export const getLocationAndWeather = async (): Promise<{
  location: LocationData;
  weather: WeatherData;
}> => {
  try {
    const location = await getUserLocation();
    const weather = await getWeatherData(location.coordinates);
    
    return { location, weather };
  } catch (error) {
    console.error('Error getting location and weather:', error);
    // Return default data
    return {
      location: {
        city: 'Dubai Marina',
        country: 'UAE',
        coordinates: { latitude: 25.0657, longitude: 55.1405 }
      },
      weather: {
        temperature: 35,
        humidity: 65,
        conditions: 'Clear',
        icon: '01d'
      }
    };
  }
};

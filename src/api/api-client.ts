/**
 * API Client for the Unified Hydration API
 * Handles all interactions with the backend API
 */

// Function to fetch hydration data for logs view
export async function fetchHydrationData(token: string) {
  try {
    const response = await fetch('/api/unified-hydration-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        view_type: 'logs',
        message: 'Get my current hydration status'
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching hydration data:', error);
    throw error;
  }
}

// Function to log water or fluid intake
export async function logHydration(token: string, amount: number, type: string, previousResponseId?: string, sessionId?: string) {
  try {
    const response = await fetch('/api/unified-hydration-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        view_type: 'logs',
        message: `I drank ${amount}ml of ${type}`,
        previous_response_id: previousResponseId,
        session_id: sessionId
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error logging hydration:', error);
    throw error;
  }
}

// Function to get personalized recommendations
export async function fetchRecommendations(token: string, previousResponseId?: string, sessionId?: string, location?: string) {
  try {
    const response = await fetch('/api/unified-hydration-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        view_type: 'recommendations',
        message: 'What hydration recommendations do you have for me?',
        previous_response_id: previousResponseId,
        session_id: sessionId,
        location
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    throw error;
  }
}

// Function to select a recommendation and add it to the action panel
export async function selectRecommendation(token: string, recommendationId: string, previousResponseId?: string, sessionId?: string) {
  try {
    const response = await fetch('/api/unified-hydration-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        view_type: 'actions',
        message: `I want to add recommendation ${recommendationId} to my plan`,
        previous_response_id: previousResponseId,
        session_id: sessionId
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error selecting recommendation:', error);
    throw error;
  }
}

// Function to complete an action
export async function completeAction(token: string, actionId: string, previousResponseId?: string, sessionId?: string) {
  try {
    const response = await fetch('/api/unified-hydration-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        view_type: 'actions',
        message: `I completed action ${actionId}`,
        previous_response_id: previousResponseId,
        session_id: sessionId
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error completing action:', error);
    throw error;
  }
}

export default {
  fetchHydrationData,
  logHydration,
  fetchRecommendations,
  selectRecommendation,
  completeAction
};

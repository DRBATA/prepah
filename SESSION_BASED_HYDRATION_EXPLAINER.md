# The Water Bar: Session-Based Hydration Tracking

## Overview

The Water Bar now implements a **session-based hydration tracking system**. Instead of tracking hydration based on calendar days, the application now uses dynamic 24-hour sessions, providing a more personalized and flexible hydration experience.

## Database Structure

We've simplified the database structure by:

1. **Consolidating user data** - User profiles are now stored in the `profiles` table
2. **Removing redundant tables** - Dropped `test_user_profiles` and `hydration_plan`
3. **Creating session-based tables**:

```sql
-- Sessions table tracks 24-hour hydration periods
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ,
  weight_kg NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Conversations table links OpenAI responses to sessions
CREATE TABLE conversations (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  session_id UUID REFERENCES sessions(id),
  last_resp TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## How the 24-Hour Session System Works

1. **Session Creation**:
   - When a user interacts with the app, we check if they have an active session
   - If not, a new 24-hour session is automatically created
   - The session includes the user's current weight

2. **Session Duration**:
   - Each session lasts exactly 24 hours from creation
   - The system tracks all hydration activity within this window
   - Users can view time remaining in their current session

3. **Session Reset**:
   - Users can manually reset their session at any time
   - This ends the current session and starts a fresh 24-hour period
   - Useful for changing contexts (e.g., starting a workout, travel)

## API Endpoints

### 1. `/api/pure-responses.ts`

The conversation endpoint with session management:

- **Purpose**: Handle user conversations and manage sessions
- **Authentication**: Requires auth token in header
- **Features**:
  - Creates/maintains 24-hour sessions
  - Preserves conversation history within sessions
  - Supports `resetSession` flag to start fresh
  - Links responses to the OpenAI API for continuity

**Example Request**:
```json
// With Authorization: Bearer <token> header
{
  "message": "How much water should I drink now?",
  "resetSession": false  // Optional, set to true to start fresh
}
```

**Example Response**:
```json
{
  "message": "Based on your profile, I recommend drinking 250ml of water now...",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "response_id": "resp_abc123"
}
```

### 2. `/api/dashboard.ts`

The dashboard data endpoint:

- **Purpose**: Provide structured hydration data for the UI
- **Authentication**: Requires auth token in header
- **Features**:
  - Returns JSON with hydration status and recommendations
  - Shows progress within the current 24-hour session
  - Includes time remaining in the session
  - Provides personalized hydration recommendations

**Example Response**:
```json
{
  "hydrationPercentage": 65,
  "timeRemaining": "12h 30m", 
  "recommendedIntake": 250,
  "todaySummary": "You've had 1.2L of water so far in this session.",
  "recentEvents": [
    {
      "time": "10:30 AM",
      "message": "Drank 250ml water"
    }
  ],
  "aiMessage": "You're doing well, but try to drink more before your workout!",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "sessionStarted": "2025-05-19T07:30:00Z",
  "sessionEndsAt": "2025-05-20T07:30:00Z"
}
```

## Implementation Details

1. **Authentication Flow**:
   - All API endpoints require a valid Supabase auth token
   - The token is used to identify the user and retrieve their profile

2. **OpenAI Responses Integration**:
   - Uses the `previous_response_id` to maintain conversation continuity
   - Stores response IDs in the conversations table
   - Enables natural, ongoing conversations about hydration

3. **Session Management Logic**:
   - Automatically detects if a session is active or expired
   - Creates new sessions when needed
   - Enforces the 24-hour window consistently

4. **Backing Up User Data**:
   - User emails and weights are backed up in JSON format
   - Located at: `hydration_emails_with_weights.json`

## Next Steps

1. **Update Frontend**: Integrate the dashboard API with the UI
2. **Add Session Controls**: Allow users to view/reset their sessions
3. **Enhance Tracking**: Connect hydration tracking to the session system

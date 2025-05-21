"use client";

import React, { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Droplet, Zap, Dumbbell, Activity, Coffee, Utensils, Plus, X, Check } from "lucide-react";

// Initialize Supabase client
const supabaseUrl = "https://hmwrlhepsmyvqwkfleck.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhtd3JsaGVwc215dnF3a2ZsZWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMDExNDAsImV4cCI6MjA2MDc3NzE0MH0.oyMGM5NGU2mLFDYxwuzXxXXVeKojzhdcbRimgME3Ogc";
const supabase = createClient(supabaseUrl, supabaseKey);

// Input library item type
interface InputLibraryItem {
  id: string;
  name: string;
  category: string;
  duration_min?: number;
  water_ml?: number;
}

// Hydration timeline entry type
interface HydrationTimelineEntry {
  id: string;
  timestamp: string;
  quantity: number;
  notes?: string;
  input_id: string;
  input_library: InputLibraryItem;
}

// Event type definition
interface TimelineEvent {
  id: string;
  type: string;
  name: string;
  time: string;
  icon: React.ReactNode;
  color: string;
  details?: string;
  confirmed: boolean;
  input_id?: string;
  quantity?: number;
}

interface TimelineViewProps {
  sessionId: string;
  userId: string;
  onEventAdded?: () => void;
  onEventUpdated?: () => void;
}

// Timeline view props interface

const TimelineView: React.FC<TimelineViewProps> = ({
  sessionId,
  userId,
  onEventAdded,
  onEventUpdated
}) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [draggingEvent, setDraggingEvent] = useState<TimelineEvent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEventType, setNewEventType] = useState("water");
  const [newEventTime, setNewEventTime] = useState("12:00");
  const [newEventDetails, setNewEventDetails] = useState("");
  const timelineRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // No profile-related functions needed anymore - moved to ProfileSection component  

  // Fetch timeline data on load
  useEffect(() => {
    fetchTimeline();
    
    // Add listener for timeline update events
    const handleTimelineUpdate = () => {
      console.log('Timeline update event received');
      fetchTimeline();
    };
    
    window.addEventListener('timelineUpdated', handleTimelineUpdate);
    
    return () => {
      window.removeEventListener('timelineUpdated', handleTimelineUpdate);
    };
  }, [sessionId, userId]);

  // Format time as HH:MM
  const formatTimeString = (date: Date) => {
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  // Get current time as HH:MM
  const getCurrentTimeString = () => {
    return formatTimeString(currentTime);
  };

  // Check if time is in the past
  const isTimePast = (timeString: string) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const eventTime = new Date();
    eventTime.setHours(hours, minutes, 0, 0);
    return eventTime <= currentTime;
  };

  // Get event type details
  const getEventTypeDetails = (type: string) => {
    switch (type) {
      case "water":
      case "drink":
        return { name: "Water", icon: <Droplet className="h-4 w-4" />, color: "#00FFFF" };
      case "electrolyte":
        return { name: "Electrolyte Drink", icon: <Zap className="h-4 w-4" />, color: "#FFAA00" };
      case "protein":
        return { name: "Protein", icon: <Dumbbell className="h-4 w-4" />, color: "#10B981" };
      case "exercise":
        return { name: "Activity", icon: <Activity className="h-4 w-4" />, color: "#FF5555" };
      case "coffee":
        return { name: "Coffee", icon: <Coffee className="h-4 w-4" />, color: "#7C3AED" };
      case "food":
        return { name: "Food", icon: <Utensils className="h-4 w-4" />, color: "#EC4899" };
      case "supplement":
        return { name: "Supplement", icon: <Zap className="h-4 w-4" />, color: "#6366F1" };
      case "state":
        return { name: "State", icon: <Activity className="h-4 w-4" />, color: "#10B981" };
      default:
        return { name: "Water", icon: <Droplet className="h-4 w-4" />, color: "#00FFFF" };
    }
  };

  // Fetch timeline from the database
  const fetchTimeline = async () => {
    if (!userId || !sessionId) return;

    try {
      // Get today's start time
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      // Fetch the hydration_timeline entries for this user & session
      const { data, error } = await supabase
        .from('hydration_timeline')
        .select(`
          id,
          timestamp,
          quantity,
          notes,
          input_id,
          input_library(id, name, category, duration_min, water_ml)
        `)
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .gte('timestamp', startOfDay.toISOString());

      if (error) {
        console.error('Error fetching timeline:', error);
        return;
      }

      if (data) {
        // Transform to our TimelineEvent format
        const timelineEvents = data.map((entry: any) => {
          const inputItem = entry.input_library as InputLibraryItem;
          const timeObj = new Date(entry.timestamp);
          const typeDetails = getEventTypeDetails(inputItem.category);
          
          let details = "";
          if (inputItem.category === "exercise") {
            details = `${inputItem.duration_min || 0} minutes`;
          } else if (inputItem.category === "water" || inputItem.category === "drink") {
            details = `${entry.quantity || 1} x ${inputItem.water_ml || 0}ml`;
          }

          return {
            id: entry.id,
            type: inputItem.category,
            name: inputItem.name,
            time: formatTimeString(timeObj),
            icon: typeDetails.icon,
            color: typeDetails.color,
            details: details || entry.notes,
            confirmed: true,
            input_id: inputItem.id,
            quantity: entry.quantity
          };
        });

        // Sort by time
        timelineEvents.sort((a, b) => {
          const timeA = a.time.split(":").map(Number);
          const timeB = b.time.split(":").map(Number);
          return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
        });

        setEvents(timelineEvents);
      }
    } catch (error) {
      console.error('Error in fetchTimeline:', error);
    }
  };

  // Add new event
  const handleAddEvent = async () => {
    if (!userId || !sessionId) return;

    try {
      // Find input from library matching the type
      const { data: inputItems } = await supabase
        .from('input_library')
        .select('*')
        .eq('category', newEventType)
        .limit(5);
        
      if (!inputItems || inputItems.length === 0) {
        console.error('No matching input items found');
        return;
      }
      
      // Pick the first matching input item (in a real app, you might want more sophisticated matching)
      const inputItem = inputItems[0];
      
      // Create timestamp from selected time
      const [hours, minutes] = newEventTime.split(':').map(Number);
      const timestamp = new Date();
      timestamp.setHours(hours, minutes, 0, 0);
      
      // Add to hydration_timeline
      const { data, error } = await supabase
        .from('hydration_timeline')
        .insert({
          user_id: userId,
          session_id: sessionId,
          input_id: inputItem.id,
          quantity: 1, // Default quantity
          timestamp: timestamp.toISOString(),
          notes: newEventDetails
        });
        
      if (error) {
        console.error('Error adding event:', error);
        return;
      }
      
      // Refresh timeline
      fetchTimeline();
      
      if (onEventAdded) onEventAdded();
      
      // Reset form
      setShowAddModal(false);
      setNewEventType('water');
      setNewEventTime('12:00');
      setNewEventDetails('');
    } catch (error) {
      console.error('Error in handleAddEvent:', error);
    }
  };

  // Confirm an event
  const confirmEvent = async (id: string) => {
    try {
      // In a real app, you might want to update some confirmation flag in the database
      // For now, just update the UI
      setEvents(events.map((event) => (event.id === id ? { ...event, confirmed: true } : event)));
    } catch (error) {
      console.error('Error confirming event:', error);
    }
  };

  // Delete an event
  const deleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('hydration_timeline')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Error deleting event:', error);
        return;
      }
      
      setEvents(events.filter((event) => event.id !== id));
      
      if (onEventUpdated) onEventUpdated();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  // Handle drag start
  const handleDragStart = (event: TimelineEvent) => {
    setDraggingEvent(event);
  };

  // Handle timeline click
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const totalHeight = rect.height;

      // Calculate hour based on position (24 hours)
      const hour = Math.floor((relativeY / totalHeight) * 24);
      const minute = Math.floor(((relativeY / totalHeight) * 24 * 60) % 60);

      // Format as HH:MM
      const clickedTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      
      // Set the time and open modal
      setNewEventTime(clickedTime);
      setShowAddModal(true);
    }
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (timelineRef.current && draggingEvent) {
      const rect = timelineRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const totalHeight = rect.height;

      // Calculate hour based on position (24 hours)
      const hour = Math.floor((relativeY / totalHeight) * 24);
      const minute = Math.floor(((relativeY / totalHeight) * 24 * 60) % 60);

      // Format as HH:MM
      const newTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

      // Update drag indicator
      const dragIndicator = document.getElementById("drag-indicator");
      if (dragIndicator) {
        const top = ((hour * 60 + minute) / (24 * 60)) * totalHeight;
        dragIndicator.style.top = `${top}px`;
        dragIndicator.textContent = newTime;
        dragIndicator.style.display = "flex";
      }
    }
  };

  // Handle drag end
  const handleDragEnd = async (e: React.DragEvent) => {
    if (timelineRef.current && draggingEvent) {
      const rect = timelineRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const totalHeight = rect.height;

      // Calculate hour based on position (24 hours)
      const hour = Math.floor((relativeY / totalHeight) * 24);
      const minute = Math.floor(((relativeY / totalHeight) * 24 * 60) % 60);

      // Format as HH:MM
      const newTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

      // Create timestamp for database update
      const timestamp = new Date();
      timestamp.setHours(hour, minute, 0, 0);
      
      try {
        // Update in database
        const { error } = await supabase
          .from('hydration_timeline')
          .update({ timestamp: timestamp.toISOString() })
          .eq('id', draggingEvent.id);
          
        if (error) {
          console.error('Error updating event time:', error);
        } else {
          // Update local state
          setEvents(
            events
              .map((event) => (event.id === draggingEvent.id ? { ...event, time: newTime } : event))
              .sort((a, b) => {
                const timeA = a.time.split(":").map(Number);
                const timeB = b.time.split(":").map(Number);
                return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
              })
          );
          
          if (onEventUpdated) onEventUpdated();
        }
      } catch (error) {
        console.error('Error in handleDragEnd:', error);
      }

      // Hide drag indicator
      const dragIndicator = document.getElementById("drag-indicator");
      if (dragIndicator) {
        dragIndicator.style.display = "none";
      }
    }

    setDraggingEvent(null);
  };

  // Handle drop from outside sources
  const handleExternalDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    
    try {
      // Check if this is an external drop from the input drawer
      const itemData = e.dataTransfer.getData('application/json');
      if (!itemData) return;
      
      const droppedItem = JSON.parse(itemData);
      
      // Calculate time based on drop position
      if (timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const relativeY = e.clientY - rect.top;
        const totalHeight = rect.height;
        
        // Calculate hour based on position (24 hours)
        const hour = Math.floor((relativeY / totalHeight) * 24);
        const minute = Math.floor(((relativeY / totalHeight) * 24 * 60) % 60);
        
        // Create timestamp
        const timestamp = new Date();
        timestamp.setHours(hour, minute, 0, 0);
        
        // Add to hydration_timeline
        const { data, error } = await supabase
          .from('hydration_timeline')
          .insert({
            user_id: userId,
            session_id: sessionId,
            input_id: droppedItem.id,
            quantity: 1, // Default quantity
            timestamp: timestamp.toISOString(),
            notes: ''
          });
          
        if (error) {
          console.error('Error adding dragged item:', error);
          return;
        }
        
        // Refresh timeline
        fetchTimeline();
        
        if (onEventAdded) onEventAdded();
      }
    } catch (error) {
      console.error('Error in handleExternalDrop:', error);
    }
  };

  return (
    <div className="relative">
      {/* Timeline */}
      <div className="bg-gradient-to-b from-rose-100/30 to-blue-200/30 border border-cyan-900/50 rounded-lg mb-4 overflow-hidden">
        <div className="p-4 pb-2">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">24-Hour Timeline</h3>
            <button 
              className="text-sm bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded-md flex items-center"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Event
            </button>
          </div>
        </div>
        <div className="p-4 pt-0">
          <div
            ref={timelineRef}
            className="relative h-[600px] border-l border-gray-700 ml-6 cursor-pointer"
            onDragOver={handleDragOver}
            onDrop={handleExternalDrop}
            onClick={handleTimelineClick}
          >
            {/* Hour markers */}
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="absolute left-0 flex items-center" style={{ top: `${(i / 24) * 100}%` }}>
                <div className="w-2 h-0.5 bg-gray-700 -ml-2"></div>
                <span className="text-xs text-gray-500 ml-2">{`${i.toString().padStart(2, "0")}:00`}</span>
              </div>
            ))}

            {/* Current time indicator */}
            <div
              className="absolute left-0 right-0 flex items-center"
              style={{
                top: `${((currentTime.getHours() * 60 + currentTime.getMinutes()) / (24 * 60)) * 100}%`,
                zIndex: 10,
              }}
            >
              <div className="w-2 h-2 rounded-full bg-cyan-400 -ml-1"></div>
              <div className="h-px flex-1 bg-cyan-400/50"></div>
              <div className="bg-cyan-900/70 px-2 py-0.5 rounded text-xs text-cyan-400">{getCurrentTimeString()}</div>
            </div>

            {/* Events */}
            {events.map((event) => (
              <div
                key={event.id}
                className="absolute left-0 right-0 flex items-center"
                style={{
                  top: `${((Number(event.time.split(":")[0]) * 60 + Number(event.time.split(":")[1])) / (24 * 60)) * 100}%`,
                }}
                draggable
                onDragStart={() => handleDragStart(event)}
                onDragEnd={handleDragEnd}
              >
                <div className="flex items-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                    style={{ backgroundColor: `${event.color}30` }}
                  >
                    <span style={{ color: event.color }}>{event.icon}</span>
                  </div>

                  <div>
                    <div className="font-medium flex items-center">
                      {event.name}
                      {!event.confirmed && isTimePast(event.time) && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400">
                          Missed
                        </span>
                      )}
                      {!event.confirmed && !isTimePast(event.time) && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-cyan-900/30 text-cyan-400">
                          Planned
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center">
                      <span className="mr-2">{event.time}</span>
                      {event.details && <span>• {event.details}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  {!event.confirmed && (
                    <button
                      className="h-6 w-6 rounded-full hover:bg-green-900/30 text-green-400 flex items-center justify-center"
                      onClick={() => confirmEvent(event.id)}
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  )}

                  <button
                    className="h-6 w-6 rounded-full hover:bg-red-900/30 text-red-400 flex items-center justify-center"
                    onClick={() => deleteEvent(event.id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}


            {/* Drag indicator */}
            <div
              id="drag-indicator"
              className="absolute left-0 right-0 flex items-center pointer-events-none hidden"
              style={{ zIndex: 20 }}
            >
              <div className="w-3 h-3 rounded-full bg-white -ml-1.5"></div>
              <div className="ml-4 px-2 py-1 rounded bg-white/20 text-xs">12:00</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* No profile edit sheet needed anymore - moved to ProfileSection component */}
      
      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-cyan-900/50 rounded-lg p-4 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Add New Event</h3>
              <button
                className="h-8 w-8 rounded-full hover:bg-gray-800 flex items-center justify-center"
                onClick={() => setShowAddModal(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Event Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {["water", "electrolyte", "protein", "exercise", "coffee", "food"].map((type) => {
                    const typeDetails = getEventTypeDetails(type);
                    return (
                      <button
                        key={type}
                        className={`p-2 rounded-lg flex flex-col items-center justify-center ${newEventType === type ? "bg-gray-800 ring-1" : "bg-gray-800/50 hover:bg-gray-800/80"}`}
                        style={{
                          color: typeDetails.color,
                          boxShadow: newEventType === type ? `0 0 0 1px ${typeDetails.color}` : "none",
                        }}
                        onClick={() => setNewEventType(type)}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center mb-1"
                          style={{ backgroundColor: `${typeDetails.color}30` }}
                        >
                          {typeDetails.icon}
                        </div>
                        <span className="text-xs">{typeDetails.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Time</label>
                <input
                  type="time"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Details (optional)</label>
                <input
                  type="text"
                  value={newEventDetails}
                  onChange={(e) => setNewEventDetails(e.target.value)}
                  placeholder="e.g. 250ml, 30 minutes, etc."
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <button 
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded-md"
                onClick={handleAddEvent}
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineView;

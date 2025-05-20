"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Droplet, Utensils, Activity, Info } from "lucide-react";
import VideoModal from './VideoModal';

// Initialize Supabase client
const supabaseUrl = "https://hmwrlhepsmyvqwkfleck.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhtd3JsaGVwc215dnF3a2ZsZWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMDExNDAsImV4cCI6MjA2MDc3NzE0MH0.oyMGM5NGU2mLFDYxwuzXxXXVeKojzhdcbRimgME3Ogc";
const supabase = createClient(supabaseUrl, supabaseKey);

// Input item interface
interface InputItem {
  id: string;
  name: string;
  category: string;
  description: string;
  color: string;
  water_ml?: number;
  duration_min?: number;
  tags?: string[] | string; // Could be a JSON string or already parsed array
}

interface HydrationDrawerProps {
  sessionId: string;
  userId: string;
  onLogHydration?: (amount: number, type: string) => void;
}

const HydrationDrawer: React.FC<HydrationDrawerProps> = ({ sessionId, userId, onLogHydration }) => {
  const [activeTab, setActiveTab] = useState<"drinks" | "foods" | "activities">("drinks");
  const [items, setItems] = useState<InputItem[]>([]);
  const [aiInsight, setAiInsight] = useState<string>("Your hydration looks good! No suggestions at this time.");
  const [videoModal, setVideoModal] = useState({
    isOpen: false,
    videoId: "",
    videoTag: ""
  });
  const [loading, setLoading] = useState(false);

  // Fetch items from the database
  useEffect(() => {
    fetchInputItems();
  }, [activeTab]);

  const fetchInputItems = async () => {
    try {
      let category = "drink";
      if (activeTab === "foods") category = "food";
      if (activeTab === "activities") category = "exercise";

      const { data, error } = await supabase
        .from("input_library")
        .select("*")
        .eq("category", category);

      if (error) {
        console.error("Error fetching items:", error);
        return;
      }

      if (data) {
        setItems(data as InputItem[]);
      }
    } catch (error) {
      console.error("Error in fetchInputItems:", error);
    }
  };

  // Handle item drag start
  const handleDragStart = (e: React.DragEvent, item: InputItem) => {
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    // Add styling to the drag image
    const dragImage = document.createElement("div");
    dragImage.innerHTML = `<div class="p-3 rounded-lg flex items-center" style="background-color: ${item.color}20; border: 2px solid ${item.color}; color: white; font-weight: bold;">${item.name}</div>`;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 15, 15);
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  };

  // Get color for category
  const getCategoryColor = (category: string): string => {
    switch (category) {
      case "drink":
      case "water":
        return "#00FFFF"; // Cyan
      case "electrolyte":
        return "#00AAFF"; // Blue
      case "food":
        return "#FFFF00"; // Yellow
      case "exercise":
        return "#FF5555"; // Red
      default:
        return "#FFFFFF"; // White
    }
  };

  // Get icon for item
  const getItemIcon = (item: InputItem) => {
    if (item.category === "drink" || item.category === "water" || item.category === "electrolyte") {
      return <Droplet className="h-4 w-4" style={{ color: getCategoryColor(item.category) }} />;
    } else if (item.category === "food") {
      return <Utensils className="h-4 w-4" style={{ color: getCategoryColor(item.category) }} />;
    } else if (item.category === "exercise") {
      return <Activity className="h-4 w-4" style={{ color: getCategoryColor(item.category) }} />;
    }
    return null;
  };

  // Parse tags for an item
  const getItemTags = (item: InputItem): string[] => {
    if (!item.tags) return [];
    
    if (Array.isArray(item.tags)) {
      return item.tags;
    }
    
    // If it's a JSON string, try to parse it
    if (typeof item.tags === 'string') {
      try {
        return JSON.parse(item.tags);
      } catch (e) {
        console.error("Error parsing tags JSON:", e);
        return [];
      }
    }
    
    return [];
  };

  // Open video modal
  const openVideoByTag = (item: InputItem) => {
    const tags = getItemTags(item);
    
    // Use first tag if available, otherwise use category
    const searchTag = tags.length > 0 ? tags[0] : item.category;
    
    setVideoModal({
      isOpen: true,
      videoId: "",
      videoTag: searchTag
    });
  };
  
  // Close video modal
  const closeVideoModal = () => {
    setVideoModal({
      ...videoModal,
      isOpen: false
    });
  };
  
  // Handle item selection
  const handleItemSelect = (item: InputItem) => {
    // If item has water content, log it
    if (item.water_ml && item.water_ml > 0) {
      if (onLogHydration) {
        onLogHydration(item.water_ml, item.name);
      } else {
        // Fallback direct logging if parent callback not provided
        logHydrationDirectly(item);
      }
    }
    
    // Show related video if available
    openVideoByTag(item);
  };
  
  // Directly log to database if no parent handler
  const logHydrationDirectly = async (item: InputItem) => {
    if (!sessionId || !userId) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('hydration_timeline')
        .insert([
          { 
            session_id: sessionId,
            user_id: userId,
            event_type: item.category,
            item_name: item.name,
            volume_ml: item.water_ml || 0,
            timestamp: new Date().toISOString()
          }
        ]);
      
      if (error) {
        console.error("Error logging hydration:", error);
      }
      
    } catch (error) {
      console.error("Error in logHydrationDirectly:", error);
    } finally {
      setLoading(false);
    }
  };

  // Sample data for when the database is empty
  const getSampleItems = (): InputItem[] => {
    if (activeTab === "drinks") {
      return [
        {
          id: "water-1",
          name: "Pure Water",
          category: "water",
          description: "Pure water is quickly absorbed into your bloodstream.",
          color: "#00FFFF",
          water_ml: 250
        },
        {
          id: "electrolyte-1",
          name: "Electrolyte Drink",
          category: "electrolyte",
          description: "Replenishes sodium and water, helping maintain fluid balance.",
          color: "#00AAFF",
          water_ml: 330
        },
        {
          id: "mineral-1",
          name: "Mineral Water",
          category: "water",
          description: "Natural minerals enhance hydration and cellular function.",
          color: "#55FFAA",
          water_ml: 250
        },
        {
          id: "coconut-1",
          name: "Coconut Water",
          category: "drink",
          description: "Nature's electrolyte drink, rich in potassium.",
          color: "#AAFFAA",
          water_ml: 330
        }
      ];
    } else if (activeTab === "foods") {
      return [
        {
          id: "miso-1",
          name: "Miso Broth",
          category: "food",
          description: "Adds sodium and umami compounds to your bloodstream.",
          color: "#FFAA00"
        },
        {
          id: "banana-1",
          name: "Banana",
          category: "food",
          description: "Adds potassium and glucose, primarily affecting your cells.",
          color: "#FFFF00"
        }
      ];
    } else {
      return [
        {
          id: "run-1",
          name: "Run 20 min",
          category: "exercise",
          description: "Exercise depletes electrolytes through sweat and increases metabolic activity.",
          color: "#FF5555",
          duration_min: 20
        }
      ];
    }
  };

  // Get displayed items (from database or sample data)
  const displayedItems = items.length > 0 ? items : getSampleItems();

  return (
    <div className="relative overflow-hidden rounded-lg" style={{
      background: "linear-gradient(135deg, rgba(127, 231, 255, 0.2), rgba(178, 238, 255, 0.4), rgba(102, 204, 255, 0.3))",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
    }}>
      {/* Header with title */}
      <div className="p-4 pb-2 flex justify-between items-center">
        <h3 className="text-white text-lg font-medium">Hydration Actions</h3>
        <button className="text-white/70 hover:text-white">
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
      
      {/* Tab navigation */}
      <div className="flex border-b border-white/20">
        <button
          className={`flex-1 py-2 text-center text-sm font-medium relative ${
            activeTab === "drinks" ? "text-cyan-400" : "text-white/60 hover:text-white/80"
          }`}
          onClick={() => setActiveTab("drinks")}
        >
          <span>Drinks</span>
          {activeTab === "drinks" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></div>
          )}
        </button>
        <button
          className={`flex-1 py-2 text-center text-sm font-medium relative ${
            activeTab === "foods" ? "text-cyan-400" : "text-white/60 hover:text-white/80"
          }`}
          onClick={() => setActiveTab("foods")}
        >
          <span>Foods</span>
          {activeTab === "foods" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></div>
          )}
        </button>
        <button
          className={`flex-1 py-2 text-center text-sm font-medium relative ${
            activeTab === "activities" ? "text-cyan-400" : "text-white/60 hover:text-white/80"
          }`}
          onClick={() => setActiveTab("activities")}
        >
          <span>Activities</span>
          {activeTab === "activities" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></div>
          )}
        </button>
      </div>
      
      {/* Item list */}
      <div className="items-container p-4 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
        {displayedItems.map((item) => {
          const tags = getItemTags(item);
          return (
            <div
              key={item.id}
              className="p-3 rounded-lg shadow-md relative border border-white/20 cursor-pointer hover:opacity-90 transition"
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onClick={() => handleItemSelect(item)}
              style={{
                background: `linear-gradient(135deg, ${item.color}30, ${item.color}20)`,
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="font-medium text-white">{item.name}</span>
                    {/* Display tags as chips if available */}
                    {tags.length > 0 && (
                      <div className="ml-2 flex gap-1 flex-wrap">
                        {tags.slice(0, 2).map((tag, index) => (
                          <span 
                            key={index} 
                            className="text-xs px-1.5 py-0.5 rounded-full bg-cyan-500/30 text-white"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-white/70 mt-1">{item.description}</p>
                </div>
                
                {/* Video play button */}
                <button
                  className="p-1.5 rounded-full bg-cyan-500/30 hover:bg-cyan-500/50 transition-colors flex-shrink-0 ml-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    openVideoByTag(item);
                  }}
                  title="Watch related video"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Insights */}
      <div className="p-3 pt-1">
        <div className="flex items-center text-xs text-white/70 mb-1">
          <Info className="h-3 w-3 mr-1" />
          <span>AI Insights</span>
        </div>
        <div className="p-3 rounded-lg bg-white/10 backdrop-blur-sm">
          <p className="text-xs text-center text-white/80">{aiInsight}</p>
        </div>
      </div>

      {/* Find Nearby button */}
      <div className="p-3 pt-1">
        <button className="w-full p-3 rounded-lg bg-white/10 backdrop-blur-sm text-cyan-400 text-xs flex items-center justify-center hover:bg-white/15 transition-colors">
          <Droplet className="h-3 w-3 mr-1" />
          Find Nearby Hydration Spots
        </button>
      </div>

      {/* Add the VideoModal component */}
      <VideoModal
        isOpen={videoModal.isOpen}
        onClose={closeVideoModal}
        videoId={videoModal.videoId}
        videoTag={videoModal.videoTag}
        autoPlay={true}
        onVideoEnd={closeVideoModal}
      />
    </div>
  );
};

export default HydrationDrawer;

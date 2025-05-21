"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { User, ChevronDown, ChevronUp, Weight, Ruler, Heart, Droplet, Edit2, Check } from "lucide-react";

// Initialize Supabase client
const supabaseUrl = "https://hmwrlhepsmyvqwkfleck.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhtd3JsaGVwc215dnF3a2ZsZWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMDExNDAsImV4cCI6MjA2MDc3NzE0MH0.oyMGM5NGU2mLFDYxwuzXxXXVeKojzhdcbRimgME3Ogc";
const supabase = createClient(supabaseUrl, supabaseKey);

// Profile type definition
interface ProfileData {
  id: string;
  email?: string;
  name?: string;
  sex?: string;
  weight_kg?: number;
  height_cm?: number;
  body_fat_pct?: number;
  body_type?: string;
  water_home_needed?: number;
  body_fat_method?: string;
}

interface ProfileSectionProps {
  userId: string;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ userId }) => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Fetch profile data from the profiles table
  const fetchProfileData = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }
      
      if (data) {
        setProfileData(data as ProfileData);
      }
    } catch (error) {
      console.error('Error in fetchProfileData:', error);
    }
  };

  // Update a profile field
  const updateProfileField = async (field: string, value: any) => {
    if (!userId || !profileData) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', userId);

      if (error) {
        console.error(`Error updating ${field}:`, error);
        return;
      }

      // Update local state
      setProfileData({
        ...profileData,
        [field]: value
      });

    } catch (error) {
      console.error('Error in updateProfileField:', error);
    }
  };

  // Load profile data on component mount
  useEffect(() => {
    fetchProfileData();
  }, [userId]);

  // Start editing a field
  const startEditing = (field: string) => {
    const currentValue = profileData?.[field as keyof ProfileData];
    setEditingField(field);
    setEditValue(currentValue?.toString() || "");
  };

  // Save the edited field
  const saveField = () => {
    if (!editingField) return;
    
    // Convert to appropriate type based on the field
    let typedValue: any = editValue;
    if (['weight_kg', 'height_cm', 'body_fat_pct', 'water_home_needed'].includes(editingField)) {
      typedValue = parseFloat(editValue);
      if (isNaN(typedValue)) return; // Don't save invalid numbers
    }
    
    updateProfileField(editingField, typedValue);
    setEditingField(null);
  };

  // Handle selection for preset values (like body type)
  const handlePresetSelection = (field: string, value: string) => {
    updateProfileField(field, value);
    setEditingField(null);
  };

  // Render the profile section
  return (
    <div className="mb-4 bg-gray-800/30 border border-gray-700/50 rounded-lg overflow-hidden">
      <div 
        className="p-3 flex justify-between items-center cursor-pointer" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <User className="h-5 w-5 mr-2 text-cyan-400" />
          <h3 className="font-medium">Your Profile</h3>
        </div>
        <button className="text-gray-400 hover:text-white">
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-3 pt-0 border-t border-gray-700/30">
          <div className="grid grid-cols-2 gap-2">
            {/* Weight */}
            <div className="flex items-center p-2 rounded-md hover:bg-gray-700/30">
              <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center mr-2">
                <Weight className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="flex-grow">
                <div className="text-xs text-gray-400">Weight</div>
                {editingField === 'weight_kg' ? (
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-16 bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-sm mr-1"
                      min="0"
                      step="0.1"
                    />
                    <span className="text-sm text-gray-400">kg</span>
                    <button 
                      className="ml-2 p-1 bg-cyan-800/50 rounded-full text-cyan-400"
                      onClick={saveField}
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="font-medium flex items-center">
                    <span>{profileData?.weight_kg ? `${profileData.weight_kg} kg` : 'Not set'}</span>
                    <button 
                      className="ml-2 p-1 hover:bg-gray-700 rounded-full"
                      onClick={() => startEditing('weight_kg')}
                    >
                      <Edit2 className="h-3 w-3 text-gray-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Height */}
            <div className="flex items-center p-2 rounded-md hover:bg-gray-700/30">
              <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center mr-2">
                <Ruler className="h-4 w-4 text-purple-400" />
              </div>
              <div className="flex-grow">
                <div className="text-xs text-gray-400">Height</div>
                {editingField === 'height_cm' ? (
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-16 bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-sm mr-1"
                      min="0"
                    />
                    <span className="text-sm text-gray-400">cm</span>
                    <button 
                      className="ml-2 p-1 bg-cyan-800/50 rounded-full text-cyan-400"
                      onClick={saveField}
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="font-medium flex items-center">
                    <span>{profileData?.height_cm ? `${profileData.height_cm} cm` : 'Not set'}</span>
                    <button 
                      className="ml-2 p-1 hover:bg-gray-700 rounded-full"
                      onClick={() => startEditing('height_cm')}
                    >
                      <Edit2 className="h-3 w-3 text-gray-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Body Type */}
            <div className="flex items-center p-2 rounded-md hover:bg-gray-700/30">
              <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center mr-2">
                <Heart className="h-4 w-4 text-pink-400" />
              </div>
              <div className="flex-grow">
                <div className="text-xs text-gray-400">Body Type</div>
                {editingField === 'body_type' ? (
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {['Ectomorph', 'Mesomorph', 'Endomorph'].map(type => (
                      <button
                        key={type}
                        className={`text-xs p-1 rounded ${profileData?.body_type === type ? 'bg-pink-900/50 text-pink-400' : 'bg-gray-800'}`}
                        onClick={() => handlePresetSelection('body_type', type)}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="font-medium flex items-center">
                    <span>{profileData?.body_type || 'Not set'}</span>
                    <button 
                      className="ml-2 p-1 hover:bg-gray-700 rounded-full"
                      onClick={() => startEditing('body_type')}
                    >
                      <Edit2 className="h-3 w-3 text-gray-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Daily Water Needed */}
            <div className="flex items-center p-2 rounded-md hover:bg-gray-700/30">
              <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center mr-2">
                <Droplet className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex-grow">
                <div className="text-xs text-gray-400">Daily Water Needed</div>
                {editingField === 'water_home_needed' ? (
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-16 bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-sm mr-1"
                      min="0"
                      step="50"
                    />
                    <span className="text-sm text-gray-400">ml</span>
                    <button 
                      className="ml-2 p-1 bg-cyan-800/50 rounded-full text-cyan-400"
                      onClick={saveField}
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="font-medium flex items-center">
                    <span>{profileData?.water_home_needed ? `${profileData.water_home_needed} ml` : 'Not set'}</span>
                    <button 
                      className="ml-2 p-1 hover:bg-gray-700 rounded-full"
                      onClick={() => startEditing('water_home_needed')}
                    >
                      <Edit2 className="h-3 w-3 text-gray-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSection;

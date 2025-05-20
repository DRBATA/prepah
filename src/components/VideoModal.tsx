"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { X } from "lucide-react";
import VideoPlayer from "./VideoPlayer";

// Initialize Supabase client
const supabaseUrl = "https://hmwrlhepsmyvqwkfleck.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhtd3JsaGVwc215dnF3a2ZsZWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMDExNDAsImV4cCI6MjA2MDc3NzE0MH0.oyMGM5NGU2mLFDYxwuzXxXXVeKojzhdcbRimgME3Ogc";
const supabase = createClient(supabaseUrl, supabaseKey);

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId?: string;
  videoUrl?: string;
  videoTag?: string;
  autoPlay?: boolean;
  showControls?: boolean;
  onVideoEnd?: () => void;
}

const VideoModal: React.FC<VideoModalProps> = ({
  isOpen,
  onClose,
  videoId,
  videoUrl,
  videoTag,
  autoPlay = true,
  showControls = true,
  onVideoEnd
}) => {
  const [selectedVideoId, setSelectedVideoId] = useState<string | undefined>(videoId);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | undefined>(videoUrl);

  // If a tag is provided, find a random video with that tag
  useEffect(() => {
    if (videoTag && !videoId && !videoUrl && isOpen) {
      findVideoByTag(videoTag);
    }
  }, [videoTag, videoId, videoUrl, isOpen]);

  // Reset state when props change
  useEffect(() => {
    setSelectedVideoId(videoId);
    setSelectedVideoUrl(videoUrl);
  }, [videoId, videoUrl]);

  // Find a video by tag
  const findVideoByTag = async (tag: string) => {
    try {
      // Split multiple tags if they're comma-separated
      const tagList = tag.split(',').map(t => t.trim());
      let query = supabase
        .from("videos")
        .select("*");
        
      // If we have multiple tags, check for videos that match ALL specified tags
      // This is more targeted than just looking for one of them
      if (tagList.length > 1) {
        // First check for videos that match BOTH tags (more specific match)
        // The ?& operator checks if the JSON array contains ALL elements
        let matchedVideos = [];
        
        // Try to find the perfect match first (both session type and character type)
        for (const t of tagList) {
          query = query.filter('tags', 'cs', `["${t}"]`);
        }
        const { data: perfectMatches } = await query;
        
        if (perfectMatches && perfectMatches.length > 0) {
          matchedVideos = perfectMatches;
        } else {
          // Fall back to any video that matches at least the first tag (session context)
          const { data: fallbackMatches } = await supabase
            .from("videos")
            .select("*")
            .filter('tags', 'cs', `["${tagList[0]}"]`);
            
          if (fallbackMatches && fallbackMatches.length > 0) {
            matchedVideos = fallbackMatches;
          }
        }
        
        if (matchedVideos.length > 0) {
          // Pick a random video from the matches
          const randomIndex = Math.floor(Math.random() * matchedVideos.length);
          setSelectedVideoId(matchedVideos[randomIndex].id);
        } else {
          console.log(`No videos found with tags: ${tagList.join(', ')}`);
        }
      } else {
        // Single tag search
        const { data } = await supabase
          .from("videos")
          .select("*")
          .filter('tags', 'cs', `["${tag}"]`);
          
        if (data && data.length > 0) {
          // Pick a random video from the results
          const randomIndex = Math.floor(Math.random() * data.length);
          setSelectedVideoId(data[randomIndex].id);
        } else {
          console.log(`No videos found with tag: ${tag}`);
        }
      }
    } catch (error) {
      console.error("Error in findVideoByTag:", error);
    }
  };

  // Handle video end
  const handleVideoEnd = () => {
    if (onVideoEnd) {
      onVideoEnd();
    }
  };

  // If modal is not open, don't render anything
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal content */}
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg bg-gradient-to-b from-blue-900/30 to-purple-900/30 border border-white/20 backdrop-blur-md shadow-xl">
        {/* Close button */}
        <button
          className="absolute top-4 right-4 z-20 bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors"
          onClick={onClose}
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Video player */}
        <div className="aspect-video w-full">
          <VideoPlayer
            videoId={selectedVideoId}
            videoUrl={selectedVideoUrl}
            autoPlay={autoPlay}
            showControls={showControls}
            onVideoEnd={handleVideoEnd}
            onClose={onClose}
            showTranscript={true}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
};

export default VideoModal;

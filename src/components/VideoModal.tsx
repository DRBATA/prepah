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

  // Find a video by tag - simplified for testing
  const findVideoByTag = async (tag: string) => {
    try {
      console.log(`Searching for videos with tag: ${tag}`);
      
      // Simplify search to just use a simple contains check
      const { data, error } = await supabase
        .from("videos")
        .select("*");
      
      if (error) {
        console.error("Error fetching videos:", error);
        return;
      }
      
      console.log(`Found ${data?.length || 0} total videos`);
      
      // Find videos that match our tag or contain it
      let matchingVideos = [];
      
      if (data && data.length > 0) {
        // First try: look for exact tag matches
        matchingVideos = data.filter(video => {
          const videoTags = video.tags || [];
          return videoTags.includes(tag);
        });
        
        console.log(`Found ${matchingVideos.length} videos with exact tag match`);
        
        // If no exact matches, try to find videos with any tag that contains our tag string
        if (matchingVideos.length === 0) {
          matchingVideos = data.filter(video => {
            const videoTags = video.tags || [];
            return videoTags.some((t: string) => t && t.includes(tag));
          });
          console.log(`Found ${matchingVideos.length} videos with partial tag match`);
        }
        
        // Still no matches? Just use the first video as fallback
        if (matchingVideos.length === 0) {
          matchingVideos = data.slice(0, 1);
          console.log(`No matching videos found. Using first video as fallback.`);
        }
        
        // Pick a random video from the matches
        const randomIndex = Math.floor(Math.random() * matchingVideos.length);
        const selectedVideo = matchingVideos[randomIndex];
        console.log(`Selected video: ${selectedVideo.title || 'Untitled'}`);
        
        setSelectedVideoId(selectedVideo.id);
      } else {
        console.log(`No videos found in the database`);
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

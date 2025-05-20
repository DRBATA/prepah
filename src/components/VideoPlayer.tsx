"use client";

import React, { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Play, Pause, Volume2, VolumeX, X, Maximize, Minimize } from "lucide-react";

// Initialize Supabase client
const supabaseUrl = "https://hmwrlhepsmyvqwkfleck.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhtd3JsaGVwc215dnF3a2ZsZWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMDExNDAsImV4cCI6MjA2MDc3NzE0MH0.oyMGM5NGU2mLFDYxwuzXxXXVeKojzhdcbRimgME3Ogc";
const supabase = createClient(supabaseUrl, supabaseKey);

interface VideoData {
  id: string;
  title: string;
  tags: string[];
  url: string;
  transcript?: string;
}

interface VideoPlayerProps {
  videoId?: string;
  videoUrl?: string;
  autoPlay?: boolean;
  onVideoEnd?: () => void;
  showControls?: boolean;
  showTranscript?: boolean;
  className?: string;
  isFullscreen?: boolean;
  onClose?: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoId,
  videoUrl,
  autoPlay = false,
  onVideoEnd,
  showControls = true,
  showTranscript = false,
  className = "",
  isFullscreen = false,
  onClose
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [fullscreen, setFullscreen] = useState(isFullscreen);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  // Fetch video data if videoId is provided
  useEffect(() => {
    if (videoId) {
      fetchVideoData(videoId);
    }
  }, [videoId]);

  // Handle autoplay
  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(error => {
        console.error("AutoPlay failed:", error);
        setIsPlaying(false);
      });
    }
  }, [autoPlay, videoUrl, videoData]);

  // Update state when direct props change
  useEffect(() => {
    setFullscreen(isFullscreen);
  }, [isFullscreen]);

  // Fetch video data from the database
  const fetchVideoData = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching video data:", error);
        return;
      }

      if (data) {
        // Parse tags from JSON if needed
        let tagArray: string[] = [];
        if (data.tags) {
          // If it's already parsed as an array, use it directly
          if (Array.isArray(data.tags)) {
            tagArray = data.tags;
          } 
          // If it's a JSON string, parse it
          else if (typeof data.tags === 'string') {
            try {
              tagArray = JSON.parse(data.tags);
            } catch (e) {
              console.error("Error parsing tags JSON:", e);
            }
          }
        }

        setVideoData({
          id: data.id,
          title: data.title,
          tags: tagArray,
          url: data.url,
          transcript: data.transcript
        });
      }
    } catch (error) {
      console.error("Error in fetchVideoData:", error);
    }
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(error => {
          console.error("Play failed:", error);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Handle video progress
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      setCurrentTime(currentTime);
      setProgress((currentTime / duration) * 100);
    }
  };

  // Handle video metadata loaded
  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Handle video ended
  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (onVideoEnd) {
      onVideoEnd();
    }
  };

  // Handle seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const seekTime = (Number(e.target.value) / 100) * videoRef.current.duration;
      videoRef.current.currentTime = seekTime;
      setProgress(Number(e.target.value));
      setCurrentTime(seekTime);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  // Determine video source
  const videoSource = videoData?.url || videoUrl || "";

  // Handle close button click
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div
      ref={playerRef}
      className={`video-player ${fullscreen ? "fixed inset-0 z-50 bg-black" : ""} ${className}`}
    >
      <div className="relative w-full h-full">
        {/* Video */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          src={videoSource.startsWith("http") ? videoSource : `/${videoSource}`}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleMetadataLoaded}
          onEnded={handleVideoEnded}
          playsInline
          loop={false}
          muted={isMuted}
        />

        {/* Close button (when fullscreen or provided) */}
        {(fullscreen || onClose) && (
          <button
            className="absolute top-4 right-4 z-10 bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors"
            onClick={handleClose}
          >
            <X className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Video controls */}
        {showControls && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm p-2 flex flex-col">
            {/* Progress bar */}
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              className="w-full h-1 bg-gray-500 appearance-none rounded-full cursor-pointer"
              onChange={handleSeek}
              style={{
                background: `linear-gradient(to right, #00FFFF ${progress}%, rgba(255, 255, 255, 0.3) ${progress}%)`,
              }}
            />

            <div className="flex items-center justify-between mt-2">
              {/* Left controls */}
              <div className="flex items-center space-x-2">
                <button
                  className="p-1 rounded-full hover:bg-white/20 transition-colors"
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white" />
                  )}
                </button>

                <button
                  className="p-1 rounded-full hover:bg-white/20 transition-colors"
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>

                <span className="text-white text-xs">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Right controls */}
              <div className="flex items-center space-x-2">
                {videoData?.title && (
                  <span className="text-white text-xs font-medium">{videoData.title}</span>
                )}

                <button
                  className="p-1 rounded-full hover:bg-white/20 transition-colors"
                  onClick={toggleFullscreen}
                >
                  {fullscreen ? (
                    <Minimize className="w-5 h-5 text-white" />
                  ) : (
                    <Maximize className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transcript (only shown if enabled and available) */}
      {showTranscript && videoData?.transcript && (
        <div className="mt-3 p-3 bg-gray-900/50 border border-gray-700 rounded-md max-h-32 overflow-y-auto">
          <h4 className="text-sm font-medium text-white/80 mb-1">Transcript</h4>
          <p className="text-xs text-white/70">{videoData.transcript}</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;

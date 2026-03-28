-- Add youtube_thumbnail column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS youtube_thumbnail TEXT;

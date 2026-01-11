/*
  # Enable Storage RLS for Voice Notes

  ## Changes
  
  ### 1. Storage Policies for voice-notes Bucket
  - Allow authenticated users to upload voice notes
  - Allow anonymous (guest) users to upload voice notes
  - Allow public read access to voice notes
  
  ## Security
  - Anyone can upload voice notes (required for guest checkout)
  - Voice notes are publicly readable (required for restaurant to hear delivery instructions)
  - File names are timestamped to prevent collisions
*/

-- Allow authenticated users to upload voice notes
CREATE POLICY "Authenticated users can upload voice notes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'voice-notes');

-- Allow anonymous users to upload voice notes (for guest checkout)
CREATE POLICY "Anonymous users can upload voice notes"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'voice-notes');

-- Allow public read access to voice notes
CREATE POLICY "Public can read voice notes"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'voice-notes');
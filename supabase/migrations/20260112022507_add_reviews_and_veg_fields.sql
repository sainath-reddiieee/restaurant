/*
  # Add Reviews System and Veg/Non-Veg Fields

  ## New Tables
  
  ### reviews
  - `id` (uuid, primary key)
  - `restaurant_id` (uuid, references restaurants)
  - `customer_id` (uuid, references profiles)
  - `order_id` (uuid, references orders, nullable)
  - `rating` (integer, 1-5)
  - `review_text` (text, nullable)
  - `created_at` (timestamptz)

  ## Modified Tables
  
  ### menu_items
  - Add `is_veg` (boolean) - true for vegetarian, false for non-vegetarian
  
  ### restaurants
  - Add `rating_avg` (numeric) - average rating
  - Add `rating_count` (integer) - total number of reviews

  ## Security
  - Enable RLS on reviews table
  - Customers can create reviews after completing orders
  - Anyone can read reviews for public restaurants
  - Only the review author can update/delete their own reviews
*/

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamptz DEFAULT now()
);

-- Add rating fields to restaurants
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS rating_avg numeric(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_count integer DEFAULT 0;

-- Add is_veg field to menu_items
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS is_veg boolean DEFAULT true;

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = customer_id);

-- Function to update restaurant rating averages
CREATE OR REPLACE FUNCTION update_restaurant_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Recalculate average and count for the restaurant
  UPDATE restaurants
  SET 
    rating_avg = (SELECT AVG(rating)::numeric(3,2) FROM reviews WHERE restaurant_id = NEW.restaurant_id),
    rating_count = (SELECT COUNT(*) FROM reviews WHERE restaurant_id = NEW.restaurant_id)
  WHERE id = NEW.restaurant_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to update ratings after insert/update/delete
DROP TRIGGER IF EXISTS update_restaurant_rating_trigger ON reviews;
CREATE TRIGGER update_restaurant_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_restaurant_rating();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_veg ON menu_items(is_veg);
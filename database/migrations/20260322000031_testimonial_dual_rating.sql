-- Testimonial dual rating: separate food vs chef ratings
-- The original 'rating' column becomes the overall/legacy rating.
-- New columns let guests rate the food and the chef independently.

ALTER TABLE guest_testimonials ADD COLUMN IF NOT EXISTS food_rating INTEGER CHECK (food_rating >= 1 AND food_rating <= 5);
ALTER TABLE guest_testimonials ADD COLUMN IF NOT EXISTS chef_rating INTEGER CHECK (chef_rating >= 1 AND chef_rating <= 5);
ALTER TABLE guest_testimonials ADD COLUMN IF NOT EXISTS food_highlight TEXT CHECK (char_length(food_highlight) <= 200);
ALTER TABLE guest_testimonials ADD COLUMN IF NOT EXISTS would_recommend BOOLEAN;

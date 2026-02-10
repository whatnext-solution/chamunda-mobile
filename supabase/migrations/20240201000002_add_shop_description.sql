-- Add shop_description column to website_settings table
ALTER TABLE public.website_settings 
ADD COLUMN IF NOT EXISTS shop_description TEXT;

-- Update existing records with default description
UPDATE public.website_settings 
SET shop_description = 'Your one-stop shop for the latest electronics and gadgets. Quality products, competitive prices, exceptional service.'
WHERE shop_description IS NULL OR shop_description = '';
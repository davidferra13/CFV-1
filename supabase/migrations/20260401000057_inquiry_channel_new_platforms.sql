-- Add new inquiry channels for PrivateChefManager, HireAChef, and CuisineistChef platforms
-- These are marketplace platforms where private chefs receive inquiries.
-- Parser skeletons have been created; regex will be tuned with real email samples.

ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'privatechefmanager';
ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'hireachef';
ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'cuisineistchef';

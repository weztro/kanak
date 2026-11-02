-- ====================================================================
-- KANAK DATABASE SEED MIGRATION: 003 - DEFAULT SYSTEM CATEGORIES
-- Seeds the 12 core item categories with icons and sort orders
-- ====================================================================

INSERT INTO public.categories (name, description, icon, sort_order, is_system)
VALUES
    ('Rice and Grains', 'Rice, wheat, lentils, dal, flour, and cereals', 'wheat', 1, TRUE),
    ('Vegetables', 'Fresh seasonal and daily vegetables', 'carrot', 2, TRUE),
    ('Fruits', 'Fresh fruits and seasonal produce', 'apple', 3, TRUE),
    ('Dairy', 'Milk, curd, paneer, butter, cheese, and ghee', 'milk', 4, TRUE),
    ('Meat and Eggs', 'Chicken, mutton, fish, and eggs', 'egg', 5, TRUE),
    ('Cooking Essentials', 'Cooking oil, salt, sugar, vinegar, and sauces', 'flame', 6, TRUE),
    ('Masala and Spices', 'Turmeric, chilli, cumin, garam masala, and whole spices', 'sparkles', 7, TRUE),
    ('Beverages', 'Tea, coffee, health drinks, juices, and soft drinks', 'coffee', 8, TRUE),
    ('Cleaning Supplies', 'Detergent, dishwash soap, floor cleaner, sponges, and garbage bags', 'sparkle', 9, TRUE),
    ('Personal Essentials', 'Soaps, shampoos, toothpaste, toiletries, and tissue rolls', 'user-check', 10, TRUE),
    ('Kitchen Supplies', 'Foil, matchboxes, gas lighter, scrubber, and napkins', 'utensils', 11, TRUE),
    ('Others', 'Miscellaneous shared accommodation supplies', 'package', 12, TRUE)
ON CONFLICT DO NOTHING;


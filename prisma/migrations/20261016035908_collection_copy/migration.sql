-- Hand-written data change: the collections_and_categories migration seeded
-- descriptions that call the products handmade. Cannan curates pieces from
-- other makers, so replace them, and rename Orisha to Orishas.
--
-- Each UPDATE matches the original text, so a description or name already
-- edited by hand is left alone. Slugs are unchanged.

UPDATE "Collection"
SET "description" = 'Our founding collection, rooted in Catholic devotion: the saints, la Virgen, and the images that have watched over homes for generations.',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'signature' AND "description" = 'Our signature handmade collection.';

UPDATE "Collection"
SET "description" = 'Pieces honoring the Orishas and the traditions that have carried their devotion across the Americas.',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'orisha' AND "description" = 'Handmade goods honoring the Orisha.';

UPDATE "Collection"
SET "name" = 'Orishas',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'orisha' AND "name" = 'Orisha';

UPDATE "Collection"
SET "description" = 'Pieces for the devotees of La Santa Muerte, La Niña Blanca, offered with the same care as everything we carry.',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'santa-muerte' AND "description" = 'Handmade goods devoted to Santa Muerte.';

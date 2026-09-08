CREATE TABLE radio_catalog_terms (
  generation_id uuid NOT NULL REFERENCES radio_catalog_generations(id) ON DELETE CASCADE,
  term text NOT NULL,
  PRIMARY KEY(generation_id, term)
);
CREATE INDEX radio_catalog_term_idx ON radio_catalog_terms USING gin(term gin_trgm_ops);
ALTER TABLE radio_catalog_terms ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
INSERT INTO radio_catalog_terms(generation_id, term)
SELECT DISTINCT generation_id, term
FROM radio_catalog_entries, unnest(string_to_array(search_text, ' ')) AS term
WHERE length(term) BETWEEN 1 AND 120
ON CONFLICT DO NOTHING;

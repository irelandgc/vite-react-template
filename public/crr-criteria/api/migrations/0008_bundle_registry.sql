-- ARCH-MIG-01 slice 2 — bundle registry.
--
-- bundles: one row per published bundle version (immutable once published;
-- state machine transcribed -> signed-off -> published per AD-10). exam_site
-- here is the BUNDLE KEY (38 keys, AD-01), not the published exam/site id.
--
-- exam_sites: the AD-01 mapping. 53 published exam/site ids, each mapped onto
-- exactly one of the 38 bundle keys (limb sections are split by joint in the
-- published data but share one PDF section / one bundle). Seeded from the
-- live published exam/site list (2026-09-05) and the page map in
-- tooling/criteria-bundle/vocabulary/transcription-notes.md finding F-09.
-- Only ct_cap is `live` — CT CAP is the only bundle that exists.

CREATE TABLE IF NOT EXISTS bundles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_site TEXT NOT NULL,          -- bundle key, e.g. 'ct-chest-abdomen-pelvis-adult'
  version TEXT NOT NULL,            -- semver, AD-02
  state TEXT NOT NULL DEFAULT 'transcribed', -- 'transcribed' | 'signed-off' | 'published'
  logic_hash TEXT NOT NULL,         -- sha256:... of the compiled ELM (site + population)
  vocabulary_version TEXT NOT NULL,
  source_type TEXT NOT NULL,        -- 'pdf' | 'approved-draft' (AD-08)
  signoff_ref TEXT,                 -- path to signoff.md once transcribed -> signed-off
  published_by TEXT,
  published_at TEXT,
  test_summary TEXT,                -- JSON: last run-tests result summary
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(exam_site, version)
);

CREATE INDEX IF NOT EXISTS idx_bundles_exam_site ON bundles(exam_site);
CREATE INDEX IF NOT EXISTS idx_bundles_state ON bundles(state);

CREATE TABLE IF NOT EXISTS exam_sites (
  id TEXT PRIMARY KEY,              -- published exam/site id, e.g. 'xr_elbow'
  title TEXT NOT NULL,
  bundle_key TEXT NOT NULL,         -- resolves into bundles.exam_site
  live INTEGER NOT NULL DEFAULT 0   -- 1 once the bundle_key has a published bundle the engine uses
);

CREATE INDEX IF NOT EXISTS idx_exam_sites_bundle_key ON exam_sites(bundle_key);

INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('ct_cap', 'CT — Chest/Abdomen/Pelvis', 'ct-chest-abdomen-pelvis-adult', 1);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('ct_chest', 'CT — Chest', 'ct-chest-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('ct_colonography', 'CT — Colonography (CTC)', 'ct-colonography-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('ct_head', 'CT — Head', 'ct-head-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('ct_ivu', 'CT — IVU / CT Renal', 'ct-ivu-renal-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('ct_kub', 'CT — KUB', 'ct-kub-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('ct_other', 'CT — Other', 'ct-other-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('ct_sinus', 'CT — Sinus', 'ct-sinus-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('us_abdomen', 'Ultrasound — Abdomen', 'us-abdomen-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('us_carotid', 'Ultrasound — Carotid', 'us-carotid-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('us_dvt', 'Ultrasound — DVT', 'us-dvt-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('us_fna_biopsy', 'Ultrasound — Guided FNA / Core Biopsy', 'us-fna-biopsy-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('us_msk', 'Ultrasound — Musculoskeletal (incl. Shoulder)', 'us-musculoskeletal-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('us_neck_thyroid', 'Ultrasound — Neck / Thyroid', 'us-neck-thyroid-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('us_pelvis', 'Ultrasound — Pelvis', 'us-pelvis-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('us_renal', 'Ultrasound — Renal', 'us-renal-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('us_scrotum', 'Ultrasound — Scrotum / Testis', 'us-scrotum-testis-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('us_soft_tissue', 'Ultrasound — Soft Tissue', 'us-soft-tissue-mass-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_abdomen', 'X-ray — Abdomen', 'xray-abdomen-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_chest', 'X-ray — Chest', 'xray-chest-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_shoulder', 'X-ray — Shoulder', 'xray-shoulder-upper-limb-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_humerus', 'X-ray — Humerus', 'xray-shoulder-upper-limb-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_elbow', 'X-ray — Elbow', 'xray-shoulder-upper-limb-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_forearm', 'X-ray — Forearm', 'xray-shoulder-upper-limb-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_wrist_hand', 'X-ray — Wrist / Hand', 'xray-shoulder-upper-limb-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_pelvis_hip', 'X-ray — Pelvis / Hip', 'xray-pelvis-hip-lower-limb-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_femur', 'X-ray — Femur', 'xray-pelvis-hip-lower-limb-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_knee', 'X-ray — Knee', 'xray-pelvis-hip-lower-limb-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_tibia_fibula', 'X-ray — Tibia / Fibula', 'xray-pelvis-hip-lower-limb-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_ankle_foot', 'X-ray — Ankle / Foot', 'xray-pelvis-hip-lower-limb-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_spine', 'X-ray — Spine', 'xray-spine-adult', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('ct_head_paed', 'CT — Head (Paediatric)', 'ct-head-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('us_abdomen_paed', 'Ultrasound — Abdomen (Paediatric)', 'us-abdomen-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('us_hip_paed', 'Ultrasound — Hip (DDH) (Paediatric)', 'us-hip-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('us_neck_thyroid_paed', 'Ultrasound — Neck / Thyroid (Paediatric)', 'us-neck-thyroid-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('us_pelvis_paed', 'Ultrasound — Pelvis (Paediatric)', 'us-pelvis-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('us_renal_paed', 'Ultrasound — Renal (Paediatric)', 'us-renal-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('us_scrotum_paed', 'Ultrasound — Scrotum / Testis (Paediatric)', 'us-scrotum-testis-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('us_soft_tissue_paed', 'Ultrasound — Soft Tissue (Paediatric)', 'us-soft-tissue-mass-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('us_spine_paed', 'Ultrasound — Spine (Paediatric)', 'us-spine-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_abdomen_paed', 'X-ray — Abdomen (Paediatric)', 'xray-abdomen-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_chest_paed', 'X-ray — Chest (Paediatric)', 'xray-chest-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_shoulder_paed', 'X-ray — Shoulder (Paediatric)', 'xray-shoulder-upper-limb-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_humerus_paed', 'X-ray — Humerus (Paediatric)', 'xray-shoulder-upper-limb-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_elbow_paed', 'X-ray — Elbow (Paediatric)', 'xray-shoulder-upper-limb-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_forearm_paed', 'X-ray — Forearm (Paediatric)', 'xray-shoulder-upper-limb-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_wrist_hand_paed', 'X-ray — Wrist / Hand (Paediatric)', 'xray-shoulder-upper-limb-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_femur_paed', 'X-ray — Femur (Paediatric)', 'xray-lower-limb-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_knee_paed', 'X-ray — Knee (Paediatric)', 'xray-lower-limb-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_tibia_fibula_paed', 'X-ray — Tibia / Fibula (Paediatric)', 'xray-lower-limb-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_feet_paed', 'X-ray — Feet (Paediatric)', 'xray-lower-limb-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_pelvis_hip_paed', 'X-ray — Pelvis / Hip (Paediatric)', 'xray-pelvis-hip-paediatric', 0);
INSERT INTO exam_sites (id, title, bundle_key, live) VALUES ('xr_spine_paed', 'X-ray — Spine (Paediatric)', 'xray-spine-paediatric', 0);

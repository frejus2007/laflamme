-- Script SQL pour créer ou mettre à jour les tables dans Supabase --
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase --

-- 1. Table des Saisons
CREATE TABLE IF NOT EXISTS saisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    est_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Table des Joueurs
CREATE TABLE IF NOT EXISTS joueurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp TEXT UNIQUE NOT NULL, -- On l'utilise comme identifiant de connexion
    pseudo TEXT UNIQUE NOT NULL, -- ex: ƑL丨Ghost
    mot_de_passe TEXT NOT NULL,
    prenom TEXT NOT NULL,
    specialite TEXT NOT NULL CHECK (specialite IN ('MJ', 'BR')),
    avatar TEXT NOT NULL,
    grade TEXT DEFAULT 'Recrue',
    points INTEGER DEFAULT 0,
    kills INTEGER DEFAULT 0,
    record_kills INTEGER DEFAULT 0,
    record_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Table des Matchs
CREATE TABLE IF NOT EXISTS matchs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    joueur_id UUID REFERENCES joueurs(id) ON DELETE CASCADE,
    saison_id UUID REFERENCES saisons(id) ON DELETE SET NULL,
    mode TEXT NOT NULL CHECK (mode IN ('MJ', 'BR')),
    rang INTEGER NOT NULL,
    kills INTEGER DEFAULT 0,
    est_victoire BOOLEAN, -- Valable que pour MJ
    joueurs_br_total INTEGER, -- Valable que pour BR
    est_mvp BOOLEAN DEFAULT false,
    bonus_admin INTEGER DEFAULT 0,
    points_gagnes INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Table des Admins
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifiant TEXT UNIQUE NOT NULL,
    mot_de_passe TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Table des Tournois
CREATE TABLE IF NOT EXISTS tournois (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    mode TEXT NOT NULL,
    date_tournoi DATE NOT NULL,
    statut TEXT DEFAULT 'Ouvert', -- 'Ouvert', 'En Cours', 'Terminé'
    description TEXT,
    recompense TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Setup initial
-- Activer la RLS (Row Level Security) - pour le moment, on l'assouplit pour faciliter l'intégration car on est pas sur de l'auth Supabase stricte
ALTER TABLE joueurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournois ENABLE ROW LEVEL SECURITY;

-- Autoriser la lecture publique (si on ne gère pas les JWT strictes de Supabase Auth pour l'instant et on utilise l'API standard anonyme)
CREATE POLICY "Lecture publique des joueurs" ON joueurs FOR SELECT USING (true);
CREATE POLICY "Insertion publique joueurs" ON joueurs FOR INSERT WITH CHECK (true);
CREATE POLICY "Modification publique joueurs" ON joueurs FOR UPDATE USING (true);
CREATE POLICY "Suppression publique joueurs" ON joueurs FOR DELETE USING (true);

CREATE POLICY "Lecture publique matchs" ON matchs FOR SELECT USING (true);
CREATE POLICY "Insertion publique matchs" ON matchs FOR INSERT WITH CHECK (true);

CREATE POLICY "Lecture publique saisons" ON saisons FOR SELECT USING (true);
CREATE POLICY "Insertion publique saisons" ON saisons FOR INSERT WITH CHECK (true);
CREATE POLICY "Modification publique saisons" ON saisons FOR UPDATE USING (true);

CREATE POLICY "Lecture publique admins" ON admins FOR SELECT USING (true);

CREATE POLICY "Lecture publique tournois" ON tournois FOR SELECT USING (true);
CREATE POLICY "Insertion publique tournois" ON tournois FOR INSERT WITH CHECK (true);

-- Insert une fausse saison pour démarrer
INSERT INTO saisons (id, nom, date_debut, date_fin, est_active) VALUES ('c8e10419-f55a-46da-b7a4-31ea6737f000', 'Saison 1 - L''Éveil', '2026-01-16', '2026-03-16', true) ON CONFLICT DO NOTHING;

-- Insert default admin
INSERT INTO admins (identifiant, mot_de_passe) VALUES ('admin', 'flamme2026') ON CONFLICT DO NOTHING;

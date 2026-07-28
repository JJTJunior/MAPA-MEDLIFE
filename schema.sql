-- SQL Script para inicializar a tabela de cirurgias no Supabase SQL Editor

-- 1. Remover tabela se já existir (cuidado em ambiente de produção!)
-- DROP TABLE IF EXISTS surgeries;

-- 2. Criar a tabela surgeries
CREATE TABLE surgeries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_name TEXT,
    status_color TEXT,
    date DATE,
    time TEXT,
    doctor TEXT,
    hospital TEXT,
    patient TEXT,
    insurance TEXT,
    material_procedure TEXT,
    status TEXT,
    observation TEXT,
    surgery_code TEXT,
    delivery_status TEXT,
    opme_checked BOOLEAN DEFAULT false,
    cme_checked BOOLEAN DEFAULT false,
    bloco_checked BOOLEAN DEFAULT false,
    pos_checked BOOLEAN DEFAULT false,
    instrumentalist TEXT,
    salesperson TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Criar índices para otimização de buscas e filtros paginados (essencial para mais de 8.000 linhas)
CREATE INDEX idx_surgeries_date ON surgeries (date DESC);
CREATE INDEX idx_surgeries_doctor ON surgeries (doctor);
CREATE INDEX idx_surgeries_hospital ON surgeries (hospital);
CREATE INDEX idx_surgeries_patient ON surgeries (patient);
CREATE INDEX idx_surgeries_salesperson ON surgeries (salesperson);
CREATE INDEX idx_surgeries_sheet_name ON surgeries (sheet_name);
CREATE INDEX idx_surgeries_status ON surgeries (status);

-- 4. Habilitar o Row Level Security (RLS) para segurança opcional
-- ALTER TABLE surgeries ENABLE ROW LEVEL SECURITY;

-- Exemplo de política de leitura pública temporária (se necessário)
-- CREATE POLICY "Permitir leitura pública" ON surgeries FOR SELECT USING (true);

-- Exemplo de política de escrita autenticada
-- CREATE POLICY "Permitir escrita de usuários autenticados" ON surgeries FOR ALL TO authenticated USING (true);

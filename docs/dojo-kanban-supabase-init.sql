-- ============================================================
-- dojo-kanban-supabase-init.sql
-- Script de inicialización para el proyecto personal Supabase
-- del usuario (modelo BYOS — Bring Your Own Supabase).
--
-- Instrucciones:
--   1. Abre tu proyecto en https://supabase.com/dashboard
--   2. Ve a "SQL Editor" → "New query"
--   3. Pega este script completo y ejecuta con "Run"
--
-- Qué crea:
--   - 7 tablas con claves foráneas y restricciones
--   - Row-Level Security (RLS) en todas las tablas
--   - Políticas RLS que aíslan datos por usuario autenticado
--   - Triggers para actualizar `updated_at` automáticamente
--   - Índices para consultas frecuentes
--
-- Versión: 1.0 — US-42 Supabase BYOS
-- ============================================================

-- ── Extensiones ─────────────────────────────────────────────
-- uuid-ossp ya está disponible en todos los proyectos Supabase.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Función helper: actualizar updated_at automáticamente ───
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLA: boards
-- ============================================================
CREATE TABLE IF NOT EXISTS public.boards (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL CHECK (char_length(name) <= 60),
  description TEXT        DEFAULT '',
  icon        TEXT        DEFAULT '📋',
  color       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boards: solo el propietario puede leer"
  ON public.boards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "boards: solo el propietario puede insertar"
  ON public.boards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "boards: solo el propietario puede actualizar"
  ON public.boards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "boards: solo el propietario puede eliminar"
  ON public.boards FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER set_boards_updated_at
  BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TABLA: projects
-- ============================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL CHECK (char_length(name) <= 60),
  prefix      TEXT        NOT NULL CHECK (char_length(prefix) <= 6),
  description TEXT        DEFAULT '',
  color       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, prefix)
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects: solo el propietario puede leer"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "projects: solo el propietario puede insertar"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects: solo el propietario puede actualizar"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "projects: solo el propietario puede eliminar"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TABLA: columns
-- ============================================================
CREATE TABLE IF NOT EXISTS public.columns (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  board_id    UUID        NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL CHECK (char_length(name) <= 50),
  icon        TEXT        DEFAULT '📋',
  "order"     INTEGER     NOT NULL DEFAULT 0,
  color       TEXT,
  is_default  BOOLEAN     DEFAULT FALSE,
  wip_limit   INTEGER     CHECK (wip_limit IS NULL OR wip_limit > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS columns_board_id_idx ON public.columns(board_id);

ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "columns: solo el propietario puede leer"
  ON public.columns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "columns: solo el propietario puede insertar"
  ON public.columns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "columns: solo el propietario puede actualizar"
  ON public.columns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "columns: solo el propietario puede eliminar"
  ON public.columns FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER set_columns_updated_at
  BEFORE UPDATE ON public.columns
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TABLA: labels
-- ============================================================
CREATE TABLE IF NOT EXISTS public.labels (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL CHECK (char_length(name) <= 40),
  color      TEXT        NOT NULL DEFAULT '#6366f1',
  text_color TEXT        NOT NULL DEFAULT '#ffffff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "labels: solo el propietario puede leer"
  ON public.labels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "labels: solo el propietario puede insertar"
  ON public.labels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "labels: solo el propietario puede actualizar"
  ON public.labels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "labels: solo el propietario puede eliminar"
  ON public.labels FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER set_labels_updated_at
  BEFORE UPDATE ON public.labels
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TABLA: persons
-- ============================================================
CREATE TABLE IF NOT EXISTS public.persons (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL CHECK (char_length(name) <= 80),
  email      TEXT,
  avatar_url TEXT,
  color      TEXT        DEFAULT '#6366f1',
  initials   TEXT        CHECK (char_length(initials) <= 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "persons: solo el propietario puede leer"
  ON public.persons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "persons: solo el propietario puede insertar"
  ON public.persons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "persons: solo el propietario puede actualizar"
  ON public.persons FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "persons: solo el propietario puede eliminar"
  ON public.persons FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER set_persons_updated_at
  BEFORE UPDATE ON public.persons
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TABLA: tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  board_id     UUID        NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  project_id   UUID        REFERENCES public.projects(id) ON DELETE SET NULL,
  status_id    UUID        NOT NULL REFERENCES public.columns(id) ON DELETE RESTRICT,
  task_number  TEXT        NOT NULL DEFAULT '',
  title        TEXT        NOT NULL CHECK (char_length(title) <= 120),
  description  TEXT        DEFAULT '',
  priority     TEXT        NOT NULL DEFAULT 'medium'
                           CHECK (priority IN ('low','medium','high','urgent')),
  due_date     TIMESTAMPTZ,
  notifications BOOLEAN    DEFAULT FALSE,
  label_ids    UUID[]      NOT NULL DEFAULT '{}',
  assignees    UUID[]      NOT NULL DEFAULT '{}',
  subtasks     JSONB       NOT NULL DEFAULT '[]',
  "order"      INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_board_id_idx    ON public.tasks(board_id);
CREATE INDEX IF NOT EXISTS tasks_status_id_idx   ON public.tasks(status_id);
CREATE INDEX IF NOT EXISTS tasks_priority_idx    ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx    ON public.tasks(due_date) WHERE due_date IS NOT NULL;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks: solo el propietario puede leer"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tasks: solo el propietario puede insertar"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks: solo el propietario puede actualizar"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "tasks: solo el propietario puede eliminar"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TABLA: task_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_templates (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL CHECK (char_length(name) <= 80),
  description TEXT        DEFAULT '',
  priority    TEXT        NOT NULL DEFAULT 'medium'
                          CHECK (priority IN ('low','medium','high','urgent')),
  label_ids   UUID[]      NOT NULL DEFAULT '{}',
  subtasks    JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_templates: solo el propietario puede leer"
  ON public.task_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "task_templates: solo el propietario puede insertar"
  ON public.task_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "task_templates: solo el propietario puede actualizar"
  ON public.task_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "task_templates: solo el propietario puede eliminar"
  ON public.task_templates FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER set_task_templates_updated_at
  BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TABLA: activity_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_log (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id    UUID        REFERENCES public.tasks(id) ON DELETE CASCADE,
  action     TEXT        NOT NULL,
  entity     TEXT        NOT NULL DEFAULT 'task',
  payload    JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_log_task_id_idx ON public.activity_log(task_id);
CREATE INDEX IF NOT EXISTS activity_log_user_id_idx ON public.activity_log(user_id);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log: solo el propietario puede leer"
  ON public.activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "activity_log: solo el propietario puede insertar"
  ON public.activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "activity_log: solo el propietario puede eliminar"
  ON public.activity_log FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER set_activity_log_updated_at
  BEFORE UPDATE ON public.activity_log
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- Habilitar Realtime para las tablas principales
-- (Ejecutar en el SQL Editor de Supabase)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.boards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.columns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.labels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.persons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
-- Verifica que las tablas se crearon correctamente con:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--   ORDER BY table_name;

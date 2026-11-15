-- Migracion 003: fecha requerida en solicitudes y marquilla por prenda.
-- Solo agrega dos columnas opcionales. No borra ni cambia datos existentes.
-- Las solicitudes viejas quedan con fecha_requerida vacia y con_marquilla en 0 (no).
-- Se ejecuta UNA sola vez.
USE confexpress;

ALTER TABLE solicitudes
    ADD COLUMN fecha_requerida DATE NULL AFTER observaciones;

ALTER TABLE detalles_solicitud
    ADD COLUMN con_marquilla BOOLEAN NOT NULL DEFAULT FALSE AFTER especificaciones;
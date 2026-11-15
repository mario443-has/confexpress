-- Migracion 004: configuracion del negocio (precio de la marquilla) y marca de precio aproximado en productos.
-- Crea una tabla nueva y agrega una columna a productos. No borra ni cambia datos existentes.
-- Todos los productos quedan con precio_aproximado = 1 (se siguen mostrando como "aprox." hasta que el administrador los cambie).
-- Se ejecuta UNA sola vez.
USE confexpress;

CREATE TABLE IF NOT EXISTS configuracion (
    clave VARCHAR(60) NOT NULL PRIMARY KEY,
    valor VARCHAR(255) NOT NULL,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO configuracion (clave, valor) VALUES ('precio_marquilla', '3000');

ALTER TABLE productos
    ADD COLUMN precio_aproximado BOOLEAN NOT NULL DEFAULT TRUE;
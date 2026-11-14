-- Migración 002: colegios, prendas por colegio y tallas con precio.
-- Crea tablas nuevas y agrega columnas a productos. No borra ni cambia datos existentes.
-- Se ejecuta UNA sola vez.
USE confexpress;

CREATE TABLE IF NOT EXISTS colegios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    escudo VARCHAR(255) NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_colegio_nombre (nombre)
) ENGINE=InnoDB;

ALTER TABLE productos
    ADD COLUMN linea ENUM('diario', 'deportes') NULL,
    ADD COLUMN genero ENUM('nino', 'nina', 'todos') NULL,
    ADD COLUMN admite_marquilla BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN dias_encargo INT UNSIGNED NULL;

CREATE TABLE IF NOT EXISTS colegio_productos (
    colegio_id INT UNSIGNED NOT NULL,
    producto_id INT UNSIGNED NOT NULL,
    es_opcional BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (colegio_id, producto_id),
    INDEX idx_cp_producto (producto_id),
    CONSTRAINT fk_cp_colegio FOREIGN KEY (colegio_id)
        REFERENCES colegios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cp_producto FOREIGN KEY (producto_id)
        REFERENCES productos(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS producto_tallas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    producto_id INT UNSIGNED NOT NULL,
    talla VARCHAR(20) NOT NULL,
    precio DECIMAL(12,2) NOT NULL,
    cantidad INT UNSIGNED NOT NULL DEFAULT 0,
    UNIQUE KEY uq_producto_talla (producto_id, talla),
    CONSTRAINT chk_talla_precio CHECK (precio >= 0),
    CONSTRAINT fk_talla_producto FOREIGN KEY (producto_id)
        REFERENCES productos(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;
-- Migración 001: anticipos (pagos) de los pedidos.
-- Solo crea una tabla nueva; no modifica ni borra nada existente.
USE confexpress;

CREATE TABLE IF NOT EXISTS pagos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT UNSIGNED NOT NULL,
    monto DECIMAL(12,2) NOT NULL,
    metodo ENUM('efectivo', 'transferencia') NOT NULL,
    fecha_pago DATE NOT NULL,
    nota VARCHAR(255) NULL,
    anulado BOOLEAN NOT NULL DEFAULT FALSE,
    motivo_anulacion VARCHAR(255) NULL,
    anulado_en TIMESTAMP NULL,
    registrado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_pagos_pedido (pedido_id),

    CONSTRAINT chk_pago_monto CHECK (monto > 0),

    CONSTRAINT fk_pago_pedido
        FOREIGN KEY (pedido_id)
        REFERENCES pedidos(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;
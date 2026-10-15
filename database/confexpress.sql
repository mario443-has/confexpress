-- ConfeXpress - esquema de base de datos del PMV
-- Pensado para una instalacion NUEVA. No ejecutar sobre una base que ya tenga datos:
-- CREATE TABLE IF NOT EXISTS no modifica tablas existentes.

CREATE DATABASE IF NOT EXISTS confexpress
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE confexpress;

-- 1. Catalogo de productos y servicios
CREATE TABLE IF NOT EXISTS productos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,
    tipo ENUM('producto', 'servicio') NOT NULL,
    categoria VARCHAR(60),
    precio_referencia DECIMAL(12,2) NULL,
    modalidad ENUM(
        'entrega_inmediata',
        'por_encargo',
        'requiere_consulta'
    ) NOT NULL DEFAULT 'requiere_consulta',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    destacado BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_producto_precio
        CHECK (precio_referencia IS NULL OR precio_referencia >= 0)
) ENGINE=InnoDB;

-- 2. Datos de contacto de los clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    telefono VARCHAR(25) NOT NULL,
    correo VARCHAR(120) NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Solicitudes enviadas por los clientes
CREATE TABLE IF NOT EXISTS solicitudes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT UNSIGNED NOT NULL,
    estado ENUM(
        'recibida',
        'en_revision',
        'cotizada',
        'cancelada'
    ) NOT NULL DEFAULT 'recibida',
    observaciones TEXT,
    -- Momento en que el cliente autorizo el tratamiento de sus datos personales
    autorizacion_datos_en TIMESTAMP NULL,
    creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_solicitudes_cliente (cliente_id),
    INDEX idx_solicitudes_estado (estado),

    CONSTRAINT fk_solicitudes_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4. Productos o servicios solicitados
CREATE TABLE IF NOT EXISTS detalles_solicitud (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT UNSIGNED NOT NULL,
    producto_id INT UNSIGNED NULL,
    descripcion_solicitada VARCHAR(200) NOT NULL,
    cantidad INT UNSIGNED NOT NULL DEFAULT 1,
    talla VARCHAR(50) NULL,
    -- Para trabajos por encargo el cliente describe aqui su diseno.
    -- Las medidas y los materiales se definen en persona, no en el sistema.
    especificaciones TEXT,

    INDEX idx_detalles_solicitud (solicitud_id),
    INDEX idx_detalles_producto (producto_id),

    CONSTRAINT chk_detalle_cantidad
        CHECK (cantidad > 0),

    CONSTRAINT fk_detalle_solicitud
        FOREIGN KEY (solicitud_id)
        REFERENCES solicitudes(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_detalle_producto
        FOREIGN KEY (producto_id)
        REFERENCES productos(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 5. Cotizacion de cada solicitud (una por solicitud en el PMV)
CREATE TABLE IF NOT EXISTS cotizaciones (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT UNSIGNED NOT NULL UNIQUE,
    estado ENUM(
        'borrador',
        'enviada',
        'aceptada',
        'rechazada',
        'vencida'
    ) NOT NULL DEFAULT 'borrador',
    fecha_emision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATE NULL,
    observaciones TEXT,

    CONSTRAINT fk_cotizacion_solicitud
        FOREIGN KEY (solicitud_id)
        REFERENCES solicitudes(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 6. Conceptos y valores incluidos en la cotizacion
CREATE TABLE IF NOT EXISTS detalles_cotizacion (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cotizacion_id INT UNSIGNED NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    cantidad INT UNSIGNED NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(12,2) NOT NULL,

    INDEX idx_detalles_cotizacion (cotizacion_id),

    CONSTRAINT chk_cotizacion_cantidad
        CHECK (cantidad > 0),

    CONSTRAINT chk_cotizacion_precio
        CHECK (precio_unitario >= 0),

    CONSTRAINT fk_detalle_cotizacion
        FOREIGN KEY (cotizacion_id)
        REFERENCES cotizaciones(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 7. Pedidos generados a partir de cotizaciones aceptadas
-- El backend debe verificar que la cotizacion este aceptada antes de crear el pedido.
CREATE TABLE IF NOT EXISTS pedidos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cotizacion_id INT UNSIGNED NOT NULL UNIQUE,
    estado ENUM(
        'confirmado',
        'en_confeccion',
        'listo',
        'entregado',
        'cancelado'
    ) NOT NULL DEFAULT 'confirmado',
    fecha_entrega_estimada DATE NULL,
    fecha_entrega_real DATE NULL,
    observaciones TEXT,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pedido_cotizacion
        FOREIGN KEY (cotizacion_id)
        REFERENCES cotizaciones(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 8. Galeria de fotos de trabajos realizados
-- ruta_imagen guarda la ruta del archivo (por ejemplo /uploads/galeria/foto1.jpg).
-- producto_id es opcional: una foto puede ser de un producto o general.
CREATE TABLE IF NOT EXISTS galeria_imagenes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    producto_id INT UNSIGNED NULL,
    titulo VARCHAR(120) NOT NULL,
    descripcion VARCHAR(255) NULL,
    ruta_imagen VARCHAR(255) NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_galeria_producto (producto_id),

    CONSTRAINT fk_galeria_producto
        FOREIGN KEY (producto_id)
        REFERENCES productos(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Datos iniciales de DEMOSTRACION.
-- No son un catalogo verificado ni tienen precios reales.
-- La descripcion de "Uniformes pijameros" queda vacia hasta que se redacte la real.
INSERT INTO productos
    (nombre, descripcion, tipo, categoria, precio_referencia, modalidad)
VALUES
    (
        'Uniformes escolares',
        'Prendas escolares confeccionadas segun los requerimientos del cliente.',
        'producto',
        'Uniformes escolares',
        NULL,
        'por_encargo'
    ),
    (
        'Sudaderas deportivas',
        'Conjuntos deportivos cuyo precio depende de las especificaciones.',
        'producto',
        'Uniformes deportivos',
        NULL,
        'por_encargo'
    ),
    (
        'Dotaciones institucionales',
        'Prendas para empresas e instituciones sujetas a cotizacion.',
        'producto',
        'Dotaciones',
        NULL,
        'requiere_consulta'
    ),
    (
        'Arreglos de prendas',
        'Ajustes y modificaciones cuyo valor depende del trabajo solicitado.',
        'servicio',
        'Arreglos',
        NULL,
        'requiere_consulta'
    ),
    (
        'Uniformes pijameros',
        NULL,
        'producto',
        'Uniformes pijameros',
        NULL,
        'por_encargo'
    );

-- Producto destacado en el catalogo
UPDATE productos SET destacado = TRUE WHERE nombre = 'Uniformes pijameros';

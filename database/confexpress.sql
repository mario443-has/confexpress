CREATE DATABASE IF NOT EXISTS confexpress
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE confexpress;

-- 1. Productos y servicios del catalogo
CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
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
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Datos de contacto de los clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    telefono VARCHAR(25) NOT NULL,
    correo VARCHAR(120),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Solicitudes realizadas por los clientes
-- La aceptacion o rechazo vive en la cotizacion, no aqui.
CREATE TABLE IF NOT EXISTS solicitudes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    estado ENUM(
        'recibida',
        'en_revision',
        'cotizada',
        'cancelada'
    ) NOT NULL DEFAULT 'recibida',
    observaciones TEXT,
    creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
);

-- 4. Productos o servicios incluidos en cada solicitud
CREATE TABLE IF NOT EXISTS detalles_solicitud (
    id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT NOT NULL,
    producto_id INT NULL,
    descripcion_solicitada VARCHAR(200) NOT NULL,
    cantidad INT UNSIGNED NOT NULL DEFAULT 1,
    talla VARCHAR(50),
    especificaciones TEXT,
    FOREIGN KEY (solicitud_id)
        REFERENCES solicitudes(id),
    FOREIGN KEY (producto_id)
        REFERENCES productos(id)
        ON DELETE SET NULL
);

-- 5. Cotizaciones asociadas a las solicitudes
CREATE TABLE IF NOT EXISTS cotizaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    solicitud_id INT NOT NULL,
    estado ENUM(
        'borrador',
        'enviada',
        'aceptada',
        'rechazada',
        'vencida'
    ) NOT NULL DEFAULT 'borrador',
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATE NULL,
    observaciones TEXT,
    FOREIGN KEY (solicitud_id)
        REFERENCES solicitudes(id)
);

-- 6. Conceptos y valores de cada cotizacion
CREATE TABLE IF NOT EXISTS detalles_cotizacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cotizacion_id INT NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    cantidad INT UNSIGNED NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (cotizacion_id)
        REFERENCES cotizaciones(id)
        ON DELETE CASCADE
);

-- 7. Pedidos: nacen de una cotizacion aceptada
CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cotizacion_id INT NOT NULL UNIQUE,
    estado ENUM(
        'confirmado',
        'en_confeccion',
        'listo',
        'entregado',
        'cancelado'
    ) NOT NULL DEFAULT 'confirmado',
    fecha_entrega_estimada DATE NULL,
    observaciones TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cotizacion_id)
        REFERENCES cotizaciones(id)
);

-- Productos y servicios iniciales de DEMOSTRACION.
-- No son un catalogo verificado; reemplazar por los reales de E&M.
INSERT INTO productos
    (nombre, descripcion, tipo, categoria, precio_referencia, modalidad)
VALUES
    (
        'Uniformes escolares',
        'Prendas escolares confeccionadas segun las especificaciones del cliente.',
        'producto',
        'Uniformes escolares',
        NULL,
        'por_encargo'
    ),
    (
        'Sudaderas deportivas',
        'Conjuntos deportivos con caracteristicas y cantidades por definir.',
        'producto',
        'Uniformes deportivos',
        NULL,
        'por_encargo'
    ),
    (
        'Dotaciones institucionales',
        'Prendas para empresas e instituciones, sujetas a cotizacion.',
        'producto',
        'Dotaciones',
        NULL,
        'requiere_consulta'
    ),
    (
        'Arreglos de prendas',
        'Ajustes y modificaciones de prendas segun el trabajo solicitado.',
        'servicio',
        'Arreglos',
        NULL,
        'requiere_consulta'
    );

-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: confexpress
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `confexpress`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `confexpress` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `confexpress`;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cotizaciones`
--

DROP TABLE IF EXISTS `cotizaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cotizaciones` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `solicitud_id` int unsigned NOT NULL,
  `estado` enum('borrador','enviada','aceptada','rechazada','vencida') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'borrador',
  `fecha_emision` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_vencimiento` date DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_cotizaciones_solicitud` (`solicitud_id`),
  CONSTRAINT `fk_cotizacion_solicitud` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitudes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalles_cotizacion`
--

DROP TABLE IF EXISTS `detalles_cotizacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalles_cotizacion` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `cotizacion_id` int unsigned NOT NULL,
  `descripcion` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad` int unsigned NOT NULL DEFAULT '1',
  `precio_unitario` decimal(12,2) NOT NULL,
  `detalle_solicitud_id` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_detalles_cotizacion` (`cotizacion_id`),
  KEY `detalle_solicitud_id` (`detalle_solicitud_id`),
  CONSTRAINT `detalles_cotizacion_ibfk_1` FOREIGN KEY (`detalle_solicitud_id`) REFERENCES `detalles_solicitud` (`id`),
  CONSTRAINT `fk_detalle_cotizacion` FOREIGN KEY (`cotizacion_id`) REFERENCES `cotizaciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_cotizacion_cantidad` CHECK ((`cantidad` > 0)),
  CONSTRAINT `chk_cotizacion_precio` CHECK ((`precio_unitario` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalles_solicitud`
--

DROP TABLE IF EXISTS `detalles_solicitud`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalles_solicitud` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `solicitud_id` int unsigned NOT NULL,
  `producto_id` int unsigned DEFAULT NULL,
  `descripcion_solicitada` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad` int unsigned NOT NULL DEFAULT '1',
  `talla` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `especificaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_detalles_solicitud` (`solicitud_id`),
  KEY `idx_detalles_producto` (`producto_id`),
  CONSTRAINT `fk_detalle_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_detalle_solicitud` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitudes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_detalle_cantidad` CHECK ((`cantidad` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `galeria_imagenes`
--

DROP TABLE IF EXISTS `galeria_imagenes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `galeria_imagenes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `producto_id` int unsigned DEFAULT NULL,
  `titulo` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ruta_imagen` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orden` int NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_galeria_producto` (`producto_id`),
  CONSTRAINT `fk_galeria_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `medidas_item`
--

DROP TABLE IF EXISTS `medidas_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medidas_item` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `detalle_solicitud_id` int unsigned NOT NULL,
  `tipo_prenda_id` int NOT NULL,
  `medida_id` int NOT NULL,
  `valor` decimal(5,1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `detalle_solicitud_id` (`detalle_solicitud_id`,`tipo_prenda_id`,`medida_id`),
  KEY `tipo_prenda_id` (`tipo_prenda_id`),
  KEY `medida_id` (`medida_id`),
  CONSTRAINT `medidas_item_ibfk_1` FOREIGN KEY (`detalle_solicitud_id`) REFERENCES `detalles_solicitud` (`id`) ON DELETE CASCADE,
  CONSTRAINT `medidas_item_ibfk_2` FOREIGN KEY (`tipo_prenda_id`) REFERENCES `tipos_prenda` (`id`),
  CONSTRAINT `medidas_item_ibfk_3` FOREIGN KEY (`medida_id`) REFERENCES `medidas_prenda` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `medidas_prenda`
--

DROP TABLE IF EXISTS `medidas_prenda`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medidas_prenda` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipo_prenda_id` int NOT NULL,
  `nombre` varchar(60) NOT NULL,
  `orden` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `tipo_prenda_id` (`tipo_prenda_id`),
  CONSTRAINT `medidas_prenda_ibfk_1` FOREIGN KEY (`tipo_prenda_id`) REFERENCES `tipos_prenda` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pedidos`
--

DROP TABLE IF EXISTS `pedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedidos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `cotizacion_id` int unsigned NOT NULL,
  `estado` enum('confirmado','en_confeccion','listo','entregado','cancelado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'confirmado',
  `fecha_entrega_estimada` date DEFAULT NULL,
  `fecha_entrega_real` date DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cotizacion_id` (`cotizacion_id`),
  CONSTRAINT `fk_pedido_cotizacion` FOREIGN KEY (`cotizacion_id`) REFERENCES `cotizaciones` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `producto_prendas`
--

DROP TABLE IF EXISTS `producto_prendas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `producto_prendas` (
  `producto_id` int unsigned NOT NULL,
  `tipo_prenda_id` int NOT NULL,
  PRIMARY KEY (`producto_id`,`tipo_prenda_id`),
  KEY `tipo_prenda_id` (`tipo_prenda_id`),
  CONSTRAINT `producto_prendas_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  CONSTRAINT `producto_prendas_ibfk_2` FOREIGN KEY (`tipo_prenda_id`) REFERENCES `tipos_prenda` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `productos`
--

DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `tipo` enum('producto','servicio') COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `precio_referencia` decimal(12,2) DEFAULT NULL,
  `modalidad` enum('entrega_inmediata','por_encargo','requiere_consulta') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requiere_consulta',
  `a_medida` tinyint(1) NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `destacado` tinyint(1) NOT NULL DEFAULT '0',
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_producto_precio` CHECK (((`precio_referencia` is null) or (`precio_referencia` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `solicitudes`
--

DROP TABLE IF EXISTS `solicitudes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `cliente_id` int unsigned NOT NULL,
  `estado` enum('recibida','en_revision','cotizada','cancelada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'recibida',
  `origen` enum('web','presencial','whatsapp') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'web',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `autorizacion_datos_en` timestamp NULL DEFAULT NULL,
  `creada_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_solicitudes_cliente` (`cliente_id`),
  KEY `idx_solicitudes_estado` (`estado`),
  CONSTRAINT `fk_solicitudes_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tipos_prenda`
--

DROP TABLE IF EXISTS `tipos_prenda`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_prenda` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-21 23:33:16
-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: confexpress
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `productos`
--

LOCK TABLES `productos` WRITE;
/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
INSERT INTO `productos` VALUES (1,'Uniformes escolares','Prendas escolares confeccionadas segun los requerimientos del cliente.','producto','Uniformes escolares',NULL,'por_encargo',0,1,0,'2026-10-15 04:30:12'),(2,'Sudaderas deportivas','Conjuntos deportivos cuyo precio depende de las especificaciones.','producto','Uniformes deportivos',NULL,'por_encargo',1,1,0,'2026-10-15 04:30:12'),(3,'Dotaciones institucionales','Prendas para empresas e instituciones sujetas a cotizacion.','producto','Dotaciones',NULL,'requiere_consulta',1,1,0,'2026-10-15 04:30:12'),(4,'Arreglos de prendas','Ajustes y modificaciones cuyo valor depende del trabajo solicitado.','servicio','Arreglos',NULL,'requiere_consulta',0,1,0,'2026-10-15 04:30:12'),(5,'Uniformes pijameros',NULL,'producto','Uniformes pijameros',NULL,'por_encargo',1,1,1,'2026-10-15 04:30:12');
/*!40000 ALTER TABLE `productos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `tipos_prenda`
--

LOCK TABLES `tipos_prenda` WRITE;
/*!40000 ALTER TABLE `tipos_prenda` DISABLE KEYS */;
INSERT INTO `tipos_prenda` VALUES (2,'Blusa'),(5,'Chaqueta'),(3,'Falda'),(4,'Jardinera'),(1,'Pantalón');
/*!40000 ALTER TABLE `tipos_prenda` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `medidas_prenda`
--

LOCK TABLES `medidas_prenda` WRITE;
/*!40000 ALTER TABLE `medidas_prenda` DISABLE KEYS */;
INSERT INTO `medidas_prenda` VALUES (1,2,'Talle',1),(2,2,'Largo blusa',2),(3,2,'Largo manga',3),(4,2,'Cintura',4),(5,2,'Cadera',5),(6,2,'Busto',6),(7,2,'Espalda',7),(8,5,'Cintura',1),(9,5,'Cadera',2),(10,5,'Busto',3),(11,5,'Espalda',4),(12,5,'Largo total',5),(13,5,'Largo manga',6),(14,3,'Cintura',1),(15,3,'Cadera',2),(16,3,'Largo falda',3),(17,4,'Cintura',1),(18,4,'Cadera',2),(19,4,'Largo falda',3),(20,4,'Busto',4),(21,4,'Talle',5),(22,1,'Largo pantalón',1),(23,1,'Cintura',2),(24,1,'Cadera',3),(25,1,'Pierna',4),(26,1,'Largo rodilla',5),(27,1,'Rodilla',6),(28,1,'Bota',7);
/*!40000 ALTER TABLE `medidas_prenda` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `producto_prendas`
--

LOCK TABLES `producto_prendas` WRITE;
/*!40000 ALTER TABLE `producto_prendas` DISABLE KEYS */;
INSERT INTO `producto_prendas` VALUES (2,1),(5,1),(5,2),(2,5);
/*!40000 ALTER TABLE `producto_prendas` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-21 23:33:22

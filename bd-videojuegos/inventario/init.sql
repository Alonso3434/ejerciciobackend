CREATE DATABASE IF NOT EXISTS tienda_videojuegos_inventario
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE tienda_videojuegos_inventario;

CREATE TABLE plataformas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    fabricante VARCHAR(100) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVA',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_plataformas_nombre UNIQUE (nombre),
    CONSTRAINT chk_plataformas_estado CHECK (estado IN ('ACTIVA', 'INACTIVA'))
);

CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVA',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_categorias_nombre UNIQUE (nombre),
    CONSTRAINT chk_categorias_estado CHECK (estado IN ('ACTIVA', 'INACTIVA'))
);

CREATE TABLE videojuegos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    plataforma_id INT NOT NULL,
    categoria_id INT NOT NULL,
    descripcion VARCHAR(255),
    precio INT NOT NULL,
    stock INT NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'DISPONIBLE',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_videojuegos_plataformas
        FOREIGN KEY (plataforma_id)
        REFERENCES plataformas(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_videojuegos_categorias
        FOREIGN KEY (categoria_id)
        REFERENCES categorias(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT chk_videojuegos_precio CHECK (precio >= 0),
    CONSTRAINT chk_videojuegos_stock CHECK (stock >= 0),
    CONSTRAINT chk_videojuegos_estado CHECK (estado IN ('DISPONIBLE', 'AGOTADO', 'INACTIVO'))
);

INSERT INTO plataformas (nombre, fabricante, estado) VALUES
('Nintendo Switch', 'Nintendo', 'ACTIVA'),
('PlayStation 5', 'Sony', 'ACTIVA'),
('Xbox Series X', 'Microsoft', 'ACTIVA'),
('PC', 'Multiplataforma', 'ACTIVA');

INSERT INTO categorias (nombre, descripcion, estado) VALUES
('Aventura', 'Videojuegos centrados en exploración y narrativa', 'ACTIVA'),
('Acción', 'Videojuegos con combate y desafíos dinámicos', 'ACTIVA'),
('RPG', 'Videojuegos de rol con progresión de personajes', 'ACTIVA'),
('Carreras', 'Videojuegos de conducción y competencia', 'ACTIVA'),
('Shooter', 'Videojuegos de disparos y estrategia de combate', 'ACTIVA'),
('Deportes', 'Videojuegos basados en disciplinas deportivas', 'ACTIVA');

INSERT INTO videojuegos 
(nombre, plataforma_id, categoria_id, descripcion, precio, stock, estado) 
VALUES
('The Legend of Zelda Tears of the Kingdom', 1, 1, 'Aventura de mundo abierto para Nintendo Switch', 59990, 10, 'DISPONIBLE'),
('Mario Kart 8 Deluxe', 1, 4, 'Juego de carreras familiar y competitivo', 49990, 15, 'DISPONIBLE'),
('God of War Ragnarok', 2, 2, 'Aventura de acción con narrativa épica', 64990, 8, 'DISPONIBLE'),
('Final Fantasy VII Rebirth', 2, 3, 'RPG de acción con historia cinematográfica', 69990, 7, 'DISPONIBLE'),
('Halo Infinite', 3, 5, 'Shooter de ciencia ficción', 39990, 12, 'DISPONIBLE'),
('Forza Horizon 5', 3, 4, 'Juego de carreras de mundo abierto', 45990, 11, 'DISPONIBLE'),
('Elden Ring', 2, 3, 'RPG de acción y fantasía oscura', 54990, 6, 'DISPONIBLE'),
('EA Sports FC 25', 2, 6, 'Videojuego de fútbol', 69990, 20, 'DISPONIBLE'),
('Minecraft', 1, 1, 'Juego sandbox de construcción y aventura', 29990, 25, 'DISPONIBLE'),
('Resident Evil 4 Remake', 2, 2, 'Juego de acción y terror', 49990, 9, 'DISPONIBLE');
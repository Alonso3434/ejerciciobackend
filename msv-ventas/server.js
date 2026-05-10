const express = require("express")
const cors = require("cors")
const mysql = require("mysql2/promise")

const app = express()
const PORT = process.env.PORT || 3002

const {
    DB_HOST = "db-ventas",
    DB_USER = "root",
    DB_PASSWORD = "admin123",
    DB_NAME = "tienda_videojuegos_ventas",
    DB_PORT = 3306
} = process.env

app.use(cors())
app.use(express.json())

let pool

async function initDb() {
    try {
        pool = mysql.createPool({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME,
            port: DB_PORT,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        })

        console.log("Pool de conexiones MySQL inicializado para ms-ventas")
    } catch (error) {
        console.error("Error al inicializar la conexión con MySQL", error)
    }
}

function handleError(res, error, message = "Error interno del servidor") {
    console.error(error)
    res.status(500).json({ message })
}

app.get("/api/ventas/health", (req, res) => {
    res.json({
        status: "ok",
        service: "ms-ventas",
        message: "Microservicio de ventas funcionando correctamente"
    })
})

app.get("/api/ventas", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                v.id,
                v.cliente_id,
                c.nombre AS cliente,
                c.correo AS correo_cliente,
                v.total,
                v.estado,
                v.fecha_venta
            FROM ventas v
            INNER JOIN clientes c ON v.cliente_id = c.id
            ORDER BY v.id DESC
        `)

        res.json(rows)
    } catch (error) {
        handleError(res, error, "No se pudieron obtener las ventas")
    }
})

app.get("/api/ventas/:id", async (req, res) => {
    const { id } = req.params

    try {
        const [ventas] = await pool.query(`
            SELECT 
                v.id,
                v.cliente_id,
                c.nombre AS cliente,
                c.correo AS correo_cliente,
                v.total,
                v.estado,
                v.fecha_venta
            FROM ventas v
            INNER JOIN clientes c ON v.cliente_id = c.id
            WHERE v.id = ?
        `, [id])

        if (ventas.length === 0) {
            return res.status(404).json({
                message: "Venta no encontrada"
            })
        }

        const [detalles] = await pool.query(`
            SELECT 
                id,
                venta_id,
                videojuego_id,
                nombre_videojuego,
                plataforma,
                cantidad,
                precio_unitario,
                subtotal
            FROM detalle_ventas
            WHERE venta_id = ?
        `, [id])

        res.json({
            ...ventas[0],
            detalles
        })
    } catch (error) {
        handleError(res, error, "No se pudo obtener la venta")
    }
})

app.post("/api/ventas", async (req, res) => {
    const {
        cliente_id,
        total,
        estado = "REGISTRADA",
        detalles
    } = req.body

    if (!cliente_id || total == null || !Array.isArray(detalles) || detalles.length === 0) {
        return res.status(400).json({
            message: "cliente_id, total y detalles son obligatorios"
        })
    }

    const connection = await pool.getConnection()

    try {
        await connection.beginTransaction()

        const [clientes] = await connection.query(
            "SELECT id FROM clientes WHERE id = ?",
            [cliente_id]
        )

        if (clientes.length === 0) {
            await connection.rollback()

            return res.status(404).json({
                message: "Cliente no encontrado"
            })
        }

        const [ventaResult] = await connection.query(
            "INSERT INTO ventas (cliente_id, total, estado) VALUES (?, ?, ?)",
            [cliente_id, total, estado]
        )

        const ventaId = ventaResult.insertId

        for (const detalle of detalles) {
            const {
                videojuego_id,
                nombre_videojuego,
                plataforma,
                cantidad,
                precio_unitario,
                subtotal
            } = detalle

            if (!videojuego_id || !nombre_videojuego || !plataforma || cantidad == null || precio_unitario == null || subtotal == null) {
                await connection.rollback()

                return res.status(400).json({
                    message: "Cada detalle debe incluir videojuego_id, nombre_videojuego, plataforma, cantidad, precio_unitario y subtotal"
                })
            }

            await connection.query(`
                INSERT INTO detalle_ventas 
                (venta_id, videojuego_id, nombre_videojuego, plataforma, cantidad, precio_unitario, subtotal)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                ventaId,
                videojuego_id,
                nombre_videojuego,
                plataforma,
                cantidad,
                precio_unitario,
                subtotal
            ])
        }

        await connection.commit()

        res.status(201).json({
            id: ventaId,
            cliente_id,
            total,
            estado,
            detalles,
            message: "Venta registrada correctamente"
        })
    } catch (error) {
        await connection.rollback()
        handleError(res, error, "No se pudo registrar la venta")
    } finally {
        connection.release()
    }
})

app.put("/api/ventas/:id/estado", async (req, res) => {
    const { id } = req.params
    const { estado } = req.body

    const estadosPermitidos = ["REGISTRADA", "PAGADA", "ANULADA"]

    if (!estado) {
        return res.status(400).json({
            message: "El estado es obligatorio"
        })
    }

    if (!estadosPermitidos.includes(estado)) {
        return res.status(400).json({
            message: "Estado no permitido"
        })
    }

    try {
        const [result] = await pool.query(
            "UPDATE ventas SET estado = ? WHERE id = ?",
            [estado, id]
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Venta no encontrada"
            })
        }

        res.json({
            id,
            estado,
            message: "Estado de venta actualizado correctamente"
        })
    } catch (error) {
        handleError(res, error, "No se pudo actualizar el estado de la venta")
    }
})

app.delete("/api/ventas/:id", async (req, res) => {
    const { id } = req.params

    try {
        const [result] = await pool.query(
            "DELETE FROM ventas WHERE id = ?",
            [id]
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Venta no encontrada"
            })
        }

        res.json({
            message: "Venta eliminada correctamente"
        })
    } catch (error) {
        handleError(res, error, "No se pudo eliminar la venta")
    }
})

app.listen(PORT, async () => {
    console.log(`ms-ventas escuchando en puerto ${PORT}`)
    await initDb()
})
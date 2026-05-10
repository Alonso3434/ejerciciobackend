const express = require("express")
const cors = require("cors")
const mysql = require("mysql2/promise")

const app = express()
const PORT = process.env.PORT || 3003

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

        console.log("Pool de conexiones MySQL inicializado para ms-despachos")
    } catch (error) {
        console.error("Error al inicializar la conexión con MySQL", error)
    }
}

function handleError(res, error, message = "Error interno del servidor") {
    console.error(error)
    res.status(500).json({ message })
}

app.get("/api/despachos/health", (req, res) => {
    res.json({
        status: "ok",
        service: "ms-despachos",
        message: "Microservicio de despachos funcionando correctamente"
    })
})

app.get("/api/despachos", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                d.id,
                d.venta_id,
                c.nombre AS cliente,
                c.correo AS correo_cliente,
                v.total,
                v.estado AS estado_venta,
                d.direccion,
                d.comuna,
                d.ciudad,
                d.region,
                d.estado AS estado_despacho,
                d.fecha_despacho,
                d.fecha_actualizacion
            FROM despachos d
            INNER JOIN ventas v ON d.venta_id = v.id
            INNER JOIN clientes c ON v.cliente_id = c.id
            ORDER BY d.id DESC
        `)

        res.json(rows)
    } catch (error) {
        handleError(res, error, "No se pudieron obtener los despachos")
    }
})

app.get("/api/despachos/:id", async (req, res) => {
    const { id } = req.params

    try {
        const [rows] = await pool.query(`
            SELECT 
                d.id,
                d.venta_id,
                c.nombre AS cliente,
                c.correo AS correo_cliente,
                c.telefono,
                v.total,
                v.estado AS estado_venta,
                d.direccion,
                d.comuna,
                d.ciudad,
                d.region,
                d.estado AS estado_despacho,
                d.fecha_despacho,
                d.fecha_actualizacion
            FROM despachos d
            INNER JOIN ventas v ON d.venta_id = v.id
            INNER JOIN clientes c ON v.cliente_id = c.id
            WHERE d.id = ?
        `, [id])

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Despacho no encontrado"
            })
        }

        res.json(rows[0])
    } catch (error) {
        handleError(res, error, "No se pudo obtener el despacho")
    }
})

app.post("/api/despachos", async (req, res) => {
    const {
        venta_id,
        direccion,
        comuna,
        ciudad,
        region
    } = req.body

    if (!venta_id || !direccion || !comuna || !ciudad || !region) {
        return res.status(400).json({
            message: "venta_id, direccion, comuna, ciudad y region son obligatorios"
        })
    }

    try {
        const [ventas] = await pool.query(
            "SELECT id FROM ventas WHERE id = ?",
            [venta_id]
        )

        if (ventas.length === 0) {
            return res.status(404).json({
                message: "La venta asociada no existe"
            })
        }

        const [despachosExistentes] = await pool.query(
            "SELECT id FROM despachos WHERE venta_id = ?",
            [venta_id]
        )

        if (despachosExistentes.length > 0) {
            return res.status(400).json({
                message: "La venta ya tiene un despacho asociado"
            })
        }

        const [result] = await pool.query(`
            INSERT INTO despachos 
            (venta_id, direccion, comuna, ciudad, region, estado)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            venta_id,
            direccion,
            comuna,
            ciudad,
            region,
            "PENDIENTE"
        ])

        res.status(201).json({
            id: result.insertId,
            venta_id,
            direccion,
            comuna,
            ciudad,
            region,
            estado: "PENDIENTE",
            message: "Despacho creado correctamente"
        })
    } catch (error) {
        handleError(res, error, "No se pudo crear el despacho")
    }
})

app.put("/api/despachos/:id/estado", async (req, res) => {
    const { id } = req.params
    const { estado } = req.body

    const estadosPermitidos = [
        "PENDIENTE",
        "EN_PREPARACION",
        "EN_CAMINO",
        "ENTREGADO",
        "CANCELADO"
    ]

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
            "UPDATE despachos SET estado = ? WHERE id = ?",
            [estado, id]
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Despacho no encontrado"
            })
        }

        res.json({
            id,
            estado,
            message: "Estado del despacho actualizado correctamente"
        })
    } catch (error) {
        handleError(res, error, "No se pudo actualizar el estado del despacho")
    }
})

app.delete("/api/despachos/:id", async (req, res) => {
    const { id } = req.params

    try {
        const [result] = await pool.query(
            "DELETE FROM despachos WHERE id = ?",
            [id]
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Despacho no encontrado"
            })
        }

        res.json({
            message: "Despacho eliminado correctamente"
        })
    } catch (error) {
        handleError(res, error, "No se pudo eliminar el despacho")
    }
})

app.listen(PORT, async () => {
    console.log(`ms-despachos escuchando en puerto ${PORT}`)
    await initDb()
})
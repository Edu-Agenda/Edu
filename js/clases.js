// ==========================================
// CANCELAR CLASE (libera el cupo)
// Agregar en server.js ANTES del bloque 404
// ==========================================

app.post('/api/cancelar-clase', verificarToken, (req, res) => {

    const { id_horario } = req.body;

    if (!id_horario) {
        return res.status(400).json({
            success: false,
            error: 'Falta el id del horario'
        });
    }

    try {
        // Verificar que el horario existe y está reservado
        const horario = db.prepare(`
            SELECT * FROM horarios WHERE id = ?
        `).get(id_horario);

        if (!horario) {
            return res.status(404).json({
                success: false,
                error: 'Horario no encontrado'
            });
        }

        if (horario.estado !== 'reservado') {
            return res.status(400).json({
                success: false,
                error: 'Este horario no está reservado'
            });
        }

        // Liberar el cupo: volver a disponible y quitar estudiante
        db.prepare(`
            UPDATE horarios
            SET estado = 'disponible',
                estudiante_nombre = NULL
            WHERE id = ?
        `).run(id_horario);

        console.log(`✅ Clase ${id_horario} liberada por ${horario.estudiante_nombre}`);

        res.json({
            success: true,
            mensaje: 'Clase cancelada y cupo liberado correctamente'
        });

    } catch (error) {
        console.error('❌ Error cancelando clase:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }

});
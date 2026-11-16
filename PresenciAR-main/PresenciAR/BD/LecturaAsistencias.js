const SUPABASE_URL = 'https://pqtpjvxyjdemcnpmnhxv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxdHBqdnh5amRlbWNucG1uaHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNjY0NzgsImV4cCI6MjA5Nzc0MjQ3OH0.qzzgN31vW22YseltVaTNbYp1CzyqNijX3OiQAbSnqac';

const supabase2 = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function diaSemanaDeTimestamp(timestampTexto) {
    const fecha = new Date(timestampTexto);
    return fecha.getDay();
}

async function cargarAsistencias() {

    // Traer alumnos (para relacionar por uid_sube)
    const { data: alumnos, error: errorAlumnos } = await supabase2
        .from('alumnos')
        .select('id, nombre, apellido, uid_sube');

    if (errorAlumnos) {
        console.error('Error al obtener alumnos:', errorAlumnos);
        return;
    }

    // Traer horarios
    const { data: horarios, error: errorHorarios } = await supabase2
        .from('horarios')
        .select('alumno_id, dia_semana, hora_ingreso, tolerancia_min');

    if (errorHorarios) {
        console.error('Error al obtener horarios:', errorHorarios);
        return;
    }

    // Traer terminales (para mostrar nombre)
    const { data: terminales, error: errorTerminales } = await supabase2
        .from('terminales')
        .select('id, nombre, ubicacion');

    if (errorTerminales) {
        console.error('Error al obtener terminales:', errorTerminales);
        return;
    }

    // Traer las últimas lecturas que mandó el ESP32
    const { data: asistencias, error: errorAsistencias } = await supabase2
        .from('asistencias')
        .select('id, uid_leido, timestamp, terminal_id')
        .order('timestamp', { ascending: false })
        .limit(50);

    if (errorAsistencias) {
        console.error('Error al obtener asistencias:', errorAsistencias);
        return;
    }

    // Selecciono el cuerpo de la tabla en el HTML
    const tbody = document.querySelector('#tabla-asistencias tbody');
    tbody.innerHTML = '';

    asistencias.forEach(asistencia => {

        const alumno = alumnos.find(a => a.uid_sube === asistencia.uid_leido);
        const terminal = terminales.find(t => t.id === asistencia.terminal_id);

        let nombreCompleto = 'Tarjeta no registrada';
        let estado = 'uid_no_registrado';

        if (alumno) {
            nombreCompleto = `${alumno.nombre} ${alumno.apellido}`;

            const diaSemana = diaSemanaDeTimestamp(asistencia.timestamp);
            const horario = horarios.find(h => h.alumno_id === alumno.id && h.dia_semana === diaSemana);

            estado = 'sin_horario';

            if (horario) {
                // hora_ingreso llega como texto
                const [horaIngreso, minutoIngreso] = horario.hora_ingreso.split(':').map(Number);

                const horaLlegada = new Date(asistencia.timestamp);
                const limite = new Date(horaLlegada);
                limite.setHours(horaIngreso, minutoIngreso + horario.tolerancia_min, 0, 0);

                estado = horaLlegada <= limite ? 'presente' : 'tardanza';
            }
        }

        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${nombreCompleto}</td>
            <td>${new Date(asistencia.timestamp).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</td>
            <td>${terminal ? terminal.nombre : asistencia.terminal_id}</td>
            <td>${estado}</td>
        `;
        tbody.appendChild(fila);
    });
}

cargarAsistencias();

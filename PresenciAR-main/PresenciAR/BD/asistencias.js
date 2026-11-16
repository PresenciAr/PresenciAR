const SUPABASE_URL = 'https://pqtpjvxyjdemcnpmnhxv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxdHBqdnh5amRlbWNucG1uaHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNjY0NzgsImV4cCI6MjA5Nzc0MjQ3OH0.qzzgN31vW22YseltVaTNbYp1CzyqNijX3OiQAbSnqac';

const supabase2 = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Respaldo por si un curso todavía no tiene fila en la tabla "cursos"
const HORARIO_POR_DEFECTO = {
    "Mañana": "07:15",
    "Tarde": "13:00",
    "Noche": "18:00"
};

let listaAlumnos = [];
let listaCursos = [];
let listaAsistencias = [];

function obtenerClaveCurso(alumno) {
    return `${alumno.curso || ""} ${alumno.division || ""}`.trim();
}

function minutosDesdeMedianoche(horaTexto) {
    const [h, m] = String(horaTexto).slice(0, 5).split(":").map(Number);
    return h * 60 + m;
}

function buscarCursoDeAlumno(alumno) {
    if (!alumno) return null;
    const clave = obtenerClaveCurso(alumno);
    return listaCursos.find(
        c => c.nombre === clave || c.nombre === String(alumno.curso || "").trim()
    ) || null;
}

function calcularEstado(alumno, horaEntrada, cursoObj) {
    if (!alumno) {
        return "Tarjeta no registrada";
    }
    if (!horaEntrada) {
        return "Ausente";
    }

    const entradaMin = minutosDesdeMedianoche(horaEntrada);
    const lim1 = cursoObj?.hora_limite_1
        ? String(cursoObj.hora_limite_1).slice(0, 5)
        : (HORARIO_POR_DEFECTO[alumno.turno] || "07:15");
    const lim2 = cursoObj?.hora_limite_2
        ? String(cursoObj.hora_limite_2).slice(0, 5)
        : null;

    // Si solo tiene un horario configurado, comparamos contra ese
    if (!lim2) {
        return entradaMin <= minutosDesdeMedianoche(lim1) ? "Presente" : "Llegada tarde";
    }

    // Si tiene dos horarios (ej. aula y taller/contraturno), elegimos el bloque más cercano
    const dist1 = Math.abs(entradaMin - minutosDesdeMedianoche(lim1));
    const dist2 = Math.abs(entradaMin - minutosDesdeMedianoche(lim2));
    const limiteElegido = dist1 <= dist2 ? lim1 : lim2;

    return entradaMin <= minutosDesdeMedianoche(limiteElegido) ? "Presente" : "Llegada tarde";
}

function buscarAlumno(reg) {
    if (reg.alumno_id) {
        const porId = listaAlumnos.find(a => String(a.id) === String(reg.alumno_id));
        if (porId) return porId;
    }
    if (reg.uid_leido) {
        return listaAlumnos.find(a => String(a.uid_sube) === String(reg.uid_leido));
    }
    return null;
}

async function cargarDatosAsistencia() {
    const resAlumnos = await supabase2.from('alumnos').select('*');
    const resCursos = await supabase2.from('cursos').select('*');
    const resAsist = await supabase2
        .from('asistencias1')
        .select('id, alumno_id, uid_leido, terminal_id, fecha, hora_entrada')
        .order('fecha', { ascending: false })
        .order('hora_entrada', { ascending: false });

    if (resAlumnos.error || resCursos.error || resAsist.error) {
        console.error('Error al cargar datos:', resAlumnos.error || resCursos.error || resAsist.error);
        return;
    }

    listaAlumnos = resAlumnos.data || [];
    listaCursos = resCursos.data || [];
    listaAsistencias = resAsist.data || [];

    llenarSelectAlumnos();
    llenarSelectsCursos();

    // Si venimos desde el botón "Asistencias" de un alumno en base-de-datos.html, lo preseleccionamos
    const alumnoGuardado = localStorage.getItem('alumnoAsistenciaId');
    if (alumnoGuardado) {
        const selectAlumno = document.getElementById("filtroAlumno");
        if (selectAlumno) {
            selectAlumno.value = alumnoGuardado;
        }
        localStorage.removeItem('alumnoAsistenciaId');
    }

    renderizarAsistencias();
}

function llenarSelectAlumnos() {
    const selectAlumno = document.getElementById("filtroAlumno");
    if (!selectAlumno) return;

    selectAlumno.innerHTML = '<option value="">Alumno: todos</option>';
    listaAlumnos.forEach(a => {
        selectAlumno.innerHTML += `<option value="${a.id}">${a.apellido}, ${a.nombre} (${a.dni})</option>`;
    });
}

function llenarSelectsCursos() {
    const selectAdmin = document.getElementById("selectCursoHorario");
    const selectFiltro = document.getElementById("filtroCursoAsist");

    const nombresCursos = new Set();
    listaAlumnos.forEach(a => {
        const clave = obtenerClaveCurso(a);
        if (clave) nombresCursos.add(clave);
    });
    listaCursos.forEach(c => {
        if (c.nombre) nombresCursos.add(c.nombre.trim());
    });

    const ordenados = Array.from(nombresCursos).sort();

    if (selectAdmin) {
        const previoAdmin = selectAdmin.value;
        selectAdmin.innerHTML = '<option value="">Seleccionar curso...</option>';
        ordenados.forEach(nombre => {
            const info = listaCursos.find(c => c.nombre === nombre);
            let resumenHorarios = " (sin configurar)";
            if (info && info.hora_limite_1) {
                const h1 = String(info.hora_limite_1).slice(0, 5);
                const h2 = info.hora_limite_2 ? ` / ${String(info.hora_limite_2).slice(0, 5)}` : "";
                resumenHorarios = ` (${h1}${h2})`;
            }
            selectAdmin.innerHTML += `<option value="${nombre}">${nombre}${resumenHorarios}</option>`;
        });
        if (previoAdmin) selectAdmin.value = previoAdmin;
    }

    if (selectFiltro) {
        const previoFiltro = selectFiltro.value;
        selectFiltro.innerHTML = '<option value="">Curso: todos</option>';
        ordenados.forEach(nombre => {
            selectFiltro.innerHTML += `<option value="${nombre}">${nombre}</option>`;
        });
        if (previoFiltro) selectFiltro.value = previoFiltro;
    }
}

function alCambiarCursoAdmin() {
    const nombreCurso = document.getElementById("selectCursoHorario").value;
    const inputHora1 = document.getElementById("inputHoraLimite1");
    const inputHora2 = document.getElementById("inputHoraLimite2");
    const estadoLabel = document.getElementById("estadoHorarioCurso");

    if (!nombreCurso) {
        estadoLabel.innerText = "Seleccioná un curso para configurar su horario 1 (y horario 2 si tiene taller/contraturno).";
        return;
    }

    const info = listaCursos.find(c => c.nombre === nombreCurso);
    if (info && info.hora_limite_1) {
        inputHora1.value = String(info.hora_limite_1).slice(0, 5);
        inputHora2.value = info.hora_limite_2 ? String(info.hora_limite_2).slice(0, 5) : "";
        const texto2 = info.hora_limite_2 ? ` y ${inputHora2.value}` : " (sin segundo horario)";
        estadoLabel.innerText = `Horarios de ${nombreCurso}: ${inputHora1.value}${texto2}.`;
    } else {
        inputHora1.value = "07:15";
        inputHora2.value = "";
        estadoLabel.innerText = `${nombreCurso} todavía no tiene horario guardado (usa 07:15 por defecto).`;
    }
}

async function guardarHorarioCurso() {
    const nombreCurso = document.getElementById("selectCursoHorario").value;
    const hora1 = document.getElementById("inputHoraLimite1").value;
    const hora2 = document.getElementById("inputHoraLimite2").value;

    if (!nombreCurso) {
        alert("Elegí primero un curso.");
        return;
    }
    if (!hora1) {
        alert("Ingresá al menos el horario límite 1.");
        return;
    }

    const { error } = await supabase2
        .from('cursos')
        .upsert(
            {
                nombre: nombreCurso,
                hora_limite_1: hora1,
                hora_limite_2: hora2 || null
            },
            { onConflict: 'nombre' }
        );

    if (error) {
        alert("Error al guardar el horario: " + error.message);
        console.error(error);
        return;
    }

    const resCursos = await supabase2.from('cursos').select('*');
    if (!resCursos.error) {
        listaCursos = resCursos.data || [];
    }

    llenarSelectsCursos();
    alCambiarCursoAdmin();
    renderizarAsistencias();
    alert(`¡Horarios de ${nombreCurso} guardados!`);
}

function renderizarAsistencias() {
    const tbody = document.querySelector("#tabla-asistencias tbody");
    const alumnoId = document.getElementById("filtroAlumno").value;
    const cursoFiltro = document.getElementById("filtroCursoAsist").value;
    const anio = document.getElementById("filtroAnio").value;
    const mes = document.getElementById("filtroMes").value;
    const dia = document.getElementById("filtroDia").value;

    let presentes = 0;
    let tardes = 0;
    let sinRegistrar = 0;
    let mostrados = 0;

    tbody.innerHTML = "";

    listaAsistencias.forEach(reg => {
        const alumno = buscarAlumno(reg);

        if (alumnoId && (!alumno || String(alumno.id) !== String(alumnoId))) {
            return;
        }

        const claveCurso = alumno ? obtenerClaveCurso(alumno) : "";
        if (cursoFiltro && claveCurso !== cursoFiltro) {
            return;
        }

        const fechaTexto = String(reg.fecha || "");
        const partes = fechaTexto.split("-");
        const regAnio = partes[0] || "";
        const regMes = partes[1] || "";
        const regDia = partes[2] || "";

        if (anio && regAnio !== anio) return;
        if (mes && regMes !== mes) return;
        if (dia && regDia !== dia) return;

        const cursoObj = buscarCursoDeAlumno(alumno);
        const estado = calcularEstado(alumno, reg.hora_entrada, cursoObj);
        const nombreCompleto = alumno ? `${alumno.apellido}, ${alumno.nombre}` : `UID ${reg.uid_leido}`;
        const dni = alumno ? alumno.dni : "—";
        const cursoDiv = claveCurso || "—";
        const turno = alumno ? alumno.turno : "—";
        const hora = reg.hora_entrada ? String(reg.hora_entrada).slice(0, 5) : "—";

        if (estado === "Presente") presentes++;
        else if (estado === "Llegada tarde") tardes++;
        else sinRegistrar++;
        mostrados++;

        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td>${fechaTexto || "—"}</td>
            <td>${nombreCompleto}</td>
            <td>${dni}</td>
            <td>${cursoDiv}</td>
            <td>${turno}</td>
            <td>${hora}</td>
            <td>${estado}</td>
        `;
        tbody.appendChild(fila);
    });

    if (mostrados === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay registros de asistencia para este filtro.</td></tr>';
    }

    document.getElementById("statPresentes").innerText = presentes;
    document.getElementById("statTardes").innerText = tardes;
    document.getElementById("statAusentes").innerText = sinRegistrar;
    document.getElementById("resumenFiltro").innerText = `${mostrados} registro${mostrados === 1 ? "" : "s"}`;

    const titulo = document.getElementById("tituloAsistencia");
    if (alumnoId) {
        const alumno = listaAlumnos.find(a => String(a.id) === String(alumnoId));
        titulo.innerText = alumno ? `Asistencias de ${alumno.nombre} ${alumno.apellido}` : "Registro de asistencias";
    } else {
        titulo.innerText = "Registro de asistencias";
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const selectDia = document.getElementById("filtroDia");
    if (selectDia) {
        for (let d = 1; d <= 31; d++) {
            const valor = d < 10 ? "0" + d : "" + d;
            selectDia.innerHTML += `<option value="${valor}">${valor}</option>`;
        }
    }

    document.getElementById("selectCursoHorario").addEventListener("change", alCambiarCursoAdmin);
    document.getElementById("btnGuardarHorario").addEventListener("click", guardarHorarioCurso);

    document.getElementById("filtroAlumno").addEventListener("change", renderizarAsistencias);
    document.getElementById("filtroCursoAsist").addEventListener("change", renderizarAsistencias);
    document.getElementById("filtroAnio").addEventListener("change", renderizarAsistencias);
    document.getElementById("filtroMes").addEventListener("change", renderizarAsistencias);
    document.getElementById("filtroDia").addEventListener("change", renderizarAsistencias);

    document.getElementById("btnLimpiarAsistencia").addEventListener("click", function () {
        document.getElementById("filtroAlumno").value = "";
        document.getElementById("filtroCursoAsist").value = "";
        document.getElementById("filtroMes").value = "";
        document.getElementById("filtroDia").value = "";
        renderizarAsistencias();
    });

    cargarDatosAsistencia();
});
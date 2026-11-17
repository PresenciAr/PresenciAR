const SUPABASE_URL = 'https://pqtpjvxyjdemcnpmnhxv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxdHBqdnh5amRlbWNucG1uaHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNjY0NzgsImV4cCI6MjA5Nzc0MjQ3OH0.qzzgN31vW22YseltVaTNbYp1CzyqNijX3OiQAbSnqac';

const supabase2 = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
/*
Medio importante en asistencias poner el horario por dia tambien osea que se pueda establecer los lunes un horario y el martes otro distinto(no es dificil)
confio en mi - Gracias que buena persona



*/
// Respaldo por si un curso todavía no tiene fila en la tabla "cursos"
const HORARIO_POR_DEFECTO = {
    "Mañana": "07:15",
    "Tarde": "12:40"
};

let listaAlumnos = [];
let listaCursos = [];
let listaAsistencias = [];
let listaDiasSinClase = [];

// Junta curso y división en un solo texto, por ejemplo: "6to 1ra"
function obtenerClaveCurso(alumno) {
    const curso = alumno.curso || "";
    const division = alumno.division || "";
    return `${curso} ${division}`.trim();
}

// Convierte "07:15" a minutos desde las 00:00 (7 * 60 + 15 = 435)
function minutosDesdeMedianoche(horaTexto) {
    const textoCorto = String(horaTexto).slice(0, 5);
    const partes = textoCorto.split(":");
    const horas = Number(partes[0]);
    const minutos = Number(partes[1]);
    return (horas * 60) + minutos;
}

// Crea una fecha en hora local para no correr un día por zona horaria
function crearFechaLocal(fechaTexto) {
    const textoCorto = String(fechaTexto).slice(0, 10);
    const partes = textoCorto.split("-");
    const anio = Number(partes[0]);
    const mes = Number(partes[1]) - 1;
    const dia = Number(partes[2]);
    return new Date(anio, mes, dia);
}

// Devuelve true si es sábado, domingo o si está en la tabla dias_sin_clase
function esDiaSinClase(fechaTexto) {
    if (!fechaTexto) {
        return false;
    }

    const fechaLimpia = String(fechaTexto).slice(0, 10);
    const fechaObj = crearFechaLocal(fechaLimpia);
    const diaSemana = fechaObj.getDay(); // 0 = Domingo, 6 = Sábado

    if (diaSemana === 0 || diaSemana === 6) {
        return true;
    }

    const encontrado = listaDiasSinClase.find(function (item) {
        const fechaItem = String(item.fecha || "").slice(0, 10);
        return fechaItem === fechaLimpia;
    });

    if (encontrado) {
        return true;
    }

    return false;
}

// Busca la fila de "cursos" que corresponde a un alumno
function buscarCursoDeAlumno(alumno) {
    if (!alumno) {
        return null;
    }

    const clave = obtenerClaveCurso(alumno);
    const cursoSolo = String(alumno.curso || "").trim();

    const encontrado = listaCursos.find(function (c) {
        return c.nombre === clave || c.nombre === cursoSolo;
    });

    return encontrado || null;
}

// Decide qué estado mostrar en la tabla
function calcularEstado(alumno, horaEntrada, cursoObj, fechaTexto) {
    if (esDiaSinClase(fechaTexto)) {
        return "Sin clase";
    }

    if (!alumno) {
        return "Tarjeta no registrada";
    }

    if (!horaEntrada) {
        return "Ausente";
    }

    const entradaMin = minutosDesdeMedianoche(horaEntrada);

    let limite1 = HORARIO_POR_DEFECTO[alumno.turno] || "07:15";
    if (cursoObj && cursoObj.hora_limite_1) {
        limite1 = String(cursoObj.hora_limite_1).slice(0, 5);
    }

    let limite2 = null;
    if (cursoObj && cursoObj.hora_limite_2) {
        limite2 = String(cursoObj.hora_limite_2).slice(0, 5);
    }

    // Si el curso solo tiene un horario límite, comparamos directo contra ese
    if (!limite2) {
        if (entradaMin <= minutosDesdeMedianoche(limite1)) {
            return "Presente";
        } else {
            return "Llegada tarde";
        }
    }

    // Si tiene dos horarios (ej. aula y taller), elegimos el que esté más cerca
    const dist1 = Math.abs(entradaMin - minutosDesdeMedianoche(limite1));
    const dist2 = Math.abs(entradaMin - minutosDesdeMedianoche(limite2));

    let limiteElegido = limite1;
    if (dist2 < dist1) {
        limiteElegido = limite2;
    }

    if (entradaMin <= minutosDesdeMedianoche(limiteElegido)) {
        return "Presente";
    } else {
        return "Llegada tarde";
    }
}

// Busca el alumno dueño de una lectura de asistencia
function buscarAlumno(reg) {
    if (reg.alumno_id) {
        const porId = listaAlumnos.find(function (a) {
            return String(a.id) === String(reg.alumno_id);
        });
        if (porId) {
            return porId;
        }
    }

    if (reg.uid_leido) {
        const porSube = listaAlumnos.find(function (a) {
            return String(a.uid_sube) === String(reg.uid_leido);
        });
        if (porSube) {
            return porSube;
        }
    }

    return null;
}

// Carga alumnos, cursos, asistencias y días sin clase desde Supabase
async function cargarDatosAsistencia() {
    const resAlumnos = await supabase2.from('alumnos').select('*');
    const resCursos = await supabase2.from('cursos').select('*');
    const resAsist = await supabase2
        .from('asistencias')
        .select('id, alumno_id, uid_leido, terminal_id, fecha, hora_entrada')
        .order('fecha', { ascending: false })
        .order('hora_entrada', { ascending: false });
    const resSinClase = await supabase2
        .from('dias_sin_clase')
        .select('fecha, motivo')
        .order('fecha', { ascending: true });

    if (resAlumnos.error || resCursos.error || resAsist.error || resSinClase.error) {
        console.error(
            'Error al cargar datos:',
            resAlumnos.error || resCursos.error || resAsist.error || resSinClase.error
        );
        return;
    }

    listaAlumnos = resAlumnos.data || [];
    listaCursos = resCursos.data || [];
    listaAsistencias = resAsist.data || [];
    listaDiasSinClase = resSinClase.data || [];

    llenarSelectAlumnos();
    llenarSelectsCursos();
    renderizarDiasSinClase();

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
    if (!selectAlumno) {
        return;
    }

    selectAlumno.innerHTML = '<option value="">Alumno: todos</option>';

    listaAlumnos.forEach(function (a) {
        selectAlumno.innerHTML += `<option value="${a.id}">${a.apellido}, ${a.nombre} (${a.dni})</option>`;
    });
}

function llenarSelectsCursos() {
    const selectAdmin = document.getElementById("selectCursoHorario");
    const selectFiltro = document.getElementById("filtroCursoAsist");

    const nombresCursos = [];

    listaAlumnos.forEach(function (a) {
        const clave = obtenerClaveCurso(a);
        if (clave && !nombresCursos.includes(clave)) {
            nombresCursos.push(clave);
        }
    });

    listaCursos.forEach(function (c) {
        if (c.nombre) {
            const nombreLimpio = c.nombre.trim();
            if (nombreLimpio && !nombresCursos.includes(nombreLimpio)) {
                nombresCursos.push(nombreLimpio);
            }
        }
    });

    nombresCursos.sort();

    if (selectAdmin) {
        const previoAdmin = selectAdmin.value;
        selectAdmin.innerHTML = '<option value="">Seleccionar curso...</option>';

        nombresCursos.forEach(function (nombre) {
            const info = listaCursos.find(function (c) {
                return c.nombre === nombre;
            });

            let resumenHorarios = " (sin configurar)";
            if (info && info.hora_limite_1) {
                const h1 = String(info.hora_limite_1).slice(0, 5);
                if (info.hora_limite_2) {
                    const h2 = String(info.hora_limite_2).slice(0, 5);
                    resumenHorarios = ` (${h1} / ${h2})`;
                } else {
                    resumenHorarios = ` (${h1})`;
                }
            }

            selectAdmin.innerHTML += `<option value="${nombre}">${nombre}${resumenHorarios}</option>`;
        });

        if (previoAdmin) {
            selectAdmin.value = previoAdmin;
        }
    }

    if (selectFiltro) {
        const previoFiltro = selectFiltro.value;
        selectFiltro.innerHTML = '<option value="">Curso: todos</option>';

        nombresCursos.forEach(function (nombre) {
            selectFiltro.innerHTML += `<option value="${nombre}">${nombre}</option>`;
        });

        if (previoFiltro) {
            selectFiltro.value = previoFiltro;
        }
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

    const info = listaCursos.find(function (c) {
        return c.nombre === nombreCurso;
    });

    if (info && info.hora_limite_1) {
        inputHora1.value = String(info.hora_limite_1).slice(0, 5);
        if (info.hora_limite_2) {
            inputHora2.value = String(info.hora_limite_2).slice(0, 5);
            estadoLabel.innerText = `Horarios de ${nombreCurso}: ${inputHora1.value} y ${inputHora2.value}.`;
        } else {
            inputHora2.value = "";
            estadoLabel.innerText = `Horarios de ${nombreCurso}: ${inputHora1.value} (sin segundo horario).`;
        }
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

    let segundoHorario = null;
    if (hora2) {
        segundoHorario = hora2;
    }

    const resultado = await supabase2
        .from('cursos')
        .upsert(
            {
                nombre: nombreCurso,
                hora_limite_1: hora1,
                hora_limite_2: segundoHorario
            },
            { onConflict: 'nombre' }
        );

    if (resultado.error) {
        alert("Error al guardar el horario: " + resultado.error.message);
        console.error(resultado.error);
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

// Dibuja la mini-tabla de días sin clase cargados a mano
function renderizarDiasSinClase() {
    const tbody = document.querySelector("#tabla-dias-sin-clase tbody");
    const anioSelect = document.getElementById("filtroAnio");

    if (!tbody) {
        return;
    }

    let anioActual = "";
    if (anioSelect) {
        anioActual = anioSelect.value;
    }

    const nombresDias = [
        "Domingo",
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado"
    ];

    const filtrados = listaDiasSinClase.filter(function (item) {
        const fechaStr = String(item.fecha || "").slice(0, 10);
        if (!anioActual) {
            return true;
        }
        return fechaStr.startsWith(anioActual + "-");
    });

    tbody.innerHTML = "";

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Sin días sin clase cargados para este año.</td></tr>';
        return;
    }

    filtrados.forEach(function (item) {
        const fechaStr = String(item.fecha || "").slice(0, 10);
        const fechaObj = crearFechaLocal(fechaStr);
        const nombreDia = nombresDias[fechaObj.getDay()];
        const motivo = item.motivo || "Sin clase";

        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td>${fechaStr}</td>
            <td>${nombreDia}</td>
            <td>${motivo}</td>
            <td>
                <button type="button" onclick="eliminarDiaSinClase('${fechaStr}')">Quitar</button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

// Agrega un día sin clase a Supabase
async function agregarDiaSinClase() {
    const inputFecha = document.getElementById("inputFechaSinClase");
    const inputMotivo = document.getElementById("inputMotivoSinClase");

    const fecha = inputFecha.value;
    let motivo = inputMotivo.value.trim();
    if (!motivo) {
        motivo = "Día sin clase";
    }

    if (!fecha) {
        alert("Elegí una fecha.");
        return;
    }

    const fechaObj = crearFechaLocal(fecha);
    const diaSemana = fechaObj.getDay();
    if (diaSemana === 0 || diaSemana === 6) {
        alert("Sábados y domingos ya se consideran sin clase automáticamente.");
        return;
    }

    const resultado = await supabase2
        .from('dias_sin_clase')
        .upsert(
            {
                fecha: fecha,
                motivo: motivo
            },
            { onConflict: 'fecha' }
        );

    if (resultado.error) {
        alert("Error al guardar el día sin clase: " + resultado.error.message);
        console.error(resultado.error);
        return;
    }

    inputFecha.value = "";
    inputMotivo.value = "";

    const resSinClase = await supabase2
        .from('dias_sin_clase')
        .select('fecha, motivo')
        .order('fecha', { ascending: true });

    if (!resSinClase.error) {
        listaDiasSinClase = resSinClase.data || [];
    }

    renderizarDiasSinClase();
    renderizarAsistencias();
}

// Borra un día sin clase de Supabase
async function eliminarDiaSinClase(fechaStr) {
    const resultado = await supabase2
        .from('dias_sin_clase')
        .delete()
        .eq('fecha', fechaStr);

    if (resultado.error) {
        alert("Error al quitar el día: " + resultado.error.message);
        console.error(resultado.error);
        return;
    }

    const resSinClase = await supabase2
        .from('dias_sin_clase')
        .select('fecha, motivo')
        .order('fecha', { ascending: true });

    if (!resSinClase.error) {
        listaDiasSinClase = resSinClase.data || [];
    }

    renderizarDiasSinClase();
    renderizarAsistencias();
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

    listaAsistencias.forEach(function (reg) {
        const alumno = buscarAlumno(reg);

        if (alumnoId) {
            if (!alumno || String(alumno.id) !== String(alumnoId)) {
                return;
            }
        }

        let claveCurso = "";
        if (alumno) {
            claveCurso = obtenerClaveCurso(alumno);
        }

        if (cursoFiltro) {
            if (claveCurso !== cursoFiltro) {
                return;
            }
        }

        const fechaTexto = String(reg.fecha || "");
        const partes = fechaTexto.split("-");
        const regAnio = partes[0] || "";
        const regMes = partes[1] || "";
        const regDia = partes[2] || "";

        if (anio && regAnio !== anio) {
            return;
        }
        if (mes && regMes !== mes) {
            return;
        }
        if (dia && regDia !== dia) {
            return;
        }

        const cursoObj = buscarCursoDeAlumno(alumno);
        const estado = calcularEstado(alumno, reg.hora_entrada, cursoObj, fechaTexto);

        let nombreCompleto = `UID ${reg.uid_leido}`;
        if (alumno) {
            nombreCompleto = `${alumno.apellido}, ${alumno.nombre}`;
        }

        let dni = "—";
        if (alumno && alumno.dni) {
            dni = alumno.dni;
        }

        let cursoDiv = "—";
        if (claveCurso) {
            cursoDiv = claveCurso;
        }

        let turno = "—";
        if (alumno && alumno.turno) {
            turno = alumno.turno;
        }

        let hora = "—";
        if (reg.hora_entrada) {
            hora = String(reg.hora_entrada).slice(0, 5);
        }

        if (estado === "Presente") {
            presentes++;
        } else if (estado === "Llegada tarde") {
            tardes++;
        } else if (estado !== "Sin clase") {
            sinRegistrar++;
        }

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

    if (mostrados === 1) {
        document.getElementById("resumenFiltro").innerText = "1 registro";
    } else {
        document.getElementById("resumenFiltro").innerText = `${mostrados} registros`;
    }

    const titulo = document.getElementById("tituloAsistencia");
    if (alumnoId) {
        const alumno = listaAlumnos.find(function (a) {
            return String(a.id) === String(alumnoId);
        });
        if (alumno) {
            titulo.innerText = `Asistencias de ${alumno.nombre} ${alumno.apellido}`;
        } else {
            titulo.innerText = "Registro de asistencias";
        }
    } else {
        titulo.innerText = "Registro de asistencias";
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const selectDia = document.getElementById("filtroDia");
    if (selectDia) {
        for (let d = 1; d <= 31; d++) {
            let valor = String(d);
            if (d < 10) {
                valor = "0" + d;
            }
            selectDia.innerHTML += `<option value="${valor}">${valor}</option>`;
        }
    }

    document.getElementById("selectCursoHorario").addEventListener("change", alCambiarCursoAdmin);
    document.getElementById("btnGuardarHorario").addEventListener("click", guardarHorarioCurso);

    document.getElementById("btnAgregarSinClase").addEventListener("click", agregarDiaSinClase);

    document.getElementById("filtroAlumno").addEventListener("change", renderizarAsistencias);
    document.getElementById("filtroCursoAsist").addEventListener("change", renderizarAsistencias);
    document.getElementById("filtroAnio").addEventListener("change", function () {
        renderizarDiasSinClase();
        renderizarAsistencias();
    });
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
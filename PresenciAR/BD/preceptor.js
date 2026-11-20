const SUPABASE_URL = 'https://pqtpjvxyjdemcnpmnhxv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxdHBqdnh5amRlbWNucG1uaHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNjY0NzgsImV4cCI6MjA5Nzc0MjQ3OH0.qzzgN31vW22YseltVaTNbYp1CzyqNijX3OiQAbSnqac';

const supabase2 = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let listaAlumnos = [];
let listaCursos = [];
let listaAsistencias = [];
let listaPartes = [];

function obtenerClaveCurso(alumno) {
    return `${alumno.curso || ""} ${alumno.division || ""}`.trim();
}

function minutosDesdeMedianoche(horaTexto) {
    const [h, m] = String(horaTexto).slice(0, 5).split(":").map(Number);
    return h * 60 + m;
}

function obtenerLimiteDelBloque(cursoObj, bloque) {
    if (!cursoObj) return "07:15";
    if (bloque === "2" && cursoObj.hora_limite_2) {
        return String(cursoObj.hora_limite_2).slice(0, 5);
    }
    if (cursoObj.hora_limite_1) {
        return String(cursoObj.hora_limite_1).slice(0, 5);
    }
    return "07:15";
}

function buscarAlumnoPorLectura(reg) {
    if (reg.alumno_id) {
        const porId = listaAlumnos.find(a => String(a.id) === String(reg.alumno_id));
        if (porId) return porId;
    }
    if (reg.uid_leido) {
        return listaAlumnos.find(a => String(a.uid_sube) === String(reg.uid_leido));
    }
    return null;
}

async function cargarTodo() {
    const hoy = new Date().toISOString().slice(0, 10);
    const inputFecha = document.getElementById("inputFechaPreceptor");
    if (inputFecha && !inputFecha.value) {
        inputFecha.value = hoy;
    }

    const resAlumnos = await supabase2.from('alumnos').select('*');
    const resCursos = await supabase2.from('cursos').select('*');
    const resAsist = await supabase2.from('asistencias').select('*');
    const resPartes = await supabase2.from('partes_preceptor').select('*');

    if (resAlumnos.error || resCursos.error || resAsist.error) {
        console.error('Error al cargar:', resAlumnos.error || resCursos.error || resAsist.error);
        return;
    }

    listaAlumnos = resAlumnos.data || [];
    listaCursos = resCursos.data || [];
    listaAsistencias = resAsist.data || [];
    listaPartes = resPartes.error ? [] : (resPartes.data || []);

    llenarSelectCursos();
}

function llenarSelectCursos() {
    const select = document.getElementById("selectCursoPreceptor");
    if (!select) return;

    const cursos = new Set();
    listaAlumnos.forEach(a => {
        const clave = obtenerClaveCurso(a);
        if (clave) cursos.add(clave);
    });

    select.innerHTML = '<option value="">Elegir curso...</option>';
    Array.from(cursos).sort().forEach(c => {
        select.innerHTML += `<option value="${c}">${c}</option>`;
    });
}

function renderizarListaPreceptor() {
    const cursoClave = document.getElementById("selectCursoPreceptor").value;
    const fecha = document.getElementById("inputFechaPreceptor").value;
    const bloque = document.getElementById("selectBloquePreceptor").value;
    const tbody = document.querySelector("#tabla-preceptor tbody");
    const aviso = document.getElementById("avisoSobrantes");

    if (!cursoClave || !fecha) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Elegí un curso y una fecha para ver la lista…</td></tr>';
        return;
    }

    const alumnosCurso = listaAlumnos
        .filter(a => a.activo !== false && obtenerClaveCurso(a) === cursoClave)
        .sort((a, b) => String(a.apellido).localeCompare(String(b.apellido)));

    const cursoObj = listaCursos.find(c => c.nombre === cursoClave) || null;
    const limiteHora = obtenerLimiteDelBloque(cursoObj, bloque);
    const limiteMin = minutosDesdeMedianoche(limiteHora);

    const asistenciasFecha = listaAsistencias.filter(r => String(r.fecha) === fecha);

    let marcadosSube = 0;
    let sobrantes = 0;
    tbody.innerHTML = "";

    alumnosCurso.forEach((alumno, idx) => {
        // Buscamos lectura de este alumno en esa fecha
        const lectura = asistenciasFecha.find(r => {
            const encontrado = buscarAlumnoPorLectura(r);
            return encontrado && String(encontrado.id) === String(alumno.id);
        });

        let estadoAuto = "Ausente";
        let horaTexto = "—";

        if (lectura && lectura.hora_entrada) {
            marcadosSube++;
            horaTexto = String(lectura.hora_entrada).slice(0, 5);
            const entradaMin = minutosDesdeMedianoche(horaTexto);
            estadoAuto = entradaMin <= limiteMin ? "Presente" : "Llegada tarde";
        }

        // Revisamos si el preceptor ya había guardado un estado manual para este día
        const parteGuardado = listaPartes.find(
            p => String(p.fecha) === fecha &&
                 p.curso_clave === cursoClave &&
                 String(p.alumno_id) === String(alumno.id)
        );
        const estadoActual = parteGuardado ? parteGuardado.estado : estadoAuto;

        const fila = document.createElement("tr");
        fila.dataset.alumnoId = alumno.id;
        fila.innerHTML = `
            <td>${idx + 1}</td>
            <td>${alumno.apellido}, ${alumno.nombre}</td>
            <td>${alumno.dni}</td>
            <td>${horaTexto}</td>
            <td>${estadoAuto}</td>
            <td>
                <select class="select-control estado-preceptor" data-alumno-id="${alumno.id}">
                    <option value="Presente" ${estadoActual === "Presente" ? "selected" : ""}>Presente</option>
                    <option value="Llegada tarde" ${estadoActual === "Llegada tarde" ? "selected" : ""}>Llegada tarde</option>
                    <option value="Ausente" ${estadoActual === "Ausente" ? "selected" : ""}>Ausente</option>
                    <option value="Justificado" ${estadoActual === "Justificado" ? "selected" : ""}>Justificado</option>
                </select>
            </td>
        `;
        tbody.appendChild(fila);
    });

    // Detectar lecturas de SUBE de alumnos de OTROS cursos o tarjetas sin vincular en esa fecha
    asistenciasFecha.forEach(reg => {
        const alumno = buscarAlumnoPorLectura(reg);
        if (!alumno || obtenerClaveCurso(alumno) !== cursoClave) {
            sobrantes++;
        }
    });

    const esperados = alumnosCurso.length;
    const dif = marcadosSube - esperados;

    document.getElementById("statEsperados").innerText = esperados;
    document.getElementById("statSube").innerText = marcadosSube;
    document.getElementById("statDiferencia").innerText = (dif > 0 ? `${dif}` : `${dif * -1}`);

    const detalle = document.getElementById("detalleDiferencia");
    if (dif === 0) {
        detalle.innerText = "Coincide con el total del curso";
    } else if (dif < 0) {
        detalle.innerText = `Faltan ${Math.abs(dif)} respecto al total del curso`;
    } else {
        detalle.innerText = `Hay ${dif} lectura(s) extra respecto al curso`;
    }

    if (sobrantes > 0) {
        aviso.style.display = "block";
        aviso.innerText = `Atención: hay ${sobrantes} lectura(s) de SUBE el ${fecha} que no pertenecen a ${cursoClave} o no están vinculadas.`;
    } else {
        aviso.style.display = "none";
        aviso.innerText = "";
    }

    document.getElementById("tituloCursoPreceptor").innerText = `Curso ${cursoClave}`;
    document.getElementById("infoBloquePreceptor").innerText = `Fecha: ${fecha} · Límite del bloque ${bloque}: ${limiteHora} hs`;
}

async function guardarPartePreceptor() {
    const cursoClave = document.getElementById("selectCursoPreceptor").value;
    const fecha = document.getElementById("inputFechaPreceptor").value;

    if (!cursoClave || !fecha) {
        alert("Elegí un curso y una fecha.");
        return;
    }

    // Hora actual para dejar evidencia de cuándo intervino el preceptor
    const ahora = new Date();
    const horaActual = ahora.toTimeString().slice(0, 8);

    const selects = Array.from(document.querySelectorAll(".estado-preceptor"));
    const filasParaGuardar = selects.map(sel => ({
        fecha: fecha,
        curso_clave: cursoClave,
        alumno_id: Number(sel.dataset.alumnoId),
        estado: sel.value,
        hora_modificacion: horaActual
    }));

    const { error } = await supabase2
        .from('partes_preceptor')
        .upsert(filasParaGuardar, { onConflict: 'fecha,curso_clave,alumno_id' });

    if (error) {
        alert("Error al guardar el parte: " + error.message);
        console.error(error);
        return;
    }

    // Reflejamos en la tabla principal "asistencias": reemplazamos si ya existe el registro de ese alumno en esa fecha,
    // o creamos uno nuevo si el alumno no tenía fichada en esa fecha (ej. llegó tarde y lo cargó el preceptor).
    for (const fila of filasParaGuardar) {
        const alumno = listaAlumnos.find(a => Number(a.id) === Number(fila.alumno_id));
        const existente = listaAsistencias.find(
            r => String(r.fecha).slice(0, 10) === fecha &&
                 String(r.alumno_id) === String(fila.alumno_id)
        );

        if (existente) {
            const { error: errUpdate } = await supabase2
                .from('asistencias')
                .update({
                    hora_entrada: existente.hora_entrada || horaActual,
                    uid_leido: existente.uid_leido || (alumno && alumno.uid_sube ? alumno.uid_sube : "PRECEPTOR")
                })
                .eq('id', existente.id);

            if (errUpdate) {
                console.error("Error al actualizar asistencia:", errUpdate);
            }
        } else if (fila.estado !== "Ausente") {
            const { error: errInsert } = await supabase2
                .from('asistencias')
                .insert({
                    fecha: fecha,
                    alumno_id: fila.alumno_id,
                    uid_leido: (alumno && alumno.uid_sube) ? alumno.uid_sube : "PRECEPTOR",
                    terminal_id: "PRECEPTOR",
                    hora_entrada: horaActual
                });

            if (errInsert) {
                console.error("Error al insertar asistencia desde preceptor:", errInsert);
            }
        }
    }

    const resPartes = await supabase2.from('partes_preceptor').select('*');
    if (!resPartes.error) {
        listaPartes = resPartes.data || [];
    }

    const resAsist = await supabase2.from('asistencias').select('*');
    if (!resAsist.error) {
        listaAsistencias = resAsist.data || [];
    }

    renderizarListaPreceptor();
    alert(`Parte de ${cursoClave} (${fecha}) guardado a las ${horaActual.slice(0, 5)} hs.`);
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("selectCursoPreceptor").addEventListener("change", renderizarListaPreceptor);
    document.getElementById("inputFechaPreceptor").addEventListener("change", renderizarListaPreceptor);
    document.getElementById("selectBloquePreceptor").addEventListener("change", renderizarListaPreceptor);
    document.getElementById("btnGuardarParte").addEventListener("click", guardarPartePreceptor);

    document.getElementById("btnMarcarTodosPresentes").addEventListener("click", function () {
        document.querySelectorAll(".estado-preceptor").forEach(sel => {
            sel.value = "Presente";
        });
    });

    cargarTodo();
});

/*
Recordatorio para el yo de dentro de unos dias:

en index.html esta la ruta a los demas archivos es como el menu principal que siempre va a ver el preceptor

preceptor.hmtl es para la vista y correcion del preceptor por curso que pase

asistencias.html su principal funcion fue retirada lo tenemos que borrar de futuras entregas del projecto

asistencias1.html aca se ven las asistencias en crudo que registran las teminales

base-de-datos.html es para ver los datos privados de los alumnos asi como su sube asociada


en lo que respecta a las tablas, alguien las limpio a todas y no tienen datos en la actualidad,
sospecho que fue oscar o algo paso no importa por que tenemos planeado migrar la base de datos de supabase a 
el raspberry pi para tenerlo a modo servidor local y no depender de servicios externos.
Por lo pronto vamos a tener que arreglar los lijeros problemas que tiene el projecto, entre ellos por orden de
prioridad tengo que:

*hacer este javascript para que los preceptores puedan visualizar de forma correcta los ausentes por el momento estoy viendo algo
y es el simple hecho de a lo mejor no contar los dias presentes y ausentes como tal.
// hola yo del futuro soy el yo del pasado no tan pasado como el bobo que escribio lo de arriba esta es una aclaracion importante
por que se me complica continuar esta parte hasta la otra semana asi que te dejo una nota por que te conozco y te vas a olvidar
anteriormente me explique medio mal ahora lo razono mas mejor. Bueno estoy pensando en si el preceptor le conviene de momento
el no tener la cantidad de ausentes. por que te preguntaras y eso es por que se complican los feriados y ademas los ausentes 
por que como estamos estructurando las cosas al parecer contamos los fines de semana como ausente por que en realidad contamos
los precentes y hacemos el calculo en base a eso. Bueno la idea es que los preceptores pongan cuantas clases va a haber este ciclo lectivo
mejor dicho la administracion y en base a eso haga el calculo de ausentes en base a las clases pasada... ok lo pienso mejor la otra semana
pero me gusto la idea sabelo.

*poner bien los links por que estan redireccionados a cualquier lado en la actualidad

*en cada alumno poner por las dudas una tabla individual de los presentes y ausentes

*que los fines de semana no se cuenten y ademas los feriados tampoco

*estructurar las tablas en la bd para que queden mas unidas es decir simplificarlas para mejor entendimiento

*cargar minimo 2 cursos y probar que el sistema funcione antes del 20/11

*explicarle a todos los demas como funciona el backend de forma detallada y simple para su mente mortal

*delegar todas las tareas relacionadas al proyecto a los demas por que vamos justos de tiempo como para hacer otra cosa

*ayudar a casoni a romperle su aplicacion para que visualizen el poder de un usuario que le cuesta mentalmente



*/
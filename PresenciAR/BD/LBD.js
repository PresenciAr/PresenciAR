//Archivo de Lectura de BD
//Los comentarios de locura del autor no deben modificarse bajo ningun contexto
//a menos que se de permiso para lo mismo o alex este a punto de mirar el codigo si lo hace
//asignacion estrategica: despues de terminar toda mi parte le doy a azari para que lo rompa como el guste pero con la intension
//de que lo haga bonito y no quede asi feisimo
const SUPABASE_URL = 'https://pqtpjvxyjdemcnpmnhxv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxdHBqdnh5amRlbWNucG1uaHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNjY0NzgsImV4cCI6MjA5Nzc0MjQ3OH0.qzzgN31vW22YseltVaTNbYp1CzyqNijX3OiQAbSnqac';

// Inicializar el cliente
const supabase2 = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let filtroBusqueda = "";
let filtroEstado = "todos";
let filtroCurso = "";
let filtroTurno = "";

async function cargarAlumnos() {
    // Hacemos la consulta a la tabla
    const { data, error } = await supabase2
        .from('alumnos')
        .select('*');

    if (error) {
        console.error('Error al obtener datos:', error);
        return;
    }

    // Seleccionamos el cuerpo de la tabla en el HTML
    const tbody = document.querySelector('#tabla-alumnos tbody');
    tbody.innerHTML = ''; // Limpiar la tabla si tenía algo

    //  los registros devueltos por Supabase
    data.forEach(alumnos => {
        const fila = document.createElement('tr');
        fila.id = `fila-${alumnos.id}`;

        //notas para recordar o tener en cuenta:
        //cambiar por uno mismo o decirle a villalba el estado activo a si o no
        //se va a deshabilitar hasta nuevo aviso la modificacion de sube desde el boton de modificacion de alumno
        //la modificacion de sube la voy a debatir con la almohada que hacer

        //despues de una seria discusion con la almohada y que hayan pasado unos dias de descanso cof cof
        //decidi entre estas 3 opciones
        //opcion 1: poner un boton aparte para vincular la sube
        //opcion 2: aparecer un boton donde sale el uid al apretar editar alumno
        //opcion 3: poner un apartado completamente aparte

        //actualizacion: la indecision me mata asi que voy a hacer la primera cualquier cosa puedo hacer las otras
        //a futuro implementar un boton de volver o cancelar en las paginas
        let estado;
        if (alumnos.activo == true) {
            estado = "Activo";
        } else {
            estado = "Inactivo";
        }

        fila.innerHTML = `
            <td>${alumnos.id}</td>
            <td class="nombre">${alumnos.nombre}</td>
            <td class="apellido">${alumnos.apellido}</td>
            <td class="dni">${alumnos.dni}</td>
            <td class="curso">${alumnos.curso}</td>
            <td class="division">${alumnos.division}</td>
            <td class="turno">${alumnos.turno}</td>
            <td class="uid_sube">${alumnos.uid_sube ? alumnos.uid_sube : "—"}</td>
            <td class="activo">${estado}</td>
            <td>
                <button type="button" onclick="habilitarEdicion('${alumnos.id}')">Editar Alumno</button>
                <button type="button" onclick="editarSube('${alumnos.id}')" style="background-color: #0046e9; color: white;"> Editar Sube</button>
                <button onclick="verAsistencias('${alumnos.id}')">Asistencias</button>
            </td>
        `;
        tbody.appendChild(fila);
    });

    cargarOpcionesFiltros();
    actualizarCursos();
    aplicarFiltros();
}

//a partir de aca modificaciones que rompen el codigo, yo tene cuidado atte: yo del pasado
// 2. FUNCIÓN PARA TRANSFORMAR LA FILA EN CAMPOS EDITABLES
function habilitarEdicion(id) {
    const fila = document.getElementById(`fila-${id}`);

    const nombre = fila.querySelector('.nombre').innerText;
    const apellido = fila.querySelector('.apellido').innerText;
    const dni = fila.querySelector('.dni').innerText;
    const curso = fila.querySelector('.curso').innerText;
    const division = fila.querySelector('.division').innerText;
    const turno = fila.querySelector('.turno').innerText;
    const activo = fila.querySelector('.activo').innerText;

    fila.querySelector('.nombre').innerHTML = `<input type="text" id="input-nombre-${id}" value="${nombre}">`;
    fila.querySelector('.apellido').innerHTML = `<input type="text" id="input-apellido-${id}" value="${apellido}">`;
    fila.querySelector('.dni').innerHTML = `<input type="text" id="input-dni-${id}" value="${dni}">`;
    fila.querySelector('.curso').innerHTML = `<input type="text" id="input-curso-${id}" value="${curso}">`;
    fila.querySelector('.division').innerHTML = `<input type="text" id="input-division-${id}" value="${division}">`;
    fila.querySelector('.turno').innerHTML = `<input type="text" id="input-turno-${id}" value="${turno}">`;
    //deshabilitado
    //fila.querySelector('.uid_sube').innerHTML=`<input type="text" id="input-uid_sube-${id}" value="${uid_sube}">`;

    const estaActivo = activo === "Activo";
    fila.querySelector('.activo').innerHTML = `
        <select id="input-activo-${id}">
            <option value="true" ${estaActivo ? "selected" : ""}>Activo</option>
            <option value="false" ${!estaActivo ? "selected" : ""}>Inactivo</option>
        </select>
    `;

    // despues de mucho el error eran las comillas simples en id
    fila.querySelector('td:last-child').innerHTML = `
        <button type="button" onclick="actualizar('${id}')" style="background-color: #4CAF50; color: white;"> Guardar</button>
        <button type="button" onclick="cargarAlumnos()" style="background-color: #f44336; color: white;"> Cancelar</button>
    `;
}

// 3. FUNCIÓN QUE ENVÍA LOS CAMBIOS A SUPABASE
async function actualizar(id) {
    const nuevoNombre = document.getElementById(`input-nombre-${id}`).value.trim();
    const nuevoApellido = document.getElementById(`input-apellido-${id}`).value.trim();
    const nuevoDni = document.getElementById(`input-dni-${id}`).value.trim();
    const nuevoCurso = document.getElementById(`input-curso-${id}`).value.trim();
    const nuevoDivision = document.getElementById(`input-division-${id}`).value.trim();
    const nuevoTurno = document.getElementById(`input-turno-${id}`).value.trim();
    // const nuevoUid_sube=document.getElementById(`input-uid_sube-${id}`).value;
    const nuevoActivo = document.getElementById(`input-activo-${id}`).value === "true";

    const { error } = await supabase2
        .from('alumnos')
        .update({
            nombre: nuevoNombre,
            apellido: nuevoApellido,
            dni: nuevoDni,
            curso: nuevoCurso,
            division: nuevoDivision,
            turno: nuevoTurno,
            activo: nuevoActivo
        })
        .eq('id', id);

    if (error) {
        alert('Error al actualizar en la base de datos: ' + error.message);
        console.error(error);
        return;
    }

    alert('¡Alumno actualizado correctamente!');
    cargarAlumnos();
}
async function subeYaAsignada(uidSube, alumnoIdActual) {
    const uidLimpio = String(uidSube || "").trim();
    if (!uidLimpio) {
        return false;
    }

    const { data, error } = await supabase2
        .from('alumnos')
        .select('id, nombre, apellido, dni')
        .eq('uid_sube', uidLimpio);

    if (error) {
        alert('Error al verificar si la SUBE ya está en uso: ' + error.message);
        console.error(error);
        return true; // Por seguridad frenamos si falló la consulta
    }

    const otroAlumno = (data || []).find(function (alumno) {
        return String(alumno.id) !== String(alumnoIdActual);
    });

    if (otroAlumno) {
        alert(`Esa SUBE ya pertenece a ${otroAlumno.apellido}, ${otroAlumno.nombre} (DNI: ${otroAlumno.dni}).`);
        return true;
    }

    return false;
}

async function regresoPortal() {
    const id = localStorage.getItem('id');
    const nuevoUid_sube = String(localStorage.getItem('portal') || "").trim();

    if (!nuevoUid_sube) {
        alert('No se detectó un código de SUBE válido.');
        return;
    }

    const duplicada = await subeYaAsignada(nuevoUid_sube, id);
    if (duplicada) {
        return;
    }

    const { error } = await supabase2
        .from('alumnos')
        .update({ uid_sube: nuevoUid_sube })
        .eq('id', id);

    if (error) {
        alert('Error al actualizar en la base de datos: ' + error.message);
        console.error(error);
        return;
    }

    alert('¡Alumno actualizado correctamente!');
}

async function confirmRegresoPortal() {
    const id = localStorage.getItem('id');
    const nuevoUid_sube = localStorage.getItem('portal');
    if (id != null && nuevoUid_sube != null) {
        await regresoPortal();
        localStorage.removeItem('id');
        localStorage.removeItem('portal');
    }
    await cargarAlumnos();
}

//traer todo el archivo js de Lnfc y usarlo entero modificando ¿la parte visual?
//cambio de planes simplemente redirecciono la pagina si se detecto una tarjeta
function editarSube(id) {
    localStorage.setItem('id', id);
    window.location.href = "../Lector/lectura-nfc.html";
}

// --- MODAL Y AGREGAR ALUMNO ---
function abrirModal() {
    const backdrop = document.getElementById("modalBackdrop");
    if (backdrop) {
        backdrop.classList.add("open");
        backdrop.setAttribute("aria-hidden", "false");
    }
}

function cerrarModal() {
    const backdrop = document.getElementById("modalBackdrop");
    const form = document.getElementById("alumnoForm");
    if (backdrop) {
        backdrop.classList.remove("open");
        backdrop.setAttribute("aria-hidden", "true");
    }
    if (form) {
        form.reset();
    }
}

async function guardarNuevoAlumno(evento) {
    evento.preventDefault();

    const form = evento.target;
    const nombre = form.nombre.value.trim();
    const apellido = form.apellido.value.trim();
    const dni = form.dni.value.trim();
    const curso = form.curso.value.trim();
    const division = form.division.value.trim();
    const turno = form.turno.value.trim();
    const activobool = form.activo.checked;

    const { error } = await supabase2
        .from('alumnos')
        .insert([{
            nombre: nombre,
            apellido: apellido,
            dni: dni,
            curso: curso,
            division: division,
            turno: turno,
            activo: activobool
        }]);

    if (error) {
        alert('Error al insertar el alumno en Supabase: ' + error.message);
        console.error(error);
        return;
    }

    alert('¡Alumno registrado con éxito!');
    cerrarModal();
    cargarAlumnos();
}

function obtenerFilas() {
    return Array.from(document.querySelectorAll("#tabla-alumnos tbody tr"));
}

function cargarOpcionesFiltros() {
    const selectCurso = document.getElementById("filtroCurso");
    const selectTurno = document.getElementById("filtroTurno");
    const filas = obtenerFilas().filter(fila => fila.querySelector(".nombre"));

    if (selectCurso) {
        const cursosUnicos = [];
        filas.forEach(fila => {
            const c = fila.querySelector(".curso").innerText.trim();
            if (c && !cursosUnicos.includes(c)) {
                cursosUnicos.push(c);
            }
        });
        cursosUnicos.sort();
        selectCurso.innerHTML = '<option value="">Curso: todos</option>';
        cursosUnicos.forEach(c => {
            selectCurso.innerHTML += `<option value="${c}">${c}</option>`;
        });
        selectCurso.value = filtroCurso;
    }

    if (selectTurno) {
        const turnosUnicos = [];
        filas.forEach(fila => {
            const t = fila.querySelector(".turno").innerText.trim();
            if (t && !turnosUnicos.includes(t)) {
                turnosUnicos.push(t);
            }
        });
        selectTurno.innerHTML = '<option value="">Turno: todos</option>';
        turnosUnicos.forEach(t => {
            selectTurno.innerHTML += `<option value="${t}">${t}</option>`;
        });
        selectTurno.value = filtroTurno;
    }
}

function aplicarFiltros() {
    const filas = obtenerFilas();

    filas.forEach(fila => {
        if (!fila.querySelector(".nombre")) {
            return;
        }

        const nombre = fila.querySelector(".nombre").innerText.toLowerCase();
        const apellido = fila.querySelector(".apellido").innerText.toLowerCase();
        const dni = fila.querySelector(".dni").innerText.toLowerCase();
        const curso = fila.querySelector(".curso").innerText.trim();
        const turno = fila.querySelector(".turno").innerText.trim();
        const activo = fila.querySelector(".activo").innerText.toLowerCase().trim();

        const textoCompleto = `${nombre} ${apellido} ${dni} ${curso} ${turno} ${activo}`;
        const coincideBusqueda = textoCompleto.includes(filtroBusqueda.toLowerCase());
        const coincideCurso = filtroCurso === "" || curso === filtroCurso;
        const coincideTurno = filtroTurno === "" || turno === filtroTurno;

        let coincideEstado = true;
        if (filtroEstado === "activos") {
            coincideEstado = activo === "activo";
        }
        if (filtroEstado === "inactivos") {
            coincideEstado = activo === "inactivo";
        }

        const mostrar = coincideBusqueda && coincideCurso && coincideTurno && coincideEstado;
        fila.style.display = mostrar ? "" : "none";
    });

    actualizarContadores();
}

function actualizarContadores() {
    const filas = obtenerFilas().filter(fila => fila.querySelector(".nombre"));

    let total = 0;
    let activos = 0;
    let inactivos = 0;

    filas.forEach(fila => {
        if (fila.style.display === "none") return;

        total++;
        const activo = fila.querySelector(".activo").innerText.toLowerCase().trim();
        if (activo === "activo") {
            activos++;
        } else {
            inactivos++;
        }
    });

    const statTotal = document.getElementById("statTotal");
    const statActivos = document.getElementById("statActivos");
    const statInactivos = document.getElementById("statInactivos");
    const resultados = document.getElementById("resultadosLabel");

    if (statTotal) statTotal.innerText = total;
    if (statActivos) statActivos.innerText = activos;
    if (statInactivos) statInactivos.innerText = inactivos;
    if (resultados) {
        resultados.innerText = `${total} registro${total === 1 ? "" : "s"}`;
    }
}

/* la lista para cursos y diviciones va ahi abajito(es para que la desarrolles yo del futuro)*/
function actualizarCursos() {
    const contenedor = document.getElementById("courseList");
    const contadorCursos = document.getElementById("courseCount");
    if (!contenedor) return;

    const filas = obtenerFilas().filter(fila => fila.querySelector(".curso"));
    const cursos = {};

    filas.forEach(fila => {
        const curso = fila.querySelector(".curso").innerText.trim();
        const division = fila.querySelector(".division").innerText.trim();
        if (!curso) return;

        const clave = `${curso} ${division}`.trim();
        if (!cursos[clave]) {
            cursos[clave] = 0;
        }
        cursos[clave]++;
    });

    const claves = Object.keys(cursos).sort();
    if (contadorCursos) contadorCursos.innerText = claves.length;

    contenedor.innerHTML = "";

    claves.forEach(clave => {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.innerText = `${clave} (${cursos[clave]})`;
        boton.style.display = "block";
        boton.style.width = "100%";
        boton.style.textAlign = "left";

        boton.addEventListener("click", function () {
            const partes = clave.split(" ");
            filtroCurso = partes[0];
            const selectCurso = document.getElementById("filtroCurso");
            if (selectCurso) selectCurso.value = filtroCurso;
            aplicarFiltros();
        });

        contenedor.appendChild(boton);
    });
}

/* momento disfrutar de la destruccion de la logica yupi*/
function iniciarExtras() {
    const buscador = document.getElementById("buscador");
    const estado = document.getElementById("filtroEstado");
    const curso = document.getElementById("filtroCurso");
    const turno = document.getElementById("filtroTurno");
    const limpiar = document.getElementById("btnLimpiarFiltros");
    const nuevoRegistro = document.getElementById("botonAgregar");
    const cerrarBtn = document.getElementById("closeModal");
    const cancelarBtn = document.getElementById("cancelModal");
    const formAlumno = document.getElementById("alumnoForm");

    if (buscador) {
        buscador.addEventListener("input", function () {
            filtroBusqueda = this.value;
            aplicarFiltros();
        });
    }

    if (estado) {
        estado.addEventListener("change", function () {
            filtroEstado = this.value;
            aplicarFiltros();
        });
    }

    if (curso) {
        curso.addEventListener("change", function () {
            filtroCurso = this.value;
            aplicarFiltros();
        });
    }

    if (turno) {
        turno.addEventListener("change", function () {
            filtroTurno = this.value;
            aplicarFiltros();
        });
    }

    if (limpiar) {
        limpiar.addEventListener("click", function () {
            filtroBusqueda = "";
            filtroEstado = "todos";
            filtroCurso = "";
            filtroTurno = "";
            if (buscador) buscador.value = "";
            if (curso) curso.value = "";
            if (turno) turno.value = "";
            if (estado) estado.value = "todos";
            aplicarFiltros();
        });
    }

    if (nuevoRegistro) {
        nuevoRegistro.addEventListener("click", abrirModal);
    }

    if (cerrarBtn) {
        cerrarBtn.addEventListener("click", cerrarModal);
    }

    if (cancelarBtn) {
        cancelarBtn.addEventListener("click", cerrarModal);
    }

    if (formAlumno) {
        formAlumno.addEventListener("submit", guardarNuevoAlumno);
    }
}
function verAsistencias(id) {
    localStorage.setItem('alumnoAsistenciaId', id);
    window.location.href = './asistencias.html';
}
document.addEventListener("DOMContentLoaded", function () {
    iniciarExtras();
    confirmRegresoPortal();
});
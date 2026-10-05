//Archivo de Lectura de BD
//Los comentarios de locura del autor no deben modificarse bajo ningun contexto
//a menos que se de permiso para lo mismo o alex este a punto de mirar el codigo si lo hace
//asignacion estrategica: despues de terminar toda mi parte le doy a azari para que lo rompa como el guste pero con la intension
//de que lo haga bonito y no quede asi feisimo
        const SUPABASE_URL = 'https://pqtpjvxyjdemcnpmnhxv.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxdHBqdnh5amRlbWNucG1uaHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNjY0NzgsImV4cCI6MjA5Nzc0MjQ3OH0.qzzgN31vW22YseltVaTNbYp1CzyqNijX3OiQAbSnqac';
        
        // Inicializar el cliente
        const supabase2 = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        
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

            // Iterar los registros devueltos por Supabase
            data.forEach(alumnos => {

                const fila = document.createElement('tr');
                fila.id=`fila-${alumnos.id}`;

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
                fila.innerHTML = `
                    <td>${alumnos.id}</td>
                    <td class="nombre">${alumnos.nombre}</td>
                    <td class="apellido">${alumnos.apellido}</td>
                    <td class="dni">${alumnos.dni}</td>
                    <td class="curso">${alumnos.curso}</td>
                    <td class="division">${alumnos.division}</td>
                    <td class="turno">${alumnos.turno}</td>
                    <td class="uid_sube">${alumnos.uid_sube}</td>
                    <td class="activo">${alumnos.activo}</td>
                    <td>
                <button onclick="habilitarEdicion('${alumnos.id}')">Editar Alumno</button>
                <button onclick="editarSube('${alumnos.id}')" style="background-color: #0046e9; color: white;"> Editar Sube</button>
                    </td>
                `;
                tbody.appendChild(fila);
            });
        }
//a partir de aca modificaciones que rompen el codigo, yo tene cuidado atte: yo del pasado
        // 2. FUNCIÓN PARA TRANSFORMAR LA FILA EN CAMPOS EDITABLES
function habilitarEdicion(id) {
    const fila = document.getElementById(`fila-${id}`);
    
    const nombre = fila.querySelector('.nombre').innerText;
    const apellido = fila.querySelector('.apellido').innerText;
    const dni=fila.querySelector('.dni').innerText;
    const curso=fila.querySelector('.curso').innerText;
    const division=fila.querySelector('.division').innerText;
    const turno=fila.querySelector('.turno').innerText;
    const uid_sube=fila.querySelector('.uid_sube').innerText;
    const activo=fila.querySelector('.activo').innerText;

    fila.querySelector('.nombre').innerHTML = `<input type="text" id="input-nombre-${id}" value="${nombre}">`;
    fila.querySelector('.apellido').innerHTML = `<input type="text" id="input-apellido-${id}" value="${apellido}">`;
    fila.querySelector('.dni').innerHTML=`<input type="text" id="input-dni-${id}" value="${dni}">`;
    fila.querySelector('.curso').innerHTML=`<input type="text" id="input-curso-${id}" value="${curso}">`;
    fila.querySelector('.division').innerHTML=`<input type="text" id="input-division-${id}" value="${division}">`;
    fila.querySelector('.turno').innerHTML=`<input type="text" id="input-turno-${id}" value="${turno}">`;
    //deshabilitado
    //fila.querySelector('.uid_sube').innerHTML=`<input type="text" id="input-uid_sube-${id}" value="${uid_sube}">`;


    fila.querySelector('.activo').innerHTML=`<input type="text" id="input-activo-${id}" value="${activo}">`;

    // despues de mucho el error eran las comillas simples en id
    fila.querySelector('td:last-child').innerHTML = `
        <button onclick="actualizar('${id}')" style="background-color: #4CAF50; color: white;"> Guardar</button>
        <button onclick="cargarAlumnos()" style="background-color: #f44336; color: white;"> Cancelar</button>
    `;
}

// 3. FUNCIÓN QUE ENVÍA LOS CAMBIOS A SUPABASE
async function actualizar(id) {
    const nuevoNombre = document.getElementById(`input-nombre-${id}`).value;
    const nuevoApellido = document.getElementById(`input-apellido-${id}`).value;
    const nuevoDni=document.getElementById(`input-dni-${id}`).value;
    const nuevoCurso=document.getElementById(`input-curso-${id}`).value;
    const nuevoDivision=document.getElementById(`input-division-${id}`).value;
    const nuevoTurno=document.getElementById(`input-turno-${id}`).value;
   // const nuevoUid_sube=document.getElementById(`input-uid_sube-${id}`).value;
    const nuevoActivo=document.getElementById(`input-activo-${id}`).value;

    const { error } = await supabase2
        .from('alumnos')
        .update({ nombre: nuevoNombre, apellido: nuevoApellido, dni: nuevoDni, curso: nuevoCurso, division:nuevoDivision, 
            turno:nuevoTurno, activo: nuevoActivo
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
async function regresoPortal(){
    const id=localStorage.getItem('id');
    const nuevoUid_sube=localStorage.getItem('portal');
    const { error } = await supabase2
        .from('alumnos')
        .update({ uid_sube: nuevoUid_sube
         })
        .eq('id', id); 

    if (error) {
        alert('Error al actualizar en la base de datos: ' + error.message);
        console.error(error);
        return;
    }

    alert('¡Alumno actualizado correctamente!');
}
async function confirmRegresoPortal() {
        const id=localStorage.getItem('id');
    const nuevoUid_sube=localStorage.getItem('portal');
    if(id!=null&&nuevoUid_sube!=null){
        await regresoPortal();
        localStorage.removeItem('id');
        localStorage.removeItem('portal');
        cargarAlumnos();
    }else{
        cargarAlumnos();
    }
}
        //No tengo ni idea de como hacerlo, voy a tardar un poco mucho en investigar todo
        //Para la parte de modificar la tabla desde un html
        //actualizacion: hasta que no entienda que hice no voy a actualizar atte:yo

        //tarea para mi de mi
        // Ejecutar la función cuando cargue la página
        //Hacer 2 funciones, una llamada habilitarEdicion, y la otra
        //eeee no se actualizar?


//traer todo el archivo js de Lnfc y usarlo entero modificando ¿la parte visual?
//cambio de planes simplemente redirecciono la pagina si se detecto una tarjeta
function editarSube(id){
localStorage.setItem('id',id);
window.location.href="../Lector/lectura-nfc.html";
}
function buscador(){
    //suspendido por no ser prioridad segun el sistema
}

async function agregarAlumno() {

    const nombre = prompt("Ingrese Nombre:") || "";
    if (nombre === null) return; // Si cancela el prompt

    const apellido = prompt("Ingrese Apellido:") || "";//el || "" es por un errorsito muy divertido relacionado a lo nulo tarde en verlo
    const dni = prompt("Ingrese DNI (sin puntos):") || "";
    const curso = prompt("Ingrese Curso (ej: 6to):") || "";
    const division = prompt("Ingrese División (ej: 1ra):") || "";
    const turno = prompt("Ingrese Turno (Mañana/Tarde):") || "";
    const activo = prompt("¿Está activo? (SI/NO):", "SI") || "";
    const activobool=activo.toLowerCase().trim()=="si";

    const nuevoAlumno = { nombre, apellido, dni, curso, division, turno, activobool };

    

    const { error } = await supabase2
        .from('alumnos')
        .insert([{
            nombre: nombre.trim(),//trim relacionado al error de arriba, es por si hay espacios estos dejen de existir
            apellido: apellido.trim(),
            dni: dni.trim(),
            curso: curso.trim(),
            division: division.trim(),
            turno: turno.trim(),
            activo: activobool
        }]);
        //dudo de si hacerlo con todos esta bien revisar mas a futuro si no genera error o si tendria que especificarle al usuario que el dni no va con .
        //averiguar si puedo eliminar el . de alguna forma (no prioritario por ahora)

    if (error) {
        alert('Error al insertar el alumno en Supabase: ' + error.message);
        console.error(error);//el rojo es mas estetico pero el amarillo como que advierte 
        return;
    }

    alert('¡Alumno registrado con éxito!');
    cargarAlumnos();
}


        confirmRegresoPortal();


let filtroBusqueda = "";
let filtroEstado = "todos";
let filtroCurso = "";
let filtroTurno = "";

//me canse de agarrarlas asi que mejor esto es mas rapido

function obtenerFilas() {
    return Array.from(
        document.querySelectorAll("#tabla-alumnos tbody tr")
    );
}


//busca y filtro masomenos

function aplicarFiltros() {

    const filas = obtenerFilas();

    filas.forEach(fila => {

        // ignorar mensajes de "cargando" o similares
        if (!fila.querySelector(".nombre")) {
            return;
        }

        const nombre =
            fila.querySelector(".nombre")?.innerText.toLowerCase() || "";

        const apellido =
            fila.querySelector(".apellido")?.innerText.toLowerCase() || "";

        const dni =
            fila.querySelector(".dni")?.innerText.toLowerCase() || "";

        const curso =
            fila.querySelector(".curso")?.innerText.trim() || "";

        const turno =
            fila.querySelector(".turno")?.innerText.trim() || "";

        const activo =
            fila.querySelector(".activo")?.innerText
                .toLowerCase()
                .trim() || "";

        const textoCompleto =
            `${nombre} ${apellido} ${dni}`;


        const coincideBusqueda =
            textoCompleto.includes(
                filtroBusqueda.toLowerCase()
            );


        const coincideCurso =
            filtroCurso === "" ||
            curso === filtroCurso;


        const coincideTurno =
            filtroTurno === "" ||
            turno === filtroTurno;


        let coincideEstado = true;

        if (filtroEstado === "activos") {

            coincideEstado =
                activo === "true" ||
                activo === "si" ||
                activo === "sí" ||
                activo === "1";

        }

        if (filtroEstado === "inactivos") {

            coincideEstado =
                activo === "false" ||
                activo === "no" ||
                activo === "0";

        }


        const mostrar =
            coincideBusqueda &&
            coincideCurso &&
            coincideTurno &&
            coincideEstado;


        fila.style.display =
            mostrar ? "" : "none";
    });

    actualizarContadores();
}




function actualizarContadores() {

    const filas = obtenerFilas()
        .filter(fila => fila.querySelector(".nombre"));

    let total = 0;
    let activos = 0;
    let inactivos = 0;

    filas.forEach(fila => {

        const visible =
            fila.style.display !== "none";

        if (!visible) return;

        total++;

        const activo =
            fila.querySelector(".activo")?.innerText
                .toLowerCase()
                .trim();

        const estaActivo =
            activo === "true" ||
            activo === "si" ||
            activo === "sí" ||
            activo === "1";

        if (estaActivo) {
            activos++;
        } else {
            inactivos++;
        }
    });


    // Si existen estas tarjetas en el HTML,
    // se actualizan automáticamente.

    const statTotal =
        document.getElementById("statTotal");

    const statActivos =
        document.getElementById("statActivos");

    const statInactivos =
        document.getElementById("statInactivos");


    if (statTotal) {
        statTotal.innerText = total;
    }

    if (statActivos) {
        statActivos.innerText = activos;
    }

    if (statInactivos) {
        statInactivos.innerText = inactivos;
    }


    const resultados =
        document.getElementById("resultadosLabel");

    if (resultados) {

        resultados.innerText =
            `${total} registro${total === 1 ? "" : "s"}`;
    }
}


/* la lista para cursos y diviciones va ahi abajito(es para que la desarrolles yo del futuro)*/

function actualizarCursos() {

    const contenedor =
        document.getElementById("courseList");

    if (!contenedor) {
        return;
    }


    const filas =
        obtenerFilas()
            .filter(fila =>
                fila.querySelector(".curso")
            );


    const cursos = {};


    filas.forEach(fila => {

        const curso =
            fila.querySelector(".curso")?.innerText.trim() || "";

        const division =
            fila.querySelector(".division")?.innerText.trim() || "";

        if (!curso) {
            return;
        }


        const clave =
            `${curso} ${division}`.trim();


        if (!cursos[clave]) {
            cursos[clave] = 0;
        }

        cursos[clave]++;
    });


    contenedor.innerHTML = "";


    Object.keys(cursos)
        .sort()
        .forEach(clave => {

            const boton =
                document.createElement("button");

            boton.type = "button";

            boton.innerText =
                `${clave} (${cursos[clave]})`;


            boton.style.display = "block";
            boton.style.width = "100%";
            boton.style.textAlign = "left";


            boton.addEventListener(
                "click",
                function () {

                    const partes =
                        clave.split(" ");

                    filtroCurso =
                        partes[0];

                    const selectCurso =
                        document.getElementById(
                            "filtroCurso"
                        );

                    if (selectCurso) {

                        selectCurso.value =
                            filtroCurso;
                    }

                    aplicarFiltros();
                }
            );


            contenedor.appendChild(boton);
        });
}


/* ---------------------------------------------------------
   EXPORTAR TABLA
--------------------------------------------------------- */

function exportarAlumnos() {

    const filas =
        obtenerFilas()
            .filter(fila =>
                fila.querySelector(".nombre") &&
                fila.style.display !== "none"
            );


    if (filas.length === 0) {

        alert(
            "No hay registros para exportar."
        );

        return;
    }


    let csv =
        "ID,Nombre,Apellido,DNI,Curso,Division,Turno,UID SUBE,Activo\n";


    filas.forEach(fila => {

        const columnas =
            fila.querySelectorAll("td");


        const datos = [

            columnas[0]?.innerText || "",
            columnas[1]?.innerText || "",
            columnas[2]?.innerText || "",
            columnas[3]?.innerText || "",
            columnas[4]?.innerText || "",
            columnas[5]?.innerText || "",
            columnas[6]?.innerText || "",
            columnas[7]?.innerText || "",
            columnas[8]?.innerText || "",

        ];


        csv +=
            datos
                .map(dato =>
                    `"${dato.replace(/"/g, '""')}"`
                )
                .join(",") +
            "\n";
    });


    const archivo =
        new Blob(
            ["\ufeff" + csv],
            {
                type: "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(archivo);


    const enlace =
        document.createElement("a");

    enlace.href = url;
    enlace.download = "alumnos.csv";

    enlace.click();


    URL.revokeObjectURL(url);
}


/* momento disfrutar de la destruccion de la logica yupi*/

function iniciarExtras() {

    const buscador = document.getElementById("buscador");

    const estado = document.getElementById("filtroEstado");

    const curso = document.getElementById("filtroCurso");

    const turno = document.getElementById("filtroTurno");

    const exportar = document.getElementById("btnExportar");


    if (buscador) {

        buscador.addEventListener(
            "input",
            function () {

                filtroBusqueda =
                    this.value;

                aplicarFiltros();
            }
        );
    }


    if (estado) {

        estado.addEventListener(
            "change",
            function () {

                filtroEstado =
                    this.value;

                aplicarFiltros();
            }
        );
    }


    if (curso) {

        curso.addEventListener(
            "change",
            function () {

                filtroCurso =
                    this.value;

                aplicarFiltros();
            }
        );
    }


    if (turno) {

        turno.addEventListener(
            "change",
            function () {

                filtroTurno =
                    this.value;

                aplicarFiltros();
            }
        );
    }


    if (exportar) {

        exportar.addEventListener(
            "click",
            exportarAlumnos
        );
    }


    actualizarContadores();

    actualizarCursos();
}


//investigar que es esto
const observadorTabla =
    new MutationObserver(
        function () {

            actualizarContadores();
            actualizarCursos();
            aplicarFiltros();

        }
    );


document.addEventListener(
    "DOMContentLoaded",
    function () {

        const tbody =
            document.querySelector(
                "#tabla-alumnos tbody"
            );


        if (tbody) {

            observadorTabla.observe(
                tbody,
                {
                    childList: true
                }
            );
        }


        iniciarExtras();
    }
);
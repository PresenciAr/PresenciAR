//Archivo de lectura NFC
const btnEscanear = document.getElementById('btnEscanear');
    const statusDiv = document.getElementById('status');
    const logDiv = document.getElementById('log');

    // eeee. Esta parte en teoria funciona para consultar si el navegador
    //funciona con la libreria, momento... ndef compatible con la mayoria
    //de los celulares a excepcion de los mas modernos como el de oscar
    if ('NDEFReader' in window) {
        btnEscanear.addEventListener('click', async () => {
            statusDiv.innerText = "Estado: Buscando el lector NFC...";
            logDiv.innerText = "";

            try {
                // se crea una variable para el lector
                const ndef = new NDEFReader();
                
                // investigar como funciona el pedido de permisos al ejecutar esta linea
                //consultar si el navegador va a tener problemas pero no matarse
                //seguramente se remplaze el metodo de scan aunque se siga la misma logica
                await ndef.scan();
                
                statusDiv.innerText = "Estado: Escáner activo. Acerque la tarjeta.";
                statusDiv.style.color = "#007acc";

                // a tarjeta se escanea y mediante serialNumber se obtiene investigar como desarrollar
                //despues de investigar probar antes de seguir jugando
                ndef.addEventListener("reading", ({ message, serialNumber }) => {
                    statusDiv.innerText = "Se encontro un Algo que devolvio una id";
                    statusDiv.style.color = "green";
                    
                    let datosLeidos = `ID Serial: ${serialNumber}\n`;
                    //aca esta portal
                    localStorage.setItem('portal',serialNumber);

                    // Leer los registros dentro del chip NFC
                    //(investigar en detalle)
                    for (const record of message.records) {
                        if (record.recordType === "text") {
                            const textDecoder = new TextDecoder(record.encoding);
                            datosLeidos += `Texto: ${textDecoder.decode(record.data)}\n`;
                        } else {
                            datosLeidos += `Tipo de registro: ${record.recordType}\n`;
                        }
                    }
                    
                    logDiv.innerText = datosLeidos;
                    //redireccion
                    window.location.href="../BD/base-de-datos.html";
                });

                // Si falla lectura
                ndef.addEventListener("readingerror", () => {
                    statusDiv.innerText = "Error: No se pudo leer la tarjeta NFC. Inténtalo de nuevo.";
                    statusDiv.style.color = "red";
                });

            } catch (error) {//Si falla la activacion de nfc
                statusDiv.innerText = `Error: ${error.message}`;
                statusDiv.style.color = "red";
                console.error("Error de NFC: ", error);
            }
        });
    } else {
        // Si el navegador o el sistema no lo soporta
        btnEscanear.disabled = true;
        statusDiv.innerText = "El navegador/dispositivo no soporta NFC web";
        statusDiv.style.color = "red";
        //Investigar como hacerlo compatible con navegadores
        //de escritorio en caso de que se detecte un modulo nfc
        //Actualizacion de mi para el lector: Al parecer ya es compatible 
        //siempre y cuando el lector use ndef
        logDiv.innerText = "";
    }

const SUPABASE_URL_NFC = 'https://pqtpjvxyjdemcnpmnhxv.supabase.co';
const SUPABASE_ANON_KEY_NFC = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxdHBqdnh5amRlbWNucG1uaHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNjY0NzgsImV4cCI6MjA5Nzc0MjQ3OH0.qzzgN31vW22YseltVaTNbYp1CzyqNijX3OiQAbSnqac';
const clienteSupabaseNfc = supabase.createClient(SUPABASE_URL_NFC, SUPABASE_ANON_KEY_NFC);

const btnLeerTerminal = document.getElementById('btnLeerTerminal');
const selectTerminalId = document.getElementById('selectTerminalId');
const estadoTerminal = document.getElementById('estadoTerminal');

async function cargarTerminalesDisponibles() {
    if (!selectTerminalId) {
        return;
    }

    // Usá 'asistencias' o 'asistencias1' según el nombre de tu tabla
    const { data, error } = await clienteSupabaseNfc
        .from('asistencias')
        .select('terminal_id')
        .not('terminal_id', 'is', null);

    if (error) {
        console.error('Error al cargar terminales:', error);
        selectTerminalId.innerHTML = '<option value="">Error al cargar terminales</option>';
        return;
    }

    const terminalesUnicas = [];

    (data || []).forEach(function (fila) {
        const valorLimpio = String(fila.terminal_id || '').trim();
        if (valorLimpio && !terminalesUnicas.includes(valorLimpio)) {
            terminalesUnicas.push(valorLimpio);
        }
    });

    // Ordena 
    terminalesUnicas.sort(function (a, b) {
        const numA = Number(a);
        const numB = Number(b);
        if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
        }
        return a.localeCompare(b);
    });

    selectTerminalId.innerHTML = '';

    if (terminalesUnicas.length === 0) {
        selectTerminalId.innerHTML = '<option value="">No hay terminales registradas aún</option>';
        return;
    }

    terminalesUnicas.forEach(function (termId) {
        selectTerminalId.innerHTML += `<option value="${termId}">Terminal ${termId}</option>`;
    });
}

if (btnLeerTerminal && selectTerminalId && estadoTerminal) {
    btnLeerTerminal.addEventListener('click', async () => {
        const terminalId = selectTerminalId ? selectTerminalId.value.trim() : '';
        if (!terminalId) {
            estadoTerminal.innerText = "Estado: Ingresá un ID de terminal válido.";
            return;
        }

        estadoTerminal.innerText = `Estado: Buscando última lectura en terminal ${terminalId}...`;

        // Usá 'asistencias' o 'asistencias1' según el nombre final de tu tabla
        const { data, error } = await clienteSupabaseNfc
            .from('asistencias')
            .select('id, uid_leido, terminal_id')
            .eq('terminal_id', terminalId)
            .order('id', { ascending: false })
            .limit(1);

        if (error) {
            estadoTerminal.innerText = `Error al consultar terminal: ${error.message}`;
            console.error(error);
            return;
        }

        const ultima = data && data[0];
        if (!ultima || !ultima.uid_leido) {
            estadoTerminal.innerText = `Estado: No se encontró lectura reciente en la terminal ${terminalId}.`;
            return;
        }

        const uidLeido = String(ultima.uid_leido).trim();
        localStorage.setItem('portal', uidLeido);
        if (logDiv) {
            logDiv.innerText = `ID Serial (Terminal ${terminalId}): ${uidLeido}`;
        }

        window.location.href = "../BD/base-de-datos.html";
    });
}

cargarTerminalesDisponibles();
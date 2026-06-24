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
        logDiv.innerText = "Nota: Web NFC requiere Android (Chrome/Firefox mobile)";
    }


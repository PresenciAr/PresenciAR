//Archivo de Lectura de BD
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
                fila.id='fila-${alumnos.id}';
                fila.innerHTML = `
                    <td>${alumnos.id}</td>
                    <td>${alumnos.nombre}</td>
                    <td>${alumnos.apellido}</td>
                    <td>${alumnos.dni}</td>
                    <td>${alumnos.curso}</td>
                    <td>${alumnos.division}</td>
                    <td>${alumnos.turno}</td>
                    <td>${alumnos.uid_sube}</td>
                    <td>${alumnos.activo}</td>
                    <td>
                <button onclick="habilitarEdicion('${alumnos.id}')">Editar Alumno</button>
                    </td>
                `;
                tbody.appendChild(fila);
            });
        }
        //No tengo ni idea de como hacerlo, capaz se me resbala la mano y pido ayuda divina
        //Para la parte de modificar la tabla desde un html
        //actualizacion: hasta que no entienda que hizo no voy a actualizar atte:yo
        // Ejecutar la función cuando cargue la página
        //Hacer 2 funciones, una llamada habilitarEdicion, y la otra
        //eeee no se actualizar?
        cargarAlumnos();
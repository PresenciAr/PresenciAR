create table Asistencias (
  Id integer generated always as identity,
  Alumno_id integer references alumnos(id),
  Terminal_id integer references terminales(id),
  Horario_id integer references horarios(id),
  timestamp timestamptz default now(),
  uid_leido varchar(50),
  Estado varchar(15),
  primary key(Id)
);
create table Horarios (
  Id integer generated always as identity,
  Alumno_id integer references alumnos(id),
  Dia_semana integer not null,
  Hora_ingreso time not null,
  Tolerancia_min integer default 25,
  Ciclo_lectivo integer not null,
  primary key(Id)
);
--4 coment :P i think 
--create extension if not exists "pgcrypto";
create table Alumnos(
  Id integer generated always as identity,
  Nombre varchar(30) not null,
  Apellido varchar(30)not null,
  Dni varchar(8) unique,
  Curso varchar(3),
  Division varchar(3),
  Turno varchar(10),
  uid_sube varchar(50)unique not null,
  Activo boolean default true,
  primary key(Id)
);

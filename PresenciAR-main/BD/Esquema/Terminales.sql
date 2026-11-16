create table Terminales (
  Id integer generated always as identity,
  Nombre varchar(15) not null,
  Ubicacion varchar(30),
  Activa boolean default true,
  primary key(Id)
);
# PresenciAR  
### Sistema Inteligente de Asistencia Escolar mediante NFC

---

## Descripción
**PresenciAR** es un sistema de asistencia escolar automatizado que utiliza tecnología NFC para registrar el ingreso de alumnos de forma rápida, precisa y segura.

El sistema funciona mediante terminales electrónicas ubicadas en puntos estratégicos de la institución. Los alumnos acercan su tarjeta SUBE a la terminal y automáticamente se registra su asistencia junto con la hora exacta de ingreso.

Toda la información es almacenada en la nube utilizando Supabase, permitiendo acceso en tiempo real desde una aplicación de gestión.

---

# Objetivos del proyecto
- Digitalizar el sistema de asistencia escolar.
- Reducir el tiempo perdido en el pase manual de lista.
- Mejorar la precisión en el registro de horarios.
- Centralizar la información en tiempo real.
- Modernizar la gestión institucional mediante tecnología accesible.

---

# Tecnologías utilizadas

## Hardware
- ESP32  
  Microcontrolador principal encargado del procesamiento del sistema.

- RC522  
  Lector NFC utilizado para detectar el UID de las tarjetas SUBE.

- DS3231  
  Módulo RTC encargado de mantener la fecha y hora exactas.

- Baterías 18650 Li-Ion  
  Alimentación portátil para las terminales.

- Módulo BMS de protección  
  Sistema de seguridad para las baterías contra sobrecargas y cortocircuitos.

- Carcasa impresa en 3D (PLA)  
  Protección física de los componentes electrónicos.

---

## Software
- Supabase (base de datos en la nube)
//Por revisar

---

# Funcionamiento general

Alumno acerca SUBE.
        ↓
Lector RC522 detecta UID.
        ↓
ESP32 procesa información.
        ↓
Se registra fecha y hora mediante DS3231.
        ↓
Datos enviados a Supabase.
        ↓
La aplicación muestra la asistencia en tiempo real.

---

# Modo Offline Inteligente
El sistema incorpora un modo offline mediante LittleFS.

Si la terminal pierde conexión a internet:
- las asistencias continúan registrándose localmente
- los datos se almacenan temporalmente
- al recuperar conexión, se sincronizan automáticamente con la base de datos

Esto garantiza continuidad y evita pérdida de información.

---

# Seguridad y privacidad
PresenciAR prioriza la seguridad de los datos.

## El sistema:
-  No accede a datos personales almacenados en la tarjeta SUBE
-  Solo procesa el UID único de la tarjeta
-  Mantiene la información del alumno protegida en la base de datos
-  Utiliza almacenamiento seguro en la nube

---

# Aplicación de gestión
La aplicación permite:
- Registrar alumnos
- Vincular UID de tarjetas SUBE
- Consultar asistencias
- Visualizar horarios
- Detectar llegadas tarde
- Administrar información institucional

---

# Escalabilidad
Gracias al uso de Supabase y arquitectura modular:
- múltiples terminales pueden funcionar simultáneamente
- el sistema puede crecer a distintas instituciones
- la infraestructura puede ampliarse sin modificar el funcionamiento principal

---

# Público objetivo
- Escuelas secundarias
- Instituciones educativas
- Centros de formación
- Organizaciones que requieran control automatizado de asistencia

---

# Equipo de desarrollo
- Gomez Thomas M.
- Oscar Barrios
- Villalba Victoria A.
- Dann Joaquin

---

# PresenciAR
### *Asistencia inteligente que transforma la gestión escolar.*

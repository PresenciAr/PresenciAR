/*
  Conexiones del lector RC522:
    SDA(SS) -> Pin 1
    SCK     -> Pin 2
    MOSI    -> Pin 42
    MISO    -> Pin 41
    RST     -> Pin 40
    3.3V / GND

  Conexiones del modulo DS3231:
    SDA -> Pin 38
    SCL -> Pin 39
    3.3V / GND

  Conexiones del LED:
    Verde -> Pin 4 
    Rojo  -> Pin 5 

  Conexion del buzzer activo:
    Positivo -> Pin 6
*/

#include <SPI.h>
#include <Wire.h>
#include <MFRC522.h>
#include <RTClib.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <LittleFS.h>

// ------- WiFi -------
const char* ssid     = "Invitados";
const char* password = "12345678";

// ------- Supabase -------
const char* supabaseUrl = "https://pqtpjvxyjdemcnpmnhxv.supabase.co/rest/v1/asistencias";
const char* supabaseApiKey = "Codigo de la API secreta de SupaBase";

// ID de esta terminal especifica. Hay que crear una fila para este
// dispositivo en la tabla "terminales" y copiar aca su "id".
const int TERMINAL_ID = 1;

// ------- Pines RC522 -------

#define RST_PIN  39
#define SS_PIN   2
#define SCK_PIN  42
#define MISO_PIN 40
#define MOSI_PIN 41

// ------- Pines I2C del DS3231 -------
#define SDA_PIN 37
#define SCL_PIN 38

// ------- Archivo donde se guardan los pendientes -------
const char* ARCHIVO_PENDIENTES = "/pendientes.txt";

// ------- LED bicolor (verde/rojo, pata del medio a GND) -------

#define LED_VERDE 4
#define LED_ROJO  5
#define BUZZER    6

MFRC522 lector(SS_PIN, RST_PIN);
RTC_DS3231 rtc;

void setup() {
  Serial.begin(115200);

  // Iniciar sistema de archivos interno
  if (!LittleFS.begin(true)) {
    Serial.println("Error al iniciar LittleFS");
  }

  // Configurar pines del LED y el buzzer
  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_ROJO, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_ROJO, LOW);
  digitalWrite(BUZZER, LOW);

  // Iniciar WiFi (si no conecta en 10 segundos, sigue igual sin frenar el programa)
  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi");
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500);
    Serial.print(".");
    intentos++;
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " ¡Conectado!" : " Sin conexion, se sigue trabajando offline.");

  // Iniciar lector RFID
  // Orden de argumentos: SCK, MISO, MOSI, SS (asi lo pide la libreria SPI de ESP32)
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  lector.PCD_Init();

  // Iniciar RTC
  // Orden de argumentos: SDA, SCL (asi lo pide la libreria Wire de ESP32)
  Wire.begin(SDA_PIN, SCL_PIN);
  if (!rtc.begin()) {
    Serial.println("No se encontro el modulo RTC");
    while (true);
  }
  if (rtc.lostPower()) {
    Serial.println("RTC sin hora guardada, ajustando con la hora de compilacion...");
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }

  Serial.println("Sistema listo. Acerca una tarjeta al lector.");
}

void loop() {
  // Cada vuelta del loop, si hay WiFi, intenta primero vaciar lo pendiente
  if (WiFi.status() == WL_CONNECTED) {
    enviarPendientes();
  }

  // Si no hay tarjeta cerca, no hace nada
  if (!lector.PICC_IsNewCardPresent()) {
    return;
  }

  // Hay una tarjeta, pero puede que la lectura del UID falle
  // (por ejemplo, si se retira muy rapido)
  if (!lector.PICC_ReadCardSerial()) {
    Serial.println("No se pudo leer la tarjeta correctamente.");
    senialLecturaFallida();
    return;
  }

  // Lee el UID como texto: minúsculas, con ":" cada dos caracteres
  String uid = "";
  for (byte i = 0; i < lector.uid.size; i++) {
    if (lector.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(lector.uid.uidByte[i], HEX);
    if (i < lector.uid.size - 1) uid += ":";
  }
  uid.toLowerCase();

  // Se considera lectura fallida si por algún motivo el UID quedo vacio
  if (uid.length() == 0) {
    Serial.println("UID invalido.");
    senialLecturaFallida();
    lector.PICC_HaltA();
    return;
  }

  // A partir de aca, la lectura fue exitosa
  senialLecturaExitosa();

  // Obtener fecha y hora actual del RTC, en dos textos separados
  DateTime ahora = rtc.now();
  char fecha[11];
  char hora[9];
  sprintf(fecha, "%04d-%02d-%02d", ahora.year(), ahora.month(), ahora.day());
  sprintf(hora, "%02d:%02d:%02d", ahora.hour(), ahora.minute(), ahora.second());

  Serial.print("Tarjeta detectada. UID: ");
  Serial.print(uid);
  Serial.print(" | Fecha: ");
  Serial.print(fecha);
  Serial.print(" | Hora: ");
  Serial.println(hora);

  // Intentar enviar directo
  bool exito = false;
  if (WiFi.status() == WL_CONNECTED) {
    exito = enviarASupabase(uid, fecha, hora);
  }

  if (!exito) {
    guardarPendiente(uid, fecha, hora);
  }

  lector.PICC_HaltA();
  delay(2000); // Espera para evitar leer la misma tarjeta varias veces seguidas
}

// Envia UN registro a Supabase. Devuelve true si se guardo bien.
bool enviarASupabase(String uid, String fecha, String hora) {
  HTTPClient http;
  http.begin(supabaseUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseApiKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseApiKey));

  // Envia los datos solicitados, ya despues un trigger en SupaBase enlaza los datos
  StaticJsonDocument<256> datos;
  datos["terminal_id"] = TERMINAL_ID;
  datos["uid_leido"] = uid;
  datos["fecha"] = fecha;
  datos["hora_entrada"] = hora;

  String cuerpo;
  serializeJson(datos, cuerpo);

  int respuesta = http.POST(cuerpo);
  Serial.print("Codigo de respuesta HTTP: ");
  Serial.println(respuesta);

  http.end();

  // Supabase responde 200, 201 o 204 cuando el insert salio bien
  return (respuesta == 200 || respuesta == 201 || respuesta == 204);
}

// Agrega una linea "uid,fecha,hora" al archivo de pendientes
void guardarPendiente(String uid, String fecha, String hora) {
  File archivo = LittleFS.open(ARCHIVO_PENDIENTES, "a"); // "a" = agregar al final
  if (!archivo) {
    Serial.println("No se pudo abrir el archivo de pendientes");
    return;
  }
  archivo.println(uid + "," + fecha + "," + hora);
  archivo.close();
  Serial.println("Guardado como pendiente (sin conexion).");
}

// Lee el archivo de pendientes linea por linea e intenta enviarlos.
// Si se envian todos con exito, borra el archivo.
void enviarPendientes() {
  if (!LittleFS.exists(ARCHIVO_PENDIENTES)) {
    return; // no hay nada pendiente
  }

  File archivo = LittleFS.open(ARCHIVO_PENDIENTES, "r");
  if (!archivo) return;

  // Si el archivo esta vacio, no hay nada que hacer
  if (archivo.size() == 0) {
    archivo.close();
    LittleFS.remove(ARCHIVO_PENDIENTES);
    return;
  }

  Serial.println("Enviando registros pendientes guardados...");

  String lineasQueFallaron = "";

  while (archivo.available()) {
    String linea = archivo.readStringUntil('\n');
    linea.trim();
    if (linea.length() == 0) continue;

    // Separar "uid,fecha,hora" usando las dos comas
    int coma1 = linea.indexOf(',');
    int coma2 = linea.indexOf(',', coma1 + 1);
    if (coma1 == -1 || coma2 == -1) continue;

    String uid = linea.substring(0, coma1);
    String fecha = linea.substring(coma1 + 1, coma2);
    String hora = linea.substring(coma2 + 1);

    bool exito = enviarASupabase(uid, fecha, hora);

    if (!exito) {
      // Si falla, lo guardamos para reintentar despues
      lineasQueFallaron += linea + "\n";
    }

    delay(200); // pequeña pausa entre envios
  }
  archivo.close();

  // Reescribimos el archivo solo con lo que fallo (si no fallo nada, queda vacio)
  File archivoEscritura = LittleFS.open(ARCHIVO_PENDIENTES, "w"); // "w" = sobrescribir
  archivoEscritura.print(lineasQueFallaron);
  archivoEscritura.close();

  if (lineasQueFallaron.length() == 0) {
    Serial.println("Todos los pendientes se enviaron correctamente.");
  } else {
    Serial.println("Algunos registros no se pudieron enviar, se reintentara mas tarde.");
  }
}

// Se llama cuando la tarjeta se leyo bien: LED verde
void senialLecturaExitosa() {
  digitalWrite(LED_ROJO, LOW);
  digitalWrite(LED_VERDE, HIGH);
  delay(1000);
  digitalWrite(LED_VERDE, LOW);
}

// Se llama cuando la tarjeta NO se pudo leer bien: LED rojo + buzzer
void senialLecturaFallida() {
  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_ROJO, HIGH);
  digitalWrite(BUZZER, HIGH);
  delay(1000);
  digitalWrite(LED_ROJO, LOW);
  digitalWrite(BUZZER, LOW);
}

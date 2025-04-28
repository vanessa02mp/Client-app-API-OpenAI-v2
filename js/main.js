// Prefijo que se usará como palabra clave para activar comandos
const ordenPrefijo = "CARLOS";

// Espera a que el contenido del DOM esté completamente cargado antes de ejecutar el script
document.addEventListener("DOMContentLoaded", () => {
  // Obtención de referencias a los elementos del DOM
  const startBtn = document.getElementById("startBtn"); // Botón para iniciar el reconocimiento de voz
  const outputText = document.getElementById("outputText"); // Área donde se mostrará el mensaje detectado
  const msgText = document.getElementById("msgText"); // Mensaje de estado del reconocimiento de voz

  // Mensaje inicial que se mostrará en la interfaz
  outputText.innerHTML = `Di ${ordenPrefijo} para ver el mensaje`;

  let recognition; // Objeto para manejar el reconocimiento de voz
  let stoppedManually = false; // Bandera para determinar si la detención fue manual

  // Verificar si el navegador soporta reconocimiento de voz
  if ("webkitSpeechRecognition" in window) {
    recognition = new webkitSpeechRecognition(); // Inicialización del reconocimiento de voz
    recognition.continuous = true; // Permite que la escucha continúe indefinidamente
    recognition.lang = "es-ES"; // Configuración del idioma a español de España
  } else {
    alert("Tu navegador no soporta reconocimiento de voz.");
    return; // Salir del script si el navegador no es compatible
  }

  // Evento de clic en el botón para iniciar el reconocimiento de voz
  startBtn.addEventListener("click", () => {
    stoppedManually = false; // Restablece la bandera de detención manual
    recognition.start(); // Inicia el reconocimiento de voz
    startBtn.disabled = true; // Deshabilita el botón mientras se está escuchando
    outputText.textContent = `Escuchando... Di ${ordenPrefijo} para interactuar.`;
    msgText.innerHTML = ""; // Limpia mensajes anteriores
  });

  // Evento que maneja los resultados del reconocimiento de voz
  recognition.onresult = async (event) => {
    let transcript = event.results[event.results.length - 1][0].transcript.trim().toUpperCase(); // Obtiene y formatea el texto reconocido
    console.log("Texto reconocido:", transcript);

    // Si el usuario dice "CARLOS DETENTE", se detiene el reconocimiento
    if (transcript.includes(ordenPrefijo + " DETENTE")) {
      stoppedManually = true; // Marca que la detención fue manual
      recognition.stop(); // Detiene el reconocimiento
      startBtn.disabled = false; // Habilita nuevamente el botón de inicio
      outputText.textContent = "Detenido. Presiona el botón para comenzar nuevamente.";
      msgText.innerHTML = ""; // Limpia mensajes anteriores
    } 
    // Si la frase contiene la palabra clave "CARLOS", realiza una consulta a la API
    else if (transcript.includes(ordenPrefijo)) {
      // Extraer el comando de la frase
      const comando = transcript.replace(ordenPrefijo, "").trim(); // Elimina el prefijo y toma el comando
      outputText.innerHTML = `Comando detectado: "<strong><em>${comando}</em></strong>"`;
      
      // Llamar a la función para enviar el comando a la API
      await enviarComando(comando);
      
      // Una vez que la respuesta de la API es recibida, reiniciamos el flujo
      startBtn.disabled = false; // Habilita nuevamente el botón
      outputText.innerHTML = `Di ${ordenPrefijo} para ver el mensaje`; // Mensaje de espera
      recognition.stop(); // Detiene el reconocimiento de voz
    }
  };
                        
  // Evento que maneja errores en el reconocimiento de voz
  recognition.onerror = (event) => {
    console.error("Error en el reconocimiento:", event.error);
    
    // Manejo de errores específicos
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      alert("Error: El micrófono no tiene permisos o fue bloqueado.");
    } else if (event.error === "network") {
      alert("Error: Problema de conexión con el servicio de reconocimiento de voz.");
    }
    
    recognition.stop(); // Detiene el reconocimiento en caso de error
    startBtn.disabled = false; // Habilita nuevamente el botón
  };

  // Evento que se activa cuando el reconocimiento de voz finaliza
  recognition.onend = () => {
    if (!stoppedManually) {
      // Mensaje indicando que el reconocimiento se detuvo inesperadamente
      msgText.innerHTML = "El reconocimiento de voz se detuvo inesperadamente<br>Habla nuevamente para continuar...";
      recognition.start(); // Reinicia automáticamente el reconocimiento
    }
  };
});

// Función que realiza el fetch a la API y obtiene la respuesta
async function enviarComando(comando) {
  const url = "http://44.223.93.127/API-GPT-e-PHP/endpoints/chat.php";  // Reemplaza con la URL real de tu API
  const datos = { message: comando };

  // Obtén los elementos del DOM
  const respuestaElemento = document.getElementById("responseText");
  const apiResponseDiv = document.getElementById("apiResponse");

  try {
      // Muestra un mensaje de "Cargando..." mientras se espera la respuesta
      respuestaElemento.textContent = "Procesando...";
      apiResponseDiv.style.display = "block"; 

      const respuesta = await fetch(url, {
          method: "POST",
          headers: {
              "Content-Type": "application/json"
          },
          body: JSON.stringify(datos)
      });

      const resultado = await respuesta.json();
      console.log("Respuesta de la API:", resultado); // Para depuración

      if (resultado.status === 200 && resultado.data.reply) {
          respuestaElemento.textContent = resultado.data.reply;
      } else {
          respuestaElemento.textContent = "Error en la respuesta de la API.";
      }
  } catch (error) {
      respuestaElemento.textContent = "Error en la conexión con la API.";
      console.error("Error:", error);
  }
}

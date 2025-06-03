// Prefijo que se usará como palabra clave para activar comandos
const ordenPrefijo = "CARLOS";

// Mapa de comandos a claves de estado
const comandosMap = {
  // Comandos 

  "AVANZAR": "ADELANTE",
  "RETROCEDER": "ATRÁS",
  "DETENER": "DETENER",

  // Comandos de vueltas
  "VUELTA ATRAS DERECHA": "V_ATR_DER",
  "VUELTA DERECHA": "V_ADE_DER",
  "VUELTA ATRAS IZQUIERDA": "V_ATR_IZQ",
  "VUELTA IZQUIERDA": "V_ADE_IZQ",
  
  // Comandos de giros
  "90° IZQUIERDA": "G_90_IZQ",
  "90° DERECHA": "G_90_DER",
  "360° DERECHA": "G_360_DER",
  "360° IZQUIERDA": "G_360_IZQ",
};

// Espera a que el contenido del DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const outputText = document.getElementById("outputText");
  const msgText = document.getElementById("msgText");
  const apiResponseDiv = document.getElementById("apiResponse");
  const responseText = document.getElementById("responseText");

  // Función para restablecer la interfaz al estado inicial
  const resetUI = () => {
    startBtn.disabled = false;
    startBtn.textContent = "Iniciar Reconocimiento";
    outputText.innerHTML = `Di ${ordenPrefijo} para interactuar`;
    msgText.innerHTML = "";
    apiResponseDiv.style.display = "none";
    responseText.textContent = "";
  };

  // Estado inicial
  resetUI();

  let recognition;
  let stoppedManually = false;

  if ("webkitSpeechRecognition" in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "es-ES";
  } else {
    alert("Tu navegador no soporta reconocimiento de voz.");
    return;
  }

  startBtn.addEventListener("click", () => {
    if (startBtn.textContent === "Iniciar Reconocimiento") {
      // Iniciar reconocimiento
      stoppedManually = false;
      recognition.start();
      startBtn.disabled = false; // Mantenemos habilitado pero cambiamos texto
      startBtn.textContent = "Detener Reconocimiento";
      outputText.textContent = `Escuchando... Di ${ordenPrefijo} para interactuar.`;
      msgText.innerHTML = "";
      apiResponseDiv.style.display = "none";
    } else {
      // Detener reconocimiento manualmente
      stoppedManually = true;
      recognition.stop();
      resetUI();
    }
  });

  recognition.onresult = async (event) => {
    let transcript = event.results[event.results.length - 1][0].transcript.trim().toUpperCase();
    console.log("Texto reconocido:", transcript);

    if (transcript.includes(ordenPrefijo + " ADIOS")) {
      stoppedManually = true;
      recognition.stop();
      resetUI();
    } 
    else if (transcript.includes(ordenPrefijo)) {
      const comando = transcript.replace(ordenPrefijo, "").trim();
      outputText.innerHTML = `Comando detectado: <strong><em>${comando}</em></strong>`;
      
      await enviarComando(comando);
    }
  };
                        
  recognition.onerror = (event) => {
    console.error("Error en el reconocimiento:", event.error);
    
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      alert("Error: El micrófono no tiene permisos o fue bloqueado.");
    } else if (event.error === "network") {
      alert("Error: Problema de conexión con el servicio de reconocimiento de voz.");
    }
    
    recognition.stop();
    resetUI();
  };

  recognition.onend = () => {
    if (!stoppedManually) {
      msgText.innerHTML = "El reconocimiento de voz se detuvo inesperadamente<br>Habla nuevamente para continuar...";
      recognition.start();
    }
  };

  cargarUltimosRegistros();
});

// Función para enviar comando a la API de OpenAI
async function enviarComando(comando) {
    const url = "http://44.204.123.100/API-GPT-e-PHP/endpoints/chat.php";
    const datos = { message: comando };
    const respuestaElemento = document.getElementById("responseText");
    const apiResponseDiv = document.getElementById("apiResponse");

    try {
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
        console.log("Respuesta de la API:", resultado);

        if (resultado.status === 200 && resultado.data.reply) {
            respuestaElemento.textContent = resultado.data.reply;
            await insertarEnBaseDatos(resultado.data.reply);
        } else {
            // No mostramos mensaje de error, simplemente limpiamos
            respuestaElemento.textContent = "";
        }
    } catch (error) {
        // No mostramos mensaje de error, simplemente limpiamos
        respuestaElemento.textContent = "";
        console.error("Error:", error);
    }
}
// Función para insertar en la base de datos
async function insertarEnBaseDatos(respuestaAPI) {
    // Normalizar la respuesta
    const respuestaNormalizada = respuestaAPI.trim().toUpperCase();
    
    // Verificar si la respuesta está en nuestro diccionario
    if (!comandosMap[respuestaNormalizada]) {
        console.log(`Respuesta "${respuestaAPI}" no encontrada en el diccionario. No se insertará.`);
        return;
    }
    
    const status = comandosMap[respuestaNormalizada];
    const datos = {
        name: "vanessa",
        status: status
    };

    try {
        const respuesta = await fetch("http://44.204.123.100/iot-api-php/controllers/AddIotDevice.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();
        console.log("Resultado de inserción:", resultado);
        
        // Actualizar la tabla después de insertar
        await cargarUltimosRegistros();
        
    } catch (error) {
        console.error("Error al insertar:", error);
    }
}

// Función para cargar y mostrar los últimos registros
async function cargarUltimosRegistros() {
    const tbody = document.getElementById("historyTableBody");
    
    try {
        // Mostrar estado de carga
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">Cargando registros...</td>
            </tr>
        `;
        
        const respuesta = await fetch("http://44.204.123.100/iot-api-php/controllers/GetLastFiveDevices.php");
        
        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }
        
        const registros = await respuesta.json();
        
        // Limpiar tabla
        tbody.innerHTML = "";
        
        // Verificar si hay registros
        if (registros.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">No hay registros aún</td>
                </tr>
            `;
            return;
        }
        
        // Llenar la tabla con los registros
        registros.forEach(registro => {
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${registro.id}</td>
                <td>${registro.name}</td>
                <td>${registro.ip}</td>
                <td>${registro.status}</td>
                <td>${new Date(registro.date).toLocaleString()}</td>
            `;
            tbody.appendChild(fila);
        });
        
    } catch (error) {
        console.error("Error al cargar registros:", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">Error al cargar registros: ${error.message}</td>
            </tr>
        `;
    }
}

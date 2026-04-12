# DEMO SCRIPT — Concierge Medico AI para Marco
## Martes 14 de Abril, 5:00 PM

### SETUP PREVIO (10 min antes)
- Abrir en Chrome: https://dra-martinez.auctorum.com.mx
- Abrir en otra pestana: https://dra-martinez.auctorum.com.mx/login
- Tener el telefono listo con WhatsApp
- Abrir terminal SSH: `ssh -i ~/.ssh/id_ed25519_auctorum -p 2222 root@164.92.84.127` -> `htop`
- Verificar que PM2 esta verde: `sudo -u auctorum pm2 list`

### FLUJO DE DEMO (20 min)

**PARTE 1: La experiencia del paciente (5 min)**
1. Mostrar el portal publico de la doctora: dra-martinez.auctorum.com.mx
   - "Esto es lo que ve el paciente cuando busca a tu doctor en Google"
   - Mostrar: perfil, especialidad, seguros, precios, ubicacion
2. Click en "Agendar Cita"
   - Mostrar calendario con slots disponibles
   - Seleccionar un horario, llenar formulario
   - "El paciente recibe confirmacion por WhatsApp automaticamente"

**PARTE 2: WhatsApp AI (3 min)**
3. Mostrar como el bot responde en WhatsApp (si esta activo)
   - O mostrar el playground del bot: dashboard -> AI Settings
   - "El bot contesta preguntas, agenda citas, envia recordatorios"
   - Mostrar la configuracion de mensajes personalizables

**PARTE 3: El dashboard del doctor (10 min)**
4. Login al dashboard con magic link
5. Tour por las secciones:
   - **CITAS**: "Aqui ves todas las citas del dia, puedes confirmar/cancelar"
   - **PACIENTES**: "Historial clinico, archivos, notas"
   - **CONVERSACIONES**: "Todas las conversaciones de WhatsApp centralizadas"
   - **PAGOS**: "Registro de pagos, genera recibos"
   - **FACTURACION**: "Genera facturas con RFC del paciente"
   - **CAMPANAS**: "Envia recordatorios masivos a tus pacientes"
   - **REPORTES**: "Metricas del consultorio: citas/semana, ingresos, etc."

**PARTE 4: La propuesta (5 min)**
6. "Esto es lo que ofrecemos por $1,500/mes"
   - Portal personalizado con tu marca
   - WhatsApp AI que atiende 24/7
   - Dashboard completo para gestion del consultorio
   - Facturacion electronica
   - Recordatorios automaticos
   - Soporte tecnico incluido

### PREGUNTAS FRECUENTES DE MARCO
- "Cuantos doctores ya lo usan?" -> "Estamos en fase de primeros adoptantes. Tu y yo somos los founding partners."
- "Se puede personalizar?" -> Si, mostrar settings de marca, colores, mensajes.
- "Cuanto le toca a cada quien?" -> 25% comision por cada cliente que traigas.
- "Cuando puede empezar un doctor?" -> "En 24 horas tenemos su portal listo."

### PLAN B (si algo falla)
- Si WhatsApp no responde: mostrar screenshots o el log de conversaciones en el dashboard
- Si la landing no carga: tener screenshots listos en el telefono
- Si el login falla: ya tener una sesion abierta en otra pestana
- Si la DB esta vacia: "Esto es el ambiente de staging, en produccion tendria los datos reales del doctor"

# 📚 EduAgenda

Sistema web para la gestión académica de clases particulares, desarrollado con Node.js, HTML, CSS y JavaScript.

---

## 🚀 Descripción del proyecto

EduAgenda es una plataforma web que permite la gestión integral de usuarios, clases, calificaciones, pagos, materias y reportes académicos.

El sistema está compuesto por:
- Frontend (HTML, CSS, JavaScript)
- Backend (Node.js + Express)
- Base de datos (SQLite - edu.db)

---

## 🧩 Tecnologías utilizadas

- HTML5
- CSS3
- JavaScript
- Node.js
- Express
- SQLite
- JSON / API REST

---

## 📁 Estructura del proyecto

📦 EduAgenda
├── css/ # Estilos del sistema
├── js/ # Lógica del frontend
├── img/ # Imágenes del sistema
├── node_modules/ # Dependencias de Node.js
├── admin.html # Panel administrador
├── agenda.html # Agenda académica
├── calificaciones.html # Gestión de notas
├── configuracion.html # Configuración del sistema
├── configuracion2.html # Configuración secundaria
├── db.js # Conexión a base de datos
├── edu.db # Base de datos SQLite
├── estudiante.html # Vista estudiante
├── ingresos.html # Gestión de ingresos
├── main.html # Página principal
├── materias.html # Gestión de materias
├── migrardb.js # Migración de base de datos
├── misclases.html # Clases del estudiante
├── misestudiantes.html # Estudiantes del profesor
├── nota.html # Registro de notas
├── pago.html # Módulo de pagos
├── perfil.html # Perfil de usuario
├── profesor.html # Panel profesor
├── registrate.html # Registro de usuario
├── reportes.html # Reportes académicos
├── seguridad.html # Seguridad del sistema
├── server.js # Backend principal
├── sesion.html # Login del sistema
├── tareas.html # Gestión de tareas
├── usuarios.html # Gestión de usuarios
├── authMiddleware.js # Middleware de autenticación
├── package.json # Configuración del proyecto
├── package-lock.json # Dependencias bloqueadas
├── .env.example # Variables de entorno
├── .gitignore # Archivos ignorados por Git


---

## 🧩 Módulos del sistema

### 🔐 Autenticación
- sesion.html
- registrate.html
- seguridad.html
- authMiddleware.js

✔ Registro, login y control de acceso seguro

---

### 👤 Gestión de usuarios
- usuarios.html
- perfil.html
- admin.html
- estudiante.html
- profesor.html

✔ Administración de usuarios y roles

---

### 📚 Gestión académica
- materias.html
- tareas.html
- nota.html
- calificaciones.html
- misclases.html
- misestudiantes.html
- agenda.html

✔ Gestión de clases, tareas y calificaciones

---

### 💳 Pagos e ingresos
- pago.html
- ingresos.html

✔ Control de pagos y registro financiero

---

### 📊 Reportes
- reportes.html

✔ Generación de reportes académicos

---

### 🖥 Backend
- server.js
- db.js
- migrardb.js

✔ API del sistema y conexión con base de datos

---

## ⚙️ Variables de entorno

Ejemplo de configuración:

```

PORT=3000
DB\_NAME=edu.db

Instalación y ejecución
npm install
node server.js

http://localhost:3000
``` id="urlfinal1"

---

## 🔒 Seguridad

El sistema implementa middleware de autenticación para proteger rutas sensibles y controlar accesos según el rol del usuario.

---

## 👨‍💻 Autor

Proyecto académico — EduAgenda  
Desarrollo Full Stack (Frontend + Backend)

---

## 📌 Estado del proyecto

✔ Sistema funcional  
✔ Backend integrado  
✔ Frontend completo  
✔ Base de datos conectada  
✔ Módulos implementados  

## 🎥 Demo de EduAgenda

[Ver video en YouTube](https://youtu.be/yBLIcArUiJ4)

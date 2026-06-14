const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { type } = require('os');

const app = express();

app.use(cors());
app.use(express.json());

// ============================
// CONEXIÓN A MONGODB
// ============================

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ Mongo conectado"))
.catch(err => console.log(err));

// ============================
// MODELO
// ============================

const InvitacionSchema = new mongoose.Schema({
  codigo: String,
  mesa: Number,
  maxLugares: {
    type: Number,
    default: 2
  },
invitados: [
{
nombre: String,


acompanante: {
  type: String,
  default: ""
},
mesaAcompanante: {
  type: Number,
  default: null
},
telefono: {
type: String,
default: ""
},

asistentes: {
type: Number,
default: 1
},

confirmado: {
type: Boolean,
default: false
},

codigoQR: String
}
]
});

const Invitacion =
mongoose.model('Invitacion', InvitacionSchema);

// ============================
// SERVIR FRONTEND
// ============================

app.use(express.static(
  path.join(__dirname, 'frontend')
));

// ============================
// RUTA PRINCIPAL
// ============================

app.get('/', (req, res) => {
  res.send('🎉 Servidor funcionando correctamente 🚀');
});

// ============================
// CREAR INVITACIÓN DEMO
// ============================

app.get('/crear-demo', async (req, res) => {

  try {

    const existe =
    await Invitacion.findOne({
      codigo: 'demo123'
    });

    if (existe) {
      return res.send(
        '⚠ Ya existe la invitación demo'
      );
    }

    const nueva = new Invitacion({
      codigo: 'demo123',
      mesa: 3,
      invitados: [
        {
          nombre: 'Carlos',
          confirmado: false
        },
        {
          nombre: 'María',
          confirmado: false
        }
      ]
    });

    await nueva.save();

    res.send(
      '✅ Invitación demo creada'
    );

  } catch (error) {
    console.log(error);

    res.send(
      '❌ Error al crear demo'
    );
  }

});

// ============================
// OBTENER INVITACIÓN
// ============================

app.get('/invitacion', async (req, res) => {

  const { id } = req.query;

  const invitacion =
  await Invitacion.findOne({
    codigo: id
  });

  if (!invitacion) {
    return res.json({
      error: 'No encontrada'
    });
  }

  res.json(invitacion);

});

// ============================
// CONFIRMAR + QR
// ============================

app.post('/confirmar', async (req, res) => {

  try {

const {
id,
nombre,
telefono,
asistentes,
acompanante
} = req.body;
    if (!nombre) {
  return res.json({
    error: "Escribe un nombre"
  });
}

    const invitacion =
    await Invitacion.findOne({
      codigo: id
    });

    if (!invitacion) {
      return res.json({
        error:
        'Invitación no encontrada'
      });
    }

   const invitado = invitacion.invitados.find(i => {

  if (!i.nombre) return false;

  return i.nombre
    .toLowerCase()
    .trim() ===
    nombre
    .toLowerCase()
    .trim();

});

    if (!invitado) {
      return res.json({
        error:
        'Invitado no encontrado'
      });
    }
invitado.telefono =
telefono || "";

invitado.asistentes =
Number(asistentes) || 1;
if (Number(asistentes) === 2 && acompanante) {
  invitado.acompanante = acompanante.trim();
  invitado.mesaAcompanante = invitacion.mesa;
}
    invitado.confirmado = true;

    if (!invitado.codigoQR) {
      invitado.codigoQR =
      crypto.randomUUID();
    }

    await invitacion.save();

    const urlQR =
`https://fiesta-nadia.onrender.com/acceso?id=${invitado.codigoQR}`;

const qrImage =
await QRCode.toDataURL(urlQR);

res.json({
  mensaje: "Confirmado",
  qr: qrImage,
  mesa: invitacion.mesa,
  asistente: invitado.asistentes || 1,
  codigoQR: invitado.codigoQR
});

  } catch (error) {

    console.log(error);

    res.json({
      error:
      'Error del servidor'
    });

  }

});

// ============================
// VALIDAR QR
// ============================

app.get('/acceso', async (req, res) => {

  const { id } = req.query;

  const invitacion =
  await Invitacion.findOne({
    "invitados.codigoQR": id
  });

  if (!invitacion) {
    return res.send(
      '❌ Acceso denegado'
    );
  }

  const invitado =
  invitacion.invitados.find(
    i => i.codigoQR === id
  );

  if (!invitado.confirmado) {
    return res.send(
      '❌ No confirmado'
    );
  }

  res.send(`
<h1>✅ Acceso válido</h1>

<h2>Personas registradas</h2>

<div style="font-size:22px; margin:15px;">
  <strong>${invitado.nombre}</strong><br>
  🪑 Mesa ${invitacion.mesa}
</div>

${
  invitado.acompanante
    ? `
    <div style="font-size:22px; margin:15px;">
      <strong>${invitado.acompanante}</strong><br>
      🪑 Mesa ${invitado.mesaAcompanante || invitacion.mesa}
    </div>
    `
    : ""
}

<h3>👥 Total de personas: ${invitado.asistentes}</h3>
`);

});

// ============================
// PUERTO
// ============================

const PORT =
process.env.PORT || 3000;
// 🔥 Datos del pase

app.get('/pase-data', async (req, res) => {

  const { id } = req.query;

  const invitacion = await Invitacion.findOne({
    "invitados.codigoQR": id
  });

  if (!invitacion) {
    return res.json({
      error: "Invitación no encontrada"
    });
  }

  const invitado =
  invitacion.invitados.find(
    i => i.codigoQR === id
  );

  const urlQR =
  `https://fiesta-nadia.onrender.com/acceso?id=${id}`;

  const qrImage =
  await QRCode.toDataURL(urlQR);

  res.json({
    nombre: invitado.nombre,
    mesa: invitacion.mesa,
    asistentes: invitado.asistentes || 1,
    qr: qrImage
  });

});
// ============================
// ADMIN: CREAR INVITADO
// ============================

app.post('/admin/crear-invitado', async (req, res) => {
  try {
    const { nombre, mesa, maxLugares } = req.body;

    if (!nombre || !mesa) {
      return res.json({
        error: 'Falta nombre o mesa'
      });
    }

    const codigo = uuidv4();

    const nuevaInvitacion = new Invitacion({
      codigo,
      mesa: Number(mesa),
      invitados: [
        {
          nombre: nombre.trim(),
          telefono: "",
          asistentes: 1,
          confirmado: false,
          codigoQR: ""
        }
      ],
      maxLugares: Number(maxLugares) || 2
    });

    await nuevaInvitacion.save();

    res.json({
      mensaje: 'Invitado creado',
      codigo,
      link: `https://fiesta-nadia.onrender.com/invitacion.html?id=${codigo}`
    });

  } catch (error) {
    console.log(error);
    res.json({
      error: 'Error al crear invitado'
    });
  }
});


// ============================
// ADMIN: VER INVITADOS
// ============================

app.get('/admin/invitados', async (req, res) => {
  try {
    const invitaciones = await Invitacion.find();

    res.json(invitaciones);

  } catch (error) {
    console.log(error);
    res.json({
      error: 'Error al obtener invitados'
    });
  }
});
app.listen(PORT, () => {
  console.log(
    `🚀 Servidor corriendo en puerto ${PORT}`
  );
});
app.listen(PORT, () => {
  console.log(
    `🚀 Servidor corriendo en puerto ${PORT}`
  );
});
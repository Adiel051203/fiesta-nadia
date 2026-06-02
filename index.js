const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const crypto = require('crypto');

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
  invitados: [
    {
      nombre: String,
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

    const { id, nombre } =
    req.body;
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
  mesa: invitacion.mesa
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

  res.send(
`✅ Bienvenido ${invitado.nombre} - Mesa ${invitacion.mesa}`
  );

});

// ============================
// PUERTO
// ============================

const PORT =
process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `🚀 Servidor corriendo en puerto ${PORT}`
  );
});
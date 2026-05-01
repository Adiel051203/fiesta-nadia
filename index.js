const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 Mongo
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Mongo conectado"))
  .catch(err => console.log(err));

// 🔥 Modelo
const InvitacionSchema = new mongoose.Schema({
  codigo: String,
  mesa: Number,
  invitados: [
    {
      nombre: String,
      confirmado: { type: Boolean, default: false },
      codigoQR: String
    }
  ]
});

const Invitacion = mongoose.model('Invitacion', InvitacionSchema);

// 🔥 Ruta raíz
app.get('/', (req, res) => {
  res.send('🎉 Servidor funcionando correctamente 🚀');
});

// 🔥 Servir frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// 🔥 Obtener invitación
app.get('/invitacion', async (req, res) => {
  const { id } = req.query;

  const invitacion = await Invitacion.findOne({ codigo: id });

  if (!invitacion) {
    return res.json({ error: 'No encontrada' });
  }

  res.json(invitacion);
});

// 🔥 Confirmar + generar QR
app.post('/confirmar', async (req, res) => {
  const { id, nombre } = req.body;

  try {
    const invitacion = await Invitacion.findOne({ codigo: id });

    if (!invitacion) {
      return res.json({ error: 'Invitación no encontrada' });
    }

    const invitado = invitacion.invitados.find(i => i.nombre === nombre);

    if (!invitado) {
      return res.json({ error: 'Invitado no encontrado' });
    }

    invitado.confirmado = true;

    if (!invitado.codigoQR) {
      invitado.codigoQR = crypto.randomUUID();
    }

    await invitacion.save();

    const urlQR = `https://fiesta-nadia.onrender.com/acceso.html?id=${invitado.codigoQR}`;

    const qrImage = await QRCode.toDataURL(urlQR);

    res.json({
      mensaje: "Confirmado",
      qr: qrImage
    });

  } catch (error) {
    res.json({ error: "Error del servidor" });
  }
});

// 🔥 Validar acceso (para escaneo)
app.get('/acceso', async (req, res) => {
  const { id } = req.query;

  const invitacion = await Invitacion.findOne({
    "invitados.codigoQR": id
  });

  if (!invitacion) {
    return res.send("❌ Acceso denegado");
  }

  const invitado = invitacion.invitados.find(i => i.codigoQR === id);

  if (!invitado.confirmado) {
    return res.send("❌ No confirmado");
  }

  res.send(`✅ Bienvenido ${invitado.nombre} - Mesa ${invitacion.mesa}`);
});

// 🔥 Puerto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor corriendo");
});
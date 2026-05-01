const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const Invitacion = require('./models/Invitacion');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// 🔌 CONEXIÓN MONGO
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ Mongo conectado"))
.catch(err => console.log(err));

// 🚀 SERVIDOR
app.listen(3000, '0.0.0.0', () => {
  console.log('🚀 Servidor corriendo en puerto 3000');
});

// 🔥 CREAR INVITACIÓN
app.get('/crear-invitacion', async (req, res) => {
  try {
    const codigo = uuidv4();

    const nueva = new Invitacion({
      codigo,
      mesa: 3,
      invitados: [
        { nombre: "Carlos" },
        { nombre: "María" }
      ]
    });

    await nueva.save();

const url = `http://192.168.100.102:5500/frontend/invitacion.html?id=${codigo}`;  
    const qr = await QRCode.toDataURL(url);

    res.json({ codigo, url, qr });

  } catch (error) {
    res.status(500).send("Error al crear invitación");
  }
});

// 📥 OBTENER INVITACIÓN
app.get('/invitacion/:codigo', async (req, res) => {
  const invitacion = await Invitacion.findOne({ codigo: req.params.codigo });

  if (!invitacion) return res.status(404).send("No existe");

  res.json(invitacion);
});

// ✅ CONFIRMAR PERSONA (GENERA QR)
app.post('/confirmar/:codigo/:nombre', async (req, res) => {
  const invitacion = await Invitacion.findOne({ codigo: req.params.codigo });

  if (!invitacion) return res.status(404).send("No existe");

  const invitado = invitacion.invitados.find(i => i.nombre === req.params.nombre);

  if (!invitado) return res.status(404).send("No encontrado");

  if(invitado.confirmado){
    return res.json({ mensaje: "Ya confirmado", qr: invitado.codigoQR });
  }

  invitado.confirmado = true;
  invitado.codigoQR = uuidv4();

  await invitacion.save();

  const url = `http://127.0.0.1:5500/frontend/acceso.html?id=${invitado.codigoQR}`;
  const qr = await QRCode.toDataURL(url);

  res.json({
    mensaje: "Confirmado",
    qr
  });
});

// 📱 VALIDAR QR (ENTRADA)
app.get('/validar/:codigo', async (req, res) => {

  const invitacion = await Invitacion.findOne({
    "invitados.codigoQR": req.params.codigo
  });

  if (!invitacion) {
    return res.json({ acceso: false, mensaje: "QR inválido" });
  }

  const invitado = invitacion.invitados.find(i => i.codigoQR === req.params.codigo);

  if (!invitado.confirmado) {
    return res.json({
      acceso: false,
      mensaje: "No confirmado"
    });
  }

  res.json({
    acceso: true,
    nombre: invitado.nombre,
    mesa: invitacion.mesa
  });
});

// 📊 ADMIN
app.get('/admin', async (req, res) => {
  const data = await Invitacion.find();
  res.json(data);
});
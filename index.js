const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 CONEXIÓN A MONGO (RENDER)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Mongo conectado"))
  .catch(err => console.log("❌ Error Mongo:", err));

// 🔥 MODELO
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

// 🔥 RUTA RAÍZ (para probar)
app.get('/', (req, res) => {
  res.send('🎉 Servidor funcionando correctamente 🚀');
});

// 🔥 SERVIR FRONTEND
app.use(express.static(path.join(__dirname, '../frontend')));

// 🔥 OBTENER INVITACIÓN
app.get('/invitacion', async (req, res) => {
  const { id } = req.query;

  try {
    const invitacion = await Invitacion.findOne({ codigo: id });
    if (!invitacion) {
      return res.json({ error: 'Invitación no encontrada' });
    }
    res.json(invitacion);
  } catch (error) {
    res.json({ error: 'Error del servidor' });
  }
});

// 🔥 CONFIRMAR ASISTENCIA
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

    await invitacion.save();

    res.json({ mensaje: 'Confirmado correctamente' });

  } catch (error) {
    res.json({ error: 'Error al confirmar' });
  }
});

// 🔥 PUERTO (IMPORTANTE PARA RENDER)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
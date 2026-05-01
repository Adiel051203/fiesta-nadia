const mongoose = require('mongoose');

const InvitadoSchema = new mongoose.Schema({
  nombre: String,
  confirmado: { type: Boolean, default: false },
  codigoQR: String
});

const InvitacionSchema = new mongoose.Schema({
  codigo: String,
  mesa: Number,
  invitados: [InvitadoSchema]
});

module.exports = mongoose.model('Invitacion', InvitacionSchema);
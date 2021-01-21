const mongoose = require('mongoose');

const pedidosSchema = new mongoose.Schema({
    pedido: { type: Array, required: true },
    total: { type: Number, required: true },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Clientes', required: true },
    vendedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    estado: { type: String, required: true, default: "Pendiente" },
    creado: { type: Date, default: Date.now() },
});

module.exports = mongoose.model( 'Pedidos', pedidosSchema );
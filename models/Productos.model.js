const mongoose = require('mongoose');

const productosSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    existencia: { type: Number, required: true, trim: true },
    precio: { type: Number, required: true, trim: true },
    creado: { type: Date, default: Date.now() }

});

productosSchema.index({ nombre: 'text' });

module.exports = mongoose.model( 'Productos', productosSchema );
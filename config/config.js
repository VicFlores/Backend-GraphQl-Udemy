const mongoose = require('mongoose');

require('dotenv').config({ path: 'variables.env' });

const conectarDB = async () => {
    try {
        await mongoose.connect( process.env.DB_MONGO, {
            useNewUrlParser: true, 
            useUnifiedTopology: true,
            useFindAndModify: false,
            useCreateIndex: true
        } );
        console.log(' 🔌 DB conectada 🔌 ');
    } catch (error) {
        console.log('Error de conexion en DB');
        console.log(error);
        process.exit(1); // * Detiene la app
    }
}

module.exports = conectarDB;
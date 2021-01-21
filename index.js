const { ApolloServer } = require('apollo-server');
const jwt = require('jsonwebtoken');
const conectarDB = require('./config/config');
const typeDefs = require('./db/schema');
const resolvers = require('./db/resolvers');
require('dotenv').config({ path: 'variables.env' });

conectarDB();

// * Servidor
const servidor = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
        const token = req.headers['authorization'] || '';

        if ( token ) {
            try {
                const usuario = jwt.verify(token.replace('Bearer ', ''), process.env.SECRETO );
                //console.log(usuario)
                return { usuario }
            } catch (error) {
                console.log('Hubo un error');
                console.log(error);
            }
        }
    }
});

// * Arrancar servidor
servidor.listen().then( ({ url }) => {
    console.log(` 🚀 Servidor corriendo en ${ url } 🚀 `);
} );
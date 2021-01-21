const Usuario = require('../models/Usuario.model');
const Producto = require('../models/Productos.model');
const Cliente = require('../models/Cliente.model');
const Pedido = require('../models/Pedidos.model');

const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'variables.env' });

const crearToken = ( usuario, secreto, expiresIn ) => {
    const { id, nombre, apellido, email } = usuario;
    return jwt.sign( { id, nombre, apellido, email }, secreto, { expiresIn } );
};

// * Resolvers
const resolvers = {
    
    Query: {
        obtenerUsuario: async ( _, {}, ctx ) => {
            return ctx.usuario;
        },

        obtenerProductos: async () => {
            try {
                const productosDB = await Producto.find({});
                return productosDB;
            } catch (error) {
                console.log(error);
            }   
        },

        obtenerProducto: async ( _, { id } ) => {
            const producto = await Producto.findById(id);
            
            if ( !producto ) {
                throw new Error( 'Producto no encontrado' );
            };
            return producto;
        },

        obtenerClientes: async () => {
            try {
                const clientes = await Cliente.find({});
                return clientes;
            } catch (error) {
                console.log(error);
            }
        },

        obtenerCliente: async ( _, { id }, ctx ) => {
            const cliente = await Cliente.findById(id);

            if (!cliente ) {
                throw new Error( 'Cliente no registrado' );
            };

            if ( cliente.vendedor.toString() !== ctx.usuario.id ) {
                throw new Error( 'No posees las credenciales para manipular esta informacion' );
            };

            return cliente;
        },

        obtenerClientesVendedor: async ( _, {}, ctx ) => {
            try {
                const clientes = await Cliente.find({ vendedor: ctx.usuario.id.toString() });
                return clientes;
            } catch (error) {
                console.log(error);
            }
        },

        obtenerpedidos: async () => {
            try {
                const pedidos = await Pedido.find({});
                return pedidos;
            } catch (error) {
                console.log(error);
            }
        },

        obtenerPedidosVendedor: async ( _, {}, ctx ) => {
            try {
                const pedidos = await Pedido.find({ vendedor: ctx.usuario.id });
                return pedidos;
            } catch (error) {
                console.log(error);
            }
        },

        obtenerPedido: async ( _, { id }, ctx ) => {
            const pedido = await Pedido.findById(id);

            if ( !pedido ) {
                throw new Error( 'Pedido no encontrado' );
            };

            if ( pedido.vendedor.toString() !== ctx.usuario.id ) {
                throw new Error( 'No posees las credenciales para manipular esta informacion' );
            }

            return pedido;
        },

        obtenerPedidosEstado: async ( _, { estado }, ctx ) => {
            const pedidos = await Pedido.find({ vendedor: ctx.usuario.id, estado });
            return pedidos;
        },

        // ! aggregate se utiliza para realizar varias operaciones
        // ! $match filtra la informacion ( es como un where en SQL )
        // ! $lookup es como un innerjoin en SQL o como un populate en mongoose
        mejoresClientes: async () => {
            const clientes = await Pedido.aggregate([
                { $match: { estado: "Completado" } },
                { $group: {
                    _id: '$cliente',
                    total: { $sum: '$total' }
                } },
                {
                    $lookup: {
                        from: 'clientes', // nombre del modelo en minisculas
                        localField: '_id',
                        foreignField: '_id',
                        as: 'cliente' // valor que se declaro en el input TopCLiente
                    }
                },
                {
                    $limit: 10
                },
                {
                    $sort: { total: -1 } // ambia el orden al mayor total primero
                }
            ]);

            return clientes;
        },

        mejoresVendedores: async () => {
            const vendedores = await Pedido.aggregate([
                { $match: { estado: 'Completado' } },
                { $group: {
                    _id: '$vendedor',
                    total: { $sum: '$total' }
                } },
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'vendedor'
                    }
                },
                {
                    $limit: 3
                },
                {
                    $sort: { total: -1 }
                }
            ]);

            return vendedores;
        },

        buscarProducto: async ( _, { texto } ) => {
            const productos = await Producto.find({ $text: { $search: texto } }).limit(10);
            return productos;
        }
    },

    Mutation: {
        
        nuevoUsuario: async ( _, { input } ) => {
            const { email, password } = input;
            const existeUsuario = await Usuario.findOne({ email });
            
            if ( existeUsuario ) {
                throw new Error( 'Usuario ya existente' );
            };

            const salt = await bcryptjs.genSalt(10);
            input.password = await bcryptjs.hash(password, salt);

            try {
                const usuarioDB = new Usuario(input);
                usuarioDB.save();
                return usuarioDB;
            } catch (error) {
                console.log(error);
            }
        },

        autenticarUsuario: async ( _, { input } ) => {
            const { email, password } = input
            const existeUsuario = await Usuario.findOne({ email });

            if ( !existeUsuario ) {
                throw new Error( 'Usuario o contraseña invalidos' );
            };

            const passwordCorrecto = await bcryptjs.compare( password, existeUsuario.password );

            if ( !passwordCorrecto ) {
                throw new Error( 'Usuario o contraseña invalidos' );
            };

            return {
                token: crearToken( existeUsuario, process.env.SECRETO, '48h' )
            };
        },

        nuevoProducto: async ( _, { input } ) => {
            try {
                const producto = new Producto(input);
                const resultado = await producto.save();
                return resultado;
            } catch (error) {
                console.log(error);
            }
        },

        actualizarProducto: async ( _, { id, input } ) => {
            let producto = await Producto.findById(id);

            if ( !producto ) {
                throw new Error( 'Producto no encontrado' );
            };

            producto = await Producto.findOneAndUpdate( { _id: id }, input, { new: true } );

            return producto;
        },

        eliminarProducto: async ( _, { id } ) => {
            const producto = await Producto.findById(id);

            if ( !producto ) {
                throw new Error( 'Producto no encontrado' );
            };

            await Producto.findOneAndDelete({ _id: id });
            return 'Producto Eliminado';
        },

        nuevoCliente: async ( _, { input }, ctx ) => {
            const { email } = input;
            const cliente = await Cliente.findOne({ email });

            if ( cliente ) {
                throw new Error( 'Ese cliente ya ha sido registrado' );
            };

            const nuevoCliente = new Cliente(input);
            nuevoCliente.vendedor = ctx.usuario.id

            try {
                const clienteDB = await nuevoCliente.save();
                return clienteDB;
            } catch (error) {
                console.log(error);
            }
        },

        actualizarCliente: async ( _, { id, input }, ctx ) => {
            let cliente = await Cliente.findById(id);
             
            if ( !cliente ) {
                throw new Error( 'Cliente no encontrado' );
            };

            if ( cliente.vendedor.toString() !== ctx.usuario.id ) {
                throw new Error( 'No posees las credenciales para manipular esta informacion' );
            };

            cliente = await Cliente.findOneAndUpdate( { _id: id }, input, { new: true } );

            return cliente;
        },

        eliminarCliente: async ( _, { id }, ctx ) => {
            const cliente = await Cliente.findById(id);

            if ( !cliente ) {
                throw new Error( 'Cliente no encontrado' );
            };

            if ( cliente.vendedor.toString() !== ctx.usuario.id ) {
                throw new Error( 'No posees las credenciales para manipular esta informacion' );
            };

            await Cliente.findByIdAndDelete({ _id: id })
            return 'Cliente eliminado con exito';
        },

        nuevoPedido: async ( _, { input }, ctx ) => {
            const { cliente, pedido } = input;
            
            const clienteDB = await Cliente.findById(cliente);

            if ( !clienteDB ) {
                throw new Error( 'Cliente no encontrado' );
            };

            if ( clienteDB.vendedor.toString() !== ctx.usuario.id ) {
                throw new Error( 'No posees las credenciales para manipular esta informacion' );
            };

            for await( const articulo of pedido ) {
                const { id, cantidad } = articulo

                const producto = await Producto.findById(id);
                
                if ( cantidad > producto.existencia ) {
                    throw new Error( `El articulo: ${ producto.nombre } excede la cantidad disponible ` );
                } else {
                    producto.existencia = producto.existencia - cantidad;
                    await producto.save();
                }
            };

            const nuevoPedido = new Pedido(input);
            nuevoPedido.vendedor = ctx.usuario.id;
            
            const resultado = await nuevoPedido.save();
            return resultado;
        },

        actualizarPedido: async ( _, { id, input }, ctx ) => {
            const { cliente, pedido } = input;
            const existePedido = await Pedido.findById(id);

            if ( !existePedido ) {
                throw new Error( 'Pedido no encontrado' );
            };

            const existeCliente = await Cliente.findById(cliente);

            if ( !existeCliente ) {
                throw new Error( 'Cliente no encontrado' );
            };

            if ( existeCliente.vendedor.toString() !== ctx.usuario.id ) {
                throw new Error( 'No posees las credenciales para manipular esta informacion' );
            };

            if ( pedido ) {
                for await( const articulo of pedido ) {
                    const { id, cantidad } = articulo
    
                    const producto = await Producto.findById(id);
                    
                    if ( cantidad > producto.existencia ) {
                        throw new Error( `El articulo: ${ producto.nombre } excede la cantidad disponible ` );
                    } else {
                        producto.existencia = producto.existencia - cantidad;
                        await producto.save();
                    }
                };
            }

            const resultado = await Pedido.findOneAndUpdate( { _id: id }, input, { new: true } );
            return resultado;
        },

        eliminarPedido: async ( _, { id }, ctx ) => {
            const pedido = await Pedido.findById(id);

            if ( !pedido ) {
                throw new Error( 'Pedido no encontrado' );
            };

            if ( pedido.vendedor.toString() !== ctx.usuario.id ) {
                throw new Error( 'No posees las credenciales para manipular esta informacion' );
            };

            await Pedido.findOneAndDelete({ _id: id });
            return 'Pedido Eliminado';
        }
    }
}

module.exports = resolvers;


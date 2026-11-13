// Backend simples para guardar listas de prendas no MongoDB.

require('dotenv').config();

const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const port = Number(process.env.PORT || 3000);
const mongoUri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DATABASE || 'sorteio_natal';

if (!mongoUri) {
    throw new Error('Defina a variável de ambiente MONGODB_URI antes de iniciar o servidor.');
}

const mongoClient = new MongoClient(mongoUri);
let wishlistsCollection;
let drawsCollection;
let databaseInitialization;

app.use(express.json({ limit: '16kb' }));

function validateCode(code) {
    return typeof code === 'string' && /^N\d{5}$/.test(code);
}

function validateItems(items) {
    return Array.isArray(items)
        && items.length <= 100
        && items.every(item =>
            typeof item === 'string'
            && item.trim().length > 0
            && item.trim().length <= 200
        );
}

// Devolve apenas o sorteio correspondente ao código autenticado.
app.get('/api/sorteios/:codigo', async (req, res, next) => {
    const code = req.params.codigo.toUpperCase();

    if (!validateCode(code)) {
        return res.status(400).json({ erro: 'Código inválido.' });
    }

    try {
        const draw = await drawsCollection.findOne(
            { codigo: code },
            { projection: { _id: 0, codigo: 1, nome: 1, codigoAmigoSecreto: 1 } }
        );

        if (!draw) {
            return res.status(404).json({ erro: 'Código inválido.' });
        }

        const secretFriend = await drawsCollection.findOne(
            { codigo: draw.codigoAmigoSecreto },
            { projection: { _id: 0, nome: 1 } }
        );

        if (!secretFriend) {
            return res.status(500).json({ erro: 'O amigo secreto associado não existe.' });
        }

        return res.json({
            ...draw,
            nomeAmigoSecreto: secretFriend.nome
        });
    } catch (error) {
        return next(error);
    }
});

// Devolve a lista de um participante.
app.get('/api/wishlists/:codigo', async (req, res, next) => {
    const code = req.params.codigo.toUpperCase();

    if (!validateCode(code)) {
        return res.status(400).json({ erro: 'Código inválido.' });
    }

    try {
        const wishlist = await wishlistsCollection.findOne({ codigo: code });
        return res.json({ itens: wishlist ? wishlist.itens : [] });
    } catch (error) {
        return next(error);
    }
});

// Substitui a lista completa de um participante.
app.put('/api/wishlists/:codigo', async (req, res, next) => {
    const code = req.params.codigo.toUpperCase();
    const items = req.body && req.body.itens;

    if (!validateCode(code) || !validateItems(items)) {
        return res.status(400).json({
            erro: 'O código ou a lista de itens é inválido.'
        });
    }

    const normalizedItems = [...new Set(items.map(item => item.trim()))];

    try {
        await wishlistsCollection.updateOne(
            { codigo: code },
            {
                $set: {
                    itens: normalizedItems,
                    atualizadoEm: new Date()
                }
            },
            { upsert: true }
        );

        return res.json({ sucesso: true });
    } catch (error) {
        return next(error);
    }
});

// Permite servir o site estático a partir da mesma aplicação.
app.use(express.static(path.join(__dirname)));

app.use((error, req, res, next) => {
    console.error('Erro no servidor:', error);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
});

async function startServer() {
    await initializeDatabase();

    app.listen(port, () => {
        console.log(`Sorteio disponível em http://localhost:${port}`);
    });
}

function initializeDatabase() {
    if (!databaseInitialization) {
        databaseInitialization = (async () => {
            await mongoClient.connect();
            const database = mongoClient.db(databaseName);
            wishlistsCollection = database.collection('wishlists');
            drawsCollection = database.collection('sorteio_natal');
            await wishlistsCollection.createIndex({ codigo: 1 }, { unique: true });
            await drawsCollection.createIndex({ codigo: 1 }, { unique: true });
            await drawsCollection.createIndex(
                { codigoAmigoSecreto: 1 },
                {
                    unique: true,
                    partialFilterExpression: { codigoAmigoSecreto: { $type: 'string' } }
                }
            );
            await drawsCollection.createIndex(
                { nome: 1 },
                {
                    unique: true,
                    partialFilterExpression: { nome: { $type: 'string' } }
                }
            );
        })();
    }

    return databaseInitialization;
}

if (require.main === module) {
    startServer().catch(async error => {
        console.error('Não foi possível ligar ao MongoDB:', error);
        await mongoClient.close();
        process.exitCode = 1;
    });
}

async function shutdown() {
    await mongoClient.close();
    process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

module.exports = { app, initializeDatabase };

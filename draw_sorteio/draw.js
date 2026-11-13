require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const crypto = require('crypto');
const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DATABASE || 'sorteio_natal';
const excludedName = 'Teste';
const excludedCode = 'N54321';

if (!mongoUri) {
    throw new Error('Defina MONGODB_URI no ficheiro .env antes de executar o sorteio.');
}

function shuffleList(list) {
    const result = [...list];

    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = crypto.randomInt(index + 1);
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }

    return result;
}

function createAssignments(participants) {
    const order = shuffleList(participants);

    return order.map((person, index) => ({
        codigo: person.codigo,
        codigoAmigoSecreto: order[(index + 1) % order.length].codigo
    }));
}

async function run() {
    const client = new MongoClient(mongoUri);

    try {
        await client.connect();
        const drawCollection = client.db(databaseName).collection('sorteio_natal');
        await drawCollection.createIndex({ codigo: 1 }, { unique: true });
        await drawCollection.createIndex(
            { codigoAmigoSecreto: 1 },
            {
                unique: true,
                partialFilterExpression: { codigoAmigoSecreto: { $type: 'string' } }
            }
        );
        await drawCollection.createIndex(
            { nome: 1 },
            {
                unique: true,
                partialFilterExpression: { nome: { $type: 'string' } }
            }
        );

        const participants = await drawCollection.find({
            nome: { $ne: excludedName },
            codigo: { $ne: excludedCode }
        }, {
            projection: { _id: 0, codigo: 1, nome: 1 }
        }).toArray();

        if (participants.length < 2) {
            throw new Error('São necessários pelo menos dois participantes.');
        }

        const codes = new Set(participants.map(person => person.codigo));
        if (codes.size !== participants.length
            || participants.some(person => !person.codigo || !person.nome)) {
            throw new Error('A coleção contém participantes sem código/nome ou códigos repetidos.');
        }

        const assignments = createAssignments(participants);
        const destinations = new Set(assignments.map(assignment => assignment.codigoAmigoSecreto));

        if (destinations.size !== participants.length
            || assignments.some(assignment =>
                assignment.codigo === assignment.codigoAmigoSecreto
                || !codes.has(assignment.codigoAmigoSecreto)
            )) {
            throw new Error('Não foi possível criar uma atribuição bijetiva válida.');
        }

        const session = client.startSession();
        try {
            await session.withTransaction(async () => {
                await drawCollection.updateMany(
                    {},
                    { $unset: { codigoAmigoSecreto: '' } },
                    { session }
                );

                await drawCollection.bulkWrite(
                    assignments.map(assignment => ({
                        updateOne: {
                            filter: { codigo: assignment.codigo },
                            update: { $set: { codigoAmigoSecreto: assignment.codigoAmigoSecreto } }
                        }
                    })),
                    { session }
                );
            });
        } finally {
            await session.endSession();
        }

        console.log(`Sorteio concluído para ${assignments.length} participantes.`);
        console.log('A pessoa Teste foi excluída e todas as atribuições são únicas e sem autoatribuições.');
    } finally {
        await client.close();
    }
}

run().catch(error => {
    console.error('Não foi possível realizar o sorteio:', error.message);
    process.exitCode = 1;
});

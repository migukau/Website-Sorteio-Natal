# Refazer o sorteio

Este script gera um novo sorteio na coleção `sorteio_natal` da base de dados
configurada no ficheiro `.env`.

## Regras

- A pessoa com nome `Teste` (ou código `N54321`) não participa.
- Cada participante recebe exatamente uma pessoa.
- Cada pessoa é recebida por exatamente um participante.
- Ninguém recebe a si próprio.
- As atribuições anteriores são removidas antes de gravar o novo sorteio.

O programa cria índices únicos em `codigo` e `codigoAmigoSecreto`. Assim, o
MongoDB impede códigos repetidos e impede que duas pessoas recebam o mesmo
amigo. Também cria um índice único em `nome`, impedindo pessoas com o mesmo
nome. A existência do amigo secreto é validada pelo programa: cada
`codigoAmigoSecreto` tem de existir como `codigo` de um participante elegível.

## Executar

Na pasta principal do projeto:

```powershell
npm run draw:sorteio
```

O script lê os participantes que já existem no MongoDB. Não é necessário
editar ficheiros com nomes ou códigos. O resultado é gravado em
`sorteio_natal.codigoAmigoSecreto`.

Este comando deve ser executado apenas quando se pretende substituir o
sorteio atual. Cada execução cria uma nova combinação aleatória.

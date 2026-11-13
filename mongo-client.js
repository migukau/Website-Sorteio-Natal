// Adaptador frontend para a API definida em mongo-server.js.

async function getDrawByCode(code) {
    const response = await fetch(`/api/sorteios/${encodeURIComponent(code)}`);

    if (!response.ok) {
        throw new Error('Não foi possível validar o código do sorteio.');
    }

    return response.json();
}

async function getWishlistByCode(code) {
    const response = await fetch(`/api/wishlists/${encodeURIComponent(code)}`);

    if (!response.ok) {
        throw new Error('Não foi possível carregar a lista de prendas.');
    }

    const data = await response.json();
    return Array.isArray(data.itens) ? data.itens : [];
}

async function updateWishlist(code, items) {
    const response = await fetch(`/api/wishlists/${encodeURIComponent(code)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ itens: items })
    });

    if (!response.ok) {
        throw new Error('Não foi possível guardar a lista de prendas.');
    }

    return true;
}

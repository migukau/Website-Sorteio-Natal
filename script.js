// Variáveis globais
let currentSecretFriend = null;
let currentPersonCode = null;
let currentSecretFriendCode = null;
let currentWishlist = [];
let currentDrawData = null;

async function verifyCode() {
    const inputCode = document.getElementById('codigoInput').value.trim().toUpperCase();
    
    if (!inputCode) {
        alert('Por favor, insere o teu código!');
        return;
    }
    
    try {
        const cacheKey = `sorteio-natal:${inputCode}`;
        const cachedData = sessionStorage.getItem(cacheKey);
        currentDrawData = cachedData
            ? JSON.parse(cachedData)
            : await getDrawByCode(inputCode);

        if (!cachedData) {
            sessionStorage.setItem(cacheKey, JSON.stringify(currentDrawData));
        }

        const personName = currentDrawData.nome;
        const secretFriendCode = currentDrawData.codigoAmigoSecreto;
        const secretFriendName = currentDrawData.nomeAmigoSecreto;
        
        // Guardar nas variáveis globais
        currentSecretFriend = secretFriendName;
        currentPersonCode = inputCode;
        currentSecretFriendCode = secretFriendCode;
        
        // Mostrar resultado com animação
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('resultadoSection').style.display = 'block';
        
        // Animação de revelação
        document.querySelector('#resultadoSection h2').innerHTML = `Olá, ${personName}! O Teu Amigo Secreto é... `;
        revealResult(secretFriendName);

        document.getElementById('botoesAcao').style.display = 'block';
    } catch (error) {
        console.error('Erro ao carregar o sorteio:', error);
        alert('Código inválido! Verifica o código e tenta novamente.');
    }
}

function revealResult(name) {
    const resultElement = document.getElementById('resultadoNome');
    resultElement.innerHTML = '';
    
    // Animação de digitação
    let text = `${name}`;
    let i = 0;
    
    function typeWriter() {
        if (i < text.length) {
            resultElement.innerHTML += text.charAt(i);
            i++;
            setTimeout(typeWriter, 100);
        }
    }
    
    typeWriter();
}

function goBack() {
    document.getElementById('resultadoSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('codigoInput').value = '';
    document.getElementById('resultadoNome').innerHTML = '';
    document.getElementById('botoesAcao').style.display = 'none';
}

// Enter para submeter
document.getElementById('codigoInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        verifyCode();
    }
});

// Efeito de neve
function createSnow() {
    const snowflakes = ['❄️','❄️','❄️','❄️', '⛄', '🎄', '🎁', '⭐'];
    
    setInterval(() => {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.innerHTML = snowflakes[Math.floor(Math.random() * snowflakes.length)];
        snowflake.style.left = Math.random() * 100 + 'vw';
        snowflake.style.top = '-50px';
        snowflake.style.opacity = Math.random() * 0.7 + 0.3;
        
        document.body.appendChild(snowflake);
        
        // Animação
        setTimeout(() => {
            snowflake.style.transition = 'all ' + (Math.random() * 3 + 5) + 's linear';
            snowflake.style.transform = `translateY(${window.innerHeight + 100}px) rotate(${Math.random() * 360}deg)`;
            snowflake.style.opacity = '0';
        }, 100);
        
        // Remover após animação
        setTimeout(() => {
            document.body.removeChild(snowflake);
        }, 8000);
    }, 300);
}

// Carregar minha lista - ATUALIZADA
async function loadMyWishlist() {
    currentWishlist = await getWishlistByCode(currentPersonCode);
    updateWishlistInterface();
}

// Atualizar a interface da lista
function updateWishlistInterface() {
    const wishlistElement = document.getElementById('itensLista');
    wishlistElement.innerHTML = '';
    
    if (currentWishlist.length === 0) {
        wishlistElement.innerHTML = '<li style="text-align: center; color: #666;">A tua lista está vazia. Adiciona alguns itens! 🎁</li>';
        return;
    }
    
    currentWishlist.forEach((item, index) => {
        const li = document.createElement('li');
        li.style.padding = '8px';
        li.style.margin = '5px 0';
        li.style.background = 'white';
        li.style.borderRadius = '5px';
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        
        li.innerHTML = `
            <span style="color: #2d8a3a;">${item}</span>
            <button onclick="removeItem(${index})" style="background: #ff4444; color: black; border: none; border-radius: 15px; width: 30px; height: 30px; cursor: pointer; font-weight: bold; font-size: 18px; display: flex; align-items: center; justify-content: center; padding: 0;">✕</button>
        `;
        
        wishlistElement.appendChild(li);
    });
}

async function saveWishlistImmediately(items, successMessage) {
    const statusElement = document.getElementById('minhaListaStatus');
    statusElement.innerHTML = 'A guardar...';
    statusElement.style.color = 'blue';

    try {
        await updateWishlist(currentPersonCode, items);
        statusElement.innerHTML = successMessage;
        statusElement.style.color = 'green';
        setTimeout(() => statusElement.innerHTML = '', 3000);
        return true;
    } catch (error) {
        console.error('Erro ao guardar a lista:', error);
        statusElement.innerHTML = 'Erro ao guardar. Tenta novamente.';
        statusElement.style.color = 'red';
        return false;
    }
}

// Adicionar item à lista
async function addItem() {
    const newItemInput = document.getElementById('novoItemInput');
    const newItem = newItemInput.value.trim();
    
    if (!newItem) {
        alert('Por favor, escreve um item!');
        return;
    }
    
    if (currentWishlist.includes(newItem)) {
        alert('Este item já está na tua lista!');
        return;
    }
    
    const previousWishlist = [...currentWishlist];
    currentWishlist.push(newItem);
    newItemInput.value = '';
    updateWishlistInterface();

    const saved = await saveWishlistImmediately(currentWishlist, 'Item adicionado com sucesso!');
    if (!saved) {
        currentWishlist = previousWishlist;
        newItemInput.value = newItem;
        updateWishlistInterface();
        console.error('Não foi possível adicionar o item da lista:', newItem);
    }
}

// Remover item da lista
async function removeItem(index) {
    if (index < 0 || index >= currentWishlist.length) {
        return;
    }

    const previousWishlist = [...currentWishlist];
    const removedItem = currentWishlist[index];
    currentWishlist.splice(index, 1);
    updateWishlistInterface();

    const saved = await saveWishlistImmediately(currentWishlist, 'Item removido com sucesso!');
    if (!saved) {
        currentWishlist = previousWishlist;
        updateWishlistInterface();
        console.error('Não foi possível remover o item da lista:', removedItem);
    }
}

// Limpar toda a lista
function clearWishlist() {
    if (confirm('Tens a certeza que queres limpar toda a tua lista?')) {
        const previousWishlist = [...currentWishlist];
        currentWishlist = [];
        updateWishlistInterface();

        saveWishlistImmediately(currentWishlist, 'Lista limpa e guardada!').then(saved => {
            if (!saved) {
                currentWishlist = previousWishlist;
                updateWishlistInterface();
            }
        });
    }
}

// Guardar lista - ATUALIZADA
async function saveMyWishlist() {
    await saveWishlistImmediately(currentWishlist, 'Lista guardada com sucesso!');
}

// Carregar lista do amigo - ATUALIZADA
async function loadFriendWishlist() {
    const friendWishlist = await getWishlistByCode(currentSecretFriendCode);
    const friendWishlistSection = document.getElementById('listaAmigoSection');
    const friendWishlistContent = document.getElementById('listaAmigoContent');
    
    friendWishlistSection.style.display = 'block';
    
    if (friendWishlist.length > 0) {
        let html = `<h4>Lista de Prendas de ${currentSecretFriend}:</h4><ul style="text-align: left; list-style-type: none; padding: 0;">`;
        
        friendWishlist.forEach(item => {
            html += `<li style="padding: 8px; margin: 5px 0; background: #e8f5e8; border-radius: 5px;">${item}</li>`;
        });
        
        html += '</ul>';
        friendWishlistContent.innerHTML = html;
    } else {
        friendWishlistContent.innerHTML = `
            <p>${currentSecretFriend} ainda não criou a sua lista de prendas.</p>
        `;
    }
}

function viewFriendWishlist() {
    // Ir para a página de desejos e mostrar apenas a lista do amigo
    document.getElementById('resultadoSection').style.display = 'none';
    document.getElementById('desejosSection').style.display = 'block';
    document.getElementById('minhaListaSection').style.display = 'none';
    document.getElementById('listaAmigoSection').style.display = 'block';
    
    loadFriendWishlist();
}

function manageMyWishlist() {
    // Ir para a página de desejos e mostrar apenas a gestão da própria lista
    document.getElementById('resultadoSection').style.display = 'none';
    document.getElementById('desejosSection').style.display = 'block';
    document.getElementById('minhaListaSection').style.display = 'block';
    document.getElementById('listaAmigoSection').style.display = 'none';
    
    loadMyWishlist();
}

function goBackToResult() {
    // Voltar da página de desejos para a página de resultado
    document.getElementById('desejosSection').style.display = 'none';
    document.getElementById('resultadoSection').style.display = 'block';
}

// Iniciar efeito de neve
createSnow();
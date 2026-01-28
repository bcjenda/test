const WALLETS = {
    'bitcoin_btc': 'TVOJE_BTC_ADRESA',
    'bitcoin_lightning': 'TVOJE_LIGHTNING_ADRESA',
    'bitcoin_bep20': 'TVOJE_BTC_BEP20_ADRESA',
    'ethereum_erc20': 'TVOJE_ETH_ADRESA',
    'ethereum_base': 'TVOJE_BASE_ADRESA',
    'ethereum_arb': 'TVOJE_ARBITRUM_ADRESA',
    'ethereum_opt': 'TVOJE_OPTIMISM_ADRESA',
    'solana_sol': 'TVOJE_SOLANA_ADRESA',
    'usd-coin_erc20': 'TVOJE_USDC_ETH_ADRESA',
    'usd-coin_poly': 'TVOJE_USDC_POLYGON_ADRESA',
    'usd-coin_base': 'TVOJE_USDC_BASE_ADRESA',
    'usd-coin_sol': 'TVOJE_USDC_SOL_ADRESA',
    'dogecoin_doge': 'TVOJE_DOGE_ADRESA',
    'dogecoin_bep20': 'TVOJE_DOGE_BEP20_ADRESA'
};

const COIN_LOGOS = {
    'bitcoin': 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
    'ethereum': 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    'solana': 'https://cryptologos.cc/logos/solana-sol-logo.png',
    'usd-coin': 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
    'dogecoin': 'https://cryptologos.cc/logos/dogecoin-doge-logo.png'
};

const NETWORKS = {
    bitcoin: [{ id: 'btc', name: 'Bitcoin (Mainnet)' }, { id: 'lightning', name: 'Lightning ⚡' }, { id: 'bep20', name: 'BSC (BEP20)' }],
    ethereum: [{ id: 'erc20', name: 'Ethereum (ERC20)' }, { id: 'base', name: 'Base Network' }, { id: 'arb', name: 'Arbitrum One' }, { id: 'opt', name: 'Optimism' }],
    solana: [{ id: 'sol', name: 'Solana Network' }],
    'usd-coin': [{ id: 'erc20', name: 'Ethereum (ERC20)' }, { id: 'poly', name: 'Polygon' }, { id: 'base', name: 'Base' }, { id: 'sol', name: 'Solana' }],
    dogecoin: [{ id: 'doge', name: 'Dogecoin (Mainnet)' }, { id: 'bep20', name: 'BSC (BEP20)' }]
};

let priceCache = {};
let debounceTimer;
const qrcode = new QRCode(document.getElementById("qrcode"), { 
    width: 200, height: 200, correctLevel : QRCode.CorrectLevel.H 
});

async function calculate() {
    const czk = document.getElementById("czkInput").value;
    const crypto = document.getElementById("cryptoSelect").value;
    const network = document.getElementById("networkSelect").value;
    const symbol = document.getElementById("cryptoSelect").selectedOptions[0].dataset.symbol;
    const isExchange = document.getElementById("exchangeMode").checked;

    if (!czk || czk <= 0) return;
    document.getElementById("qrArea").classList.add("loading");

    try {
        const now = Date.now();
        let data;

        // Cache kontrola (30s) - teď stahujeme CZK i USD najednou
        if (priceCache[crypto] && (now - priceCache[crypto].timestamp < 30000)) {
            data = priceCache[crypto].data;
        } else {
            const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${crypto},usd&vs_currencies=czk,usd`);
            data = await res.json();
            priceCache[crypto] = { data: data, timestamp: now };
        }

        const rateCzk = data[crypto].czk;
        const rateUsd = data[crypto].usd; // AKTUÁLNÍ CENA V USD
        const usdCzk = data.usd.czk;

        const amount = (czk / rateCzk).toFixed(symbol === 'BTC' ? 8 : (symbol === 'ETH' ? 5 : 2));
        const address = WALLETS[crypto + '_' + network] || "";

        let qrData = `${crypto}:${address}?amount=${amount}`;
        let instruction = "🔒 Platební příkaz pro peněženky";

        if (network === 'lightning') {
            qrData = `lightning:${address}`;
            instruction = "⚡ LIGHTNING: Zadejte částku v mobilu ručně!";
        } else if (isExchange || crypto === 'solana' || crypto === 'dogecoin' || (network !== 'btc' && network !== 'erc20')) {
            qrData = address;
            if (isExchange) instruction = "⚠️ REŽIM BURZY: Částku zadejte na burze ručně!";
        }

        qrcode.clear();
        qrcode.makeCode(qrData);

        setTimeout(() => { 
            const qrImg = document.querySelector('#qrcode img');
            if (qrImg) qrImg.removeAttribute('title'); 
        }, 150);

        // UI AKTUALIZACE
        document.getElementById("cryptoAmount").innerText = amount;
        document.getElementById("cryptoSymbol").innerText = symbol;
        document.getElementById("usdPrice").innerText = `1 ${symbol} = $${rateUsd.toLocaleString('en-US')}`; // Zobrazení ceny USD
        document.getElementById("networkBadge").innerText = document.getElementById("networkSelect").selectedOptions[0].text;
        document.getElementById("qrInstruction").innerText = instruction;
        document.getElementById("rateDisplay").innerText = `⚡ 1 USD = ${usdCzk.toFixed(2)} CZK`;

    } catch (e) { console.error("API error"); }
    finally { document.getElementById("qrArea").classList.remove("loading"); }
}

function updateChart(symbol) {
    let tvSymbol = (symbol === 'USDC' || symbol === 'USDT') ? "FX_IDC:USDCZK" : `BINANCE:${symbol}USDT`;
    document.getElementById('chart-container').innerHTML = `<div id="tv_chart"></div>`;
    new TradingView.widget({
        "autosize": true, "symbol": tvSymbol, "interval": "H", "theme": "dark",
        "style": "1", "container_id": "tv_chart", "hide_top_toolbar": true
    });
}

document.getElementById('toggleChartBtn').addEventListener('click', function() {
    const wrapper = document.getElementById('chartWrapper');
    wrapper.classList.toggle('open');
    this.innerText = wrapper.classList.contains('open') ? "🔼 Skrýt graf" : "📊 Zobrazit vývoj ceny kryptoměny";
    if(wrapper.classList.contains('open')) updateChart(document.getElementById("cryptoSelect").selectedOptions[0].dataset.symbol);
});

function updateNetworks() {
    const crypto = document.getElementById("cryptoSelect").value;
    document.getElementById("activeCoinLogo").src = COIN_LOGOS[crypto];
    const netSelect = document.getElementById("networkSelect");
    netSelect.innerHTML = "";
    NETWORKS[crypto].forEach(net => {
        let opt = document.createElement("option");
        opt.value = net.id; opt.innerHTML = net.name;
        netSelect.appendChild(opt);
    });
    calculate();
}

document.querySelectorAll('.amount-btn').forEach(btn => {
    btn.addEventListener('click', () => { 
        document.getElementById('czkInput').value = btn.dataset.value; 
        calculate(); 
    });
});

document.getElementById("czkInput").addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 500);
});
document.getElementById("cryptoSelect").addEventListener("change", updateNetworks);
document.getElementById("networkSelect").addEventListener("change", calculate);
document.getElementById("exchangeMode").addEventListener("change", calculate);

updateNetworks();
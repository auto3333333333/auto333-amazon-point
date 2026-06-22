// script.js - メインロジック（商品管理・絞り込み・カート処理）

let loadedProducts = []; 
let cartMap = JSON.parse(sessionStorage.getItem('sim_cart_data') || '{}');

// DOM要素の取得
const productListTarget = document.getElementById('product-list-target');
const cartItemsTarget = document.getElementById('cart-items-target');
const btnSubmitOrder = document.getElementById('btn-submit-order');

// 画面の初期化処理
async function initApp() {
    // 1. 左側サイドバーの絞り込み要素を category.js のデータから自動生成
    renderFilterSidebar();

    // 2. 商品データのロード
    await loadItemsFromJSON();
}

// 絞り込みサイドバーを動的に生成する関数
window.selectCustomRadio = function() {
    const customRadio = document.querySelector('input[name="filter-price"][value="custom"]');
    if (customRadio && !customRadio.checked) {
        customRadio.checked = true;
    }
};

function renderFilterSidebar() {
    const sidebar = document.getElementById('side-filter-column');
    if (!sidebar) return;
    
    sidebar.innerHTML = `
        <div class="filter-section">
            <div class="filter-title">📁 カテゴリー</div>
            ${FILTER_CONFIG.categories.map((c, i) => `
                <label class="filter-label">
                    <input type="radio" name="filter-category" value="${c.value}" ${i === 0 ? 'checked' : ''} onchange="filterProducts()">
                    ${c.label}
                </label>
            `).join('')}
        </div>

        <div class="filter-section">
            <div class="filter-title">🪙 最安価格</div>
            ${FILTER_CONFIG.priceRanges.map((p, i) => `
                <label class="filter-label">
                    <input type="radio" name="filter-price" value="${p.value}" ${i === 0 ? 'checked' : ''} onchange="filterProducts()">
                    ${p.label}
                </label>
                ${p.value === 'custom' ? `
                        <div style="padding-left:20px; margin-bottom:10px; display: flex; align-items: center; gap: 4px; font-size: 11px;">
                            <input type="number" id="custom-min" placeholder="下限なし" style="width:70px; padding: 2px 4px; border: 1px solid #ccc; border-radius: 3px;" oninput="selectCustomRadio(); filterProducts()"> 円 ～ 
                            <input type="number" id="custom-max" placeholder="上限なし" style="width:70px; padding: 2px 4px; border: 1px solid #ccc; border-radius: 3px;" oninput="selectCustomRadio(); filterProducts()"> 円
                        </div>
                    ` : ''}
            `).join('')}
        </div>

        <div class="filter-section">
            <div class="filter-title">🏷️ 注目タグ</div>
            ${FILTER_CONFIG.tags.map(t => `
                <label class="filter-label">
                    <input type="checkbox" class="filter-tag" value="${t.value}" onchange="filterProducts()">
                    ${t.label}
                </label>
            `).join('')}
        </div>
    `;
}

// JSONからアイテムを読み込む
async function loadItemsFromJSON() {
    try {
        const response = await fetch('item.json');
        loadedProducts = await response.json();
    } catch (error) {
        // item.jsonが見つからない場合のデモ用フォールバックデータ
        loadedProducts = [
            { id: "prod_001", rank: 1, name: "大容量モバイルバッテリー 20000mAh (PD対応)", price: 3980, description: "急速充電PDに対応した薄型バッテリー。", category: "ガジェット", specs: ["PD対応", "USB-C"] },
            { id: "prod_002", rank: 2, name: "高音質ワイヤレスイヤホン ノイズキャンセリング搭載", price: 6200, description: "静寂の中で極上の音楽を楽しめる高性能モデル。", category: "ガジェット", specs: ["ノイズキャンセリング", "USB-C"] },
            { id: "prod_003", rank: 3, name: "超高速マルチ充電タップ USB-C 3ポート搭載", price: 2450, description: "デスクスッキリ、これ1台でノートPCもスマホも充電可能。", category: "アクセサリ", specs: ["PD対応", "USB-C"] },
            { id: "prod_004", rank: 4, name: "4K対応 HDMIウルトラハイスピードケーブル 2.0m", price: 1280, description: "劣化のない美しい映像を伝送する高遮蔽シールドケーブル。", category: "アクセサリ", specs: ["4K"] }
        ];
    }
    filterProducts();
    updateCartView();
}


// 絞り込みロジック
const CATEGORY_MAP = {
    "スマートフォン": "ガジェット",
    "ノートパソコン": "ガジェット",
    "ヘッドホン": "ガジェット",
    "スマートウォッチ": "ガジェット",
    "イヤホン": "ガジェット",
    "タブレット": "ガジェット",
    "デジタルカメラ": "家電",
    "テレビ": "家電",
    "掃除機": "家電",
    "ゲーム機": "家電"
};

window.filterProducts = function() {
    const selectedCategory = document.querySelector('input[name="filter-category"]:checked')?.value || 'all';
    const selectedPriceRange = document.querySelector('input[name="filter-price"]:checked')?.value || 'all';
    
    // カスタム価格の取得
    const customMinEl = document.getElementById('custom-min');
    const customMaxEl = document.getElementById('custom-max');
    const customMin = (customMinEl && customMinEl.value !== '') ? parseInt(customMinEl.value, 10) : 0;
    const customMax = (customMaxEl && customMaxEl.value !== '') ? parseInt(customMaxEl.value, 10) : Infinity;

    const checkedTags = Array.from(document.querySelectorAll('.filter-tag:checked')).map(el => el.value);

    const filtered = loadedProducts.filter(product => {
        // カテゴリー判定
        if (selectedCategory !== 'all') {
            const mappedCategory = CATEGORY_MAP[product.category] || product.category;
            if (mappedCategory !== selectedCategory) return false;
        }

        // 価格帯判定
        if (selectedPriceRange === 'custom') {
            if (product.price < customMin || product.price > customMax) return false;
        } else if (selectedPriceRange !== 'all') {
            const rangeConfig = FILTER_CONFIG.priceRanges.find(r => r.value === selectedPriceRange);
            if (rangeConfig && rangeConfig.test && !rangeConfig.test(product.price)) return false;
        }

        // タグ（スペック）判定 - 商品名、説明、スペックの中から部分一致
        if (checkedTags.length > 0) {
            const hasAllTags = checkedTags.every(tag => {
                const inSpecs = product.specs && product.specs.some(spec => spec.includes(tag));
                const inDesc = product.description && product.description.includes(tag);
                const inName = product.name && product.name.includes(tag);
                return inSpecs || inDesc || inName;
            });
            if (!hasAllTags) return false;
        }
        return true;
    });

    renderProductList(filtered);
};

// 商品リストの描画
// 商品リストの描画
function renderProductList(products) {
    productListTarget.innerHTML = ''; 
    if (products.length === 0) {
        productListTarget.innerHTML = '<div style="color:#888; text-align:center; padding:40px 0; font-size:13px;">該当する商品が見つかりません。条件を変えてお試しください。</div>';
        return;
    }

    products.forEach(product => {
        const row = document.createElement('div');
        row.className = 'product-item-row';
        const tagsHTML = product.specs ? product.specs.map(spec => `<span class="spec-tag">${spec}</span>`).join('') : '';
        
        // 【修正ポイント】rankの項目が存在し、かつ 0 ではない場合のみランキングを表示する
        const rankHTML = (product.rank !== undefined && product.rank !== null && product.rank !== '') 
            ? `<div class="item-rank">注目ランキング ${product.rank}位</div>` 
            : ''; // なければ空にする

        row.innerHTML = `
            <div class="item-image-box" onclick="location.href='itemshow.html?id=${product.id}'">
                <img src="assets/image/${product.id}.avif" 
                    class="product-photo" 
                    alt="${product.name}" 
                    onerror="
                        if(!this.dataset.triedWebp){
                            this.dataset.triedWebp=true; 
                            this.src='assets/image/${product.id}.webp';
                        }else if(!this.dataset.triedJpg){
                            this.dataset.triedJpg=true; 
                            this.src='assets/image/${product.id}.jpg';
                        }else if(!this.dataset.triedPng){
                            this.dataset.triedPng=true; 
                            this.src='assets/image/${product.id}.png';
                        }else{
                            this.onerror=null; 
                            this.src='https://placehold.jp/120x120.png?text=NO+IMAGE';
                        }
                    ">
            </div>
            <div class="item-info-box">
                ${rankHTML} <a href="itemshow.html?id=${product.id}" class="item-title-text">${product.name}</a>
                <p class="item-description">${product.description}</p>
                <div class="item-spec-tags">${tagsHTML}</div>
            </div>
            <div class="item-action-box">
                <div><span style="font-size:11px; color:#666; display:block;">最安価格(税込)</span><span class="price-value">￥${product.price.toLocaleString()}</span></div>
                <button class="btn-action btn-blue" onclick="addItemToCart('${product.id}')">カートに追加</button>
            </div>
        `;
        productListTarget.appendChild(row);
    });
}

// カート表示の更新
function updateCartView() {
    cartItemsTarget.innerHTML = '';
    let totalCount = 0; let totalAmount = 0;
    const keys = Object.keys(cartMap);
    
    if (keys.length === 0) {
        cartItemsTarget.innerHTML = '<div style="color:#999; text-align:center; padding:30px 0; font-size:12px;">カートは空です。</div>';
        document.getElementById('total-count-badge').textContent = "0点";
        document.getElementById('total-price-display').textContent = "￥0";
        btnSubmitOrder.disabled = true; 
        sessionStorage.removeItem('sim_cart_data');
        return;
    }
    
    btnSubmitOrder.disabled = false;
    
    keys.forEach(id => {
        const item = cartMap[id];
        totalCount += item.quantity;
        const subtotal = item.product.price * item.quantity;
        totalAmount += subtotal;

        const cartRow = document.createElement('div');
        cartRow.className = 'cart-row';
        cartRow.innerHTML = `
                    <div class="cart-row-top">${item.product.name}</div>
                    <div class="cart-row-bottom">
                        <div class="qty-controller">
                            <button class="btn-qty" onclick="changeQty('${id}', -1)">−</button>
                            <input type="number" class="qty-number" value="${item.quantity}" min="1" onchange="directChangeQty('${id}', this.value)">
                            <button class="btn-qty" onclick="changeQty('${id}', 1)">+</button>
                        </div>
                        <span style="font-weight:bold; color:#cc0000; font-size:11px;">
                            ￥${item.product.price.toLocaleString()}(${subtotal.toLocaleString()})
                        </span>
                    </div>
                `;
        cartItemsTarget.appendChild(cartRow);
    });
    
    document.getElementById('total-count-badge').textContent = `${totalCount}点`;
    document.getElementById('total-price-display').textContent = `￥${totalAmount.toLocaleString()}`;
    sessionStorage.setItem('sim_cart_data', JSON.stringify(cartMap));
}

// 通知をためて表示する共通関数
function showNotification(message) {
    // 1. 画面内に通知用コンテナがあるか確認。なければ作る
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // 2. 新しい通知要素を作成
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = message; // 【修正】textContent から innerHTML に変更
    
    // コンテナに追加（末尾に追加されるので、古いものが上、新しいものが下にたまります）
    container.appendChild(toast);

    // 🎵 【修正】assets/sounds/notify.ogg を読み込んで再生
    try {
        const notificationSound = new Audio('assets/sounds/notification01.mp3');
        notificationSound.volume = 0.5; // 音量を50%に設定（お好みにあわせて0.0〜1.0で調整してください）
        notificationSound.play();
    } catch (e) {
        console.log("音声を再生できませんでした:", e);
    }
    // 3. アニメーション用に一瞬遅らせて表示クラスを付与
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // 4. 3秒後にこの通知だけを個別に消去
    setTimeout(() => {
        toast.classList.remove('show');
        // フェードアウトの動作（0.3秒）が終わってから要素を完全に削除
        setTimeout(() => {
            toast.remove();
            // もしコンテナの中身が空っぽになったら、コンテナ自体も削除してキレイにする
            if (container.childElementCount === 0) {
                container.remove();
            }
        }, 300);
    }, 3000);
}

// カートに追加する関数（修正版）
window.addItemToCart = function(productId) {
    const matched = loadedProducts.find(p => p.id === productId);
    if (!matched) return;
    
    if (cartMap[productId]) { 
        cartMap[productId].quantity += 1; 
    } else { 
        cartMap[productId] = { product: matched, quantity: 1 }; 
    }
    
    updateCartView();
    
    // 【追記】通知を実行
    showNotification(`<span style="color: #ff3333; font-weight: bold;">${matched.name}</span> をカートに追加しました。`);
};

// カート内の数量変更
window.changeQty = function(id, delta) {
    if (!cartMap[id]) return;
    
    const productName = cartMap[id].product.name; // 通知用に商品名を取得しておく

    cartMap[id].quantity += delta;
    
    if (cartMap[id].quantity <= 0) { 
        delete cartMap[id]; 
        updateCartView();
        // 💡 数量が0になってカートから削除されたときの通知
        showNotification(`<span style="color: #ff3333; font-weight: bold;">${productName}</span> をカートから削除しました。`);
    } else {
        updateCartView();
        // 💡 数量が増減したときの通知（+1 のときは「追加」、-1 のときは「減らしました」）
        if (delta > 0) {
            showNotification(`<span style="color: #ff3333; font-weight: bold;">${productName}</span> の数量1を増やしました。`);
        } else {
            showNotification(`<span style="color: #ff3333; font-weight: bold;">${productName}</span> の数量1を減らしました。`);
        }
    }
};

// 💡 キーボードからの直接打ち込みに対応する関数
window.directChangeQty = function(id, val) {
    if (!cartMap[id]) return;

    let newQty = parseInt(val, 10);
    const productName = cartMap[id].product.name;

    // 入力された値が空、または1未満の不正な数値だった場合は強制的に1に戻す
    if (isNaN(newQty) || newQty < 1) {
        newQty = 1;
    }

    cartMap[id].quantity = newQty;
    updateCartView();

    // 打ち込み完了の通知を表示
    showNotification(`<span style="color: #ff3333; font-weight: bold;">${productName}</span> の数量を ${newQty} 個に変更しました。`);
};

// アプリの起動
initApp();
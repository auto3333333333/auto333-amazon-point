// category.js - 絞り込み条件のデータ定義

const FILTER_CONFIG = {
    // カテゴリー定義 (値, 画面表示名)
    categories: [
        { value: "all", label: "すべて" },
        { value: "家電", label: "家電" },
        { value: "ガジェット", label: "ガジェット" },
        { value: "アクセサリ", label: "アクセサリ" }
    ],
    
    // 価格帯定義 (値, 画面表示名, 判定ロジック用)
    priceRanges: [
        { value: "all", label: "すべて (指定なし)" },
        { value: "under50k", label: "5万円以下", test: price => price <= 50000 },
        { value: "50k-150k", label: "5万円～15万円", test: price => price >= 50000 && price <= 150000 },
        { value: "over150k", label: "15万円以上", test: price => price >= 150000 },
        { value: "custom", label: "カスタム設定" }
    ],
    
    // 注目タグ（スペック）定義
    tags: [
        { value: "PD対応", label: "PD対応" },
        { value: "ノイズキャンセリング", label: "ノイズ遮断" },
        { value: "USB-C", label: "USB-C" },
        { value: "4K", label: "4K対応" }
    ]
};
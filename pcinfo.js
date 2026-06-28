// --- 1. ネットワーク環境の取得 ---
const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
if (conn) {
    document.getElementById('net-type').textContent = conn.type ? conn.type.toUpperCase() : `${conn.effectiveType.toUpperCase()} 相当の回線`;
    document.getElementById('net-downlink').textContent = conn.downlink ? `${conn.downlink} Mbps (概算)` : "取得不可";
    document.getElementById('net-rtt').textContent = conn.rtt ? `${conn.rtt} ms` : "取得不可";
    document.getElementById('net-savedata').textContent = conn.saveData ? "ON (データセーバー有効)" : "OFF (通常通信モード)";
} else {
    const msg = "非対応ブラウザ (Safari/Firefox等)";
    document.getElementById('net-type').textContent = msg;
    document.getElementById('net-downlink').textContent = "取得不可";
    document.getElementById('net-rtt').textContent = "取得不可";
    document.getElementById('net-savedata').textContent = "取得不可";
}

// WebRTCによる高度なIPアドレス検出
function scanWebRTCIPs() {
    const statusMsg = document.getElementById('ip-status');
    const detectedIPs = new Set();
    const RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
    
    if (!RTCPeerConnection) { 
        statusMsg.textContent = "WebRTC非対応のためIP取得不可"; 
        return; 
    }

    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.createDataChannel("");
    pc.createOffer().then(offer => pc.setLocalDescription(offer));
    
    function getIpType(ip) {
        if (ip.includes(":")) return { label: "IPv6 アドレス", class: "ip-ipv6" };
        if (ip.startsWith("192.168.") || ip.startsWith("10.") || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip)) {
            return { label: "ローカルIP (ルーター内・宅内LAN)", class: "ip-local" };
        }
        if (ip === "127.0.0.1") return { label: "ローカルホスト", class: "ip-local" };
        return { label: "グローバルIP (インターネット外向きアドレス)", class: "ip-public" };
    }

    pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) {
            if (detectedIPs.size === 0) {
                statusMsg.innerHTML = "🔒 <b>保護されています:</b> mDNS難読化、またはセキュリティ設定によりIPが隠蔽されています。";
            }
            return;
        }
        const candidate = ice.candidate.candidate;
        const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9:]+)/gi;
        const matches = candidate.match(ipRegex);

        if (matches) {
            matches.forEach(ip => {
                if (!detectedIPs.has(ip) && !ip.endsWith('.local') && ip.length > 5) {
                    detectedIPs.add(ip);
                    const typeInfo = getIpType(ip);

                    statusMsg.style.display = "none";
                    const resultTable = document.getElementById('result-ip-table');
                    resultTable.style.display = "table";

                    const tbody = document.getElementById('ip-table-body');
                    const row = `
                        <tr>
                            <td class="highlight" style="width:50%; border:none; padding:6px 0;">${ip}</td>
                            <td style="border:none; padding:6px 0;"><span class="ip-badge ${typeInfo.class}">${typeInfo.label}</span></td>
                        </tr>
                    `;
                    tbody.insertAdjacentHTML('beforeend', row);
                }
            });
        }
    };
}
scanWebRTCIPs();

// --- 2. ハードウェア情報の取得 ---
document.getElementById('cpu-cores').textContent = navigator.hardwareConcurrency ? navigator.hardwareConcurrency + " コア" : "非開示";
document.getElementById('device-memory').textContent = navigator.deviceMemory ? navigator.deviceMemory + " GB" : "非開示（プライバシー制限）";
document.getElementById('max-touch').textContent = navigator.maxTouchPoints + " ポイント";

window.addEventListener("deviceorientation", (e) => {
    if(e.alpha !== null) {
        document.getElementById('device-orientation').textContent = `α(方位): ${e.alpha.toFixed(2)}, β(前後): ${e.beta.toFixed(2)}, γ(左右): ${e.gamma.toFixed(2)}`;
        document.getElementById('device-orientation').className = "highlight";
    }
}, true);

// --- 3. グラフィックス & ディスプレイ ---
document.getElementById('screen-size').textContent = `物理: ${window.screen.width}x${window.screen.height} | 有効: ${window.screen.availWidth}x${window.screen.availHeight}`;
document.getElementById('pixel-ratio').textContent = window.devicePixelRatio;
document.getElementById('color-depth').textContent = `${window.screen.colorDepth} bit`;

const isHDR = window.matchMedia && window.matchMedia('(dynamic-range: high)').matches;
document.getElementById('hdr-support').textContent = isHDR ? "対応 (High Dynamic Range)" : "非対応 / 検知不可";

// リフレッシュレート(Hz)の計測
let fpsCount = 0;
let fpsStartTime = performance.now();
function calcFPS(timestamp) {
    fpsCount++;
    if (timestamp - fpsStartTime >= 1000) {
        document.getElementById('refresh-rate').textContent = Math.round((fpsCount * 1000) / (timestamp - fpsStartTime)) + " Hz";
        return;
    }
    requestAnimationFrame(calcFPS);
}
requestAnimationFrame(calcFPS);

// WebGL (GPU) 詳細取得
try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        document.getElementById('gpu-vendor').textContent = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "制限あり";
        document.getElementById('gpu-renderer').textContent = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "制限あり";
        document.getElementById('webgl-extensions').textContent = gl.getSupportedExtensions().length + " 個";
    }
} catch(e) {
    document.getElementById('gpu-vendor').textContent = "取得エラー";
    document.getElementById('gpu-renderer').textContent = "取得エラー";
}

// --- 4. オーディオ情報 ---
try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if(AudioContext) {
        const audioCtx = new AudioContext();
        document.getElementById('audio-sr').textContent = audioCtx.sampleRate + " Hz";
        document.getElementById('audio-channels').textContent = audioCtx.destination.maxChannelCount + " ch";
        document.getElementById('autoplay').textContent = audioCtx.state === 'suspended' ? "制限あり (要アクション)" : "即時自動再生可能";
        audioCtx.close();
    }
} catch(e) { }

// --- 5. ストレージ容量制限 ---
if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then(estimate => {
        document.getElementById('storage-quota').textContent = (estimate.quota / (1024 * 1024 * 1024)).toFixed(2) + " GB";
        document.getElementById('storage-usage').textContent = (estimate.usage / (1024 * 1024)).toFixed(2) + " MB";
    });
    navigator.storage.persisted().then(persisted => {
        document.getElementById('storage-persisted').textContent = persisted ? "永続化" : "一時的（容量不足時に自動削除対象）";
    });
}

// --- 6. 環境固有情報 ---
document.getElementById('timezone').textContent = `${Intl.DateTimeFormat().resolvedOptions().timeZone} (UTC ${-new Date().getTimezoneOffset()/60}時間)`;

let pluginsTxt = "";
if(navigator.plugins && navigator.plugins.length > 0) {
    for(let i=0; i<navigator.plugins.length; i++) {
        pluginsTxt += `${navigator.plugins[i].name}\n`;
    }
} else { pluginsTxt = "なし (またはブラウザによる隠蔽)"; }
document.getElementById('plugins-list').textContent = pluginsTxt;

// フォント検知
const testFonts = ['Arial', 'Courier New', 'Georgia', 'MS Gothic', 'Meiryo', 'Yu Gothic', 'Segoe UI', 'Helvetica'];
let detectedFonts = [];
const body = document.getElementsByTagName("body")[0];
testFonts.forEach(font => {
    const span = document.createElement("span");
    span.style.fontSize = "72px"; span.innerHTML = "mmmmmmmmmmlli"; span.style.fontFamily = font;
    body.appendChild(span);
    if (span.offsetWidth) { detectedFonts.push(font); }
    body.removeChild(span);
});
document.getElementById('fonts-list').textContent = detectedFonts.join(', ');

// --- 7. セキュリティ設定 ---
document.getElementById('ua-full').textContent = navigator.userAgent;
document.getElementById('dnt').textContent = navigator.doNotTrack === "1" ? "有効" : "無効 / 未設定";
document.getElementById('cookie-status').textContent = navigator.cookieEnabled ? "有効" : "無効";

if (navigator.userAgentData) {
    navigator.userAgentData.getHighEntropyValues(["architecture", "model", "platformVersion", "uaFullVersion"])
    .then(hints => { document.getElementById('ua-hints').textContent = JSON.stringify(hints, null, 2); });
} else {
    document.getElementById('ua-hints').textContent = "Client Hints 非対応";
}

// --- 8. 一括権限要求（ボタン押下時） ---
function requestAllPermissions() {
    // メディア機器
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        .then(stream => {
            navigator.mediaDevices.enumerateDevices().then(devices => {
                let devList = [];
                devices.forEach(device => {
                    if(device.label) devList.push(`【${device.kind}】 ${device.label}`);
                });
                document.getElementById('media-devices').innerHTML = `<span class="allowed">アクセス成功</span><br>` + (devList.join('<br>') || "機器名不詳");
                stream.getTracks().forEach(track => track.stop());
            });
        })
        .catch(err => {
            document.getElementById('media-devices').innerHTML = `<span class="denied">拒否されました (${err.name})</span>`;
        });
    }

    // GPS詳細情報 ＆ 地図描画
    if (navigator.geolocation) {
        const geoDiv = document.getElementById('geo-advanced');
        const mapContainer = document.getElementById('geo-map');
        geoDiv.innerHTML = "GPS信号を計算中...";
        
        navigator.geolocation.getCurrentPosition(
            position => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                // テキストデータの書き込み
                geoDiv.className = "geo-info";
                geoDiv.innerHTML = `
                    <p><span class="allowed">■ 位置情報取得成功</span></p>
                    <ul style="margin:0; padding-left:20px; line-height: 1.6;">
                        <li><b>緯度:</b> ${lat}</li>
                        <li><b>経度:</b> ${lon}</li>
                        <li><b>正確さ(誤差範囲):</b> 約 ${position.coords.accuracy} m</li>
                        <li><b>高度 (海抜):</b> ${position.coords.altitude !== null ? position.coords.altitude + ' m' : '取得不可'}</li>
                        <li><b>移動速度:</b> ${position.coords.speed !== null ? position.coords.speed + ' m/s' : '静止中または取得不可'}</li>
                        <li><b>方角 (移動方向):</b> ${position.coords.heading !== null ? position.coords.heading + '度' : '取得不可'}</li>
                        <li><b>取得時刻:</b> ${new Date(position.timestamp).toLocaleString()}</li>
                    </ul>
                `;
                
                // OpenStreetMapの埋め込みiFrameを生成して地図を表示
                mapContainer.style.display = "block";
                // bbox（境界ボックス）を現在地からわずかに広げてマーカーを中心に表示させるURL構造
                const offset = 0.005; 
                const bbox = `${lon - offset},${lat - offset},${lon + offset},${lat + offset}`;
                mapContainer.innerHTML = `
                    <iframe 
                        src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}">
                    </iframe>
                `;
            },
            err => { 
                geoDiv.innerHTML = `<span class="denied">位置情報の取得に失敗: ${err.message}</span>`; 
                mapContainer.style.display = "none";
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }
}
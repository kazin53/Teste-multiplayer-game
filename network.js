// network.js — Módulo P2P simples via PeerJS com interface integrada
// Compatível com jj01.js (usa a variável global "player" e "scene")

let peer;                    // Objeto PeerJS local
let connections = [];        // Conexões ativas
let remotePlayers = {};      // Jogadores remotos (modelos 3D)

// ==============================
// 🔌 Inicialização do PeerJS
// ==============================
function initNetwork() {
  peer = new Peer();

  peer.on("open", id => {
    console.log(`🟢 Conectado à rede PeerJS! Seu ID: ${id}`);
    const idLabel = document.getElementById("myPeerId");
    if (idLabel) idLabel.textContent = id;
  });

  peer.on("connection", conn => {
    console.log("🔗 Novo jogador conectado!");
    setupConnection(conn);
  });

  peer.on("error", err => console.error("Erro PeerJS:", err));
}

// ==============================
// 🤝 Conectar a outro Peer
// ==============================
function connectToPeer(peerId) {
  if (!peer) return console.error("PeerJS ainda não iniciado!");
  if (!peerId) return alert("Digite um ID válido!");
  console.log(`Tentando conectar a ${peerId}...`);
  const conn = peer.connect(peerId);
  setupConnection(conn);
}

// ==============================
// ⚙️ Configuração da conexão
// ==============================
function setupConnection(conn) {
  conn.on("open", () => {
    console.log("✅ Conectado a um jogador!");
    connections.push(conn);
  });

  conn.on("data", data => {
    try {
      const packet = JSON.parse(data);
      updateRemotePlayer(packet);
    } catch (err) {
      console.error("Erro ao processar pacote:", err);
    }
  });

  conn.on("close", () => {
    console.warn("🚫 Um jogador saiu.");
    connections = connections.filter(c => c !== conn);
  });
}

// ==============================
// 📤 Enviar dados leves do jogador
// ==============================
function sendPlayerData() {
  if (!player || connections.length === 0 || !peer?.id) return;

  const packet = {
    id: peer.id,
    x: player.position.x,
    y: player.position.y,
    z: player.position.z,
    ry: player.rotation.y
  };

  const message = JSON.stringify(packet);
  connections.forEach(conn => conn.send(message));
}

// ==============================
// 📥 Atualizar posição dos outros jogadores
// ==============================
function updateRemotePlayer(packet) {
  if (!scene || !packet?.id) return;
  let rp = remotePlayers[packet.id];

  if (!rp) {
    // Cria um modelo simples para representar o outro jogador
    const geo = new THREE.BoxGeometry(1, 2, 1);
    const mat = new THREE.MeshLambertMaterial({ color: 0x00ffff });
    rp = new THREE.Mesh(geo, mat);
    rp.position.set(packet.x, packet.y, packet.z);
    scene.add(rp);
    remotePlayers[packet.id] = rp;
    console.log(`👤 Novo jogador remoto (${packet.id}) adicionado à cena.`);
  }

  // Atualiza posição e rotação suavemente
  rp.position.lerp(new THREE.Vector3(packet.x, packet.y, packet.z), 0.3);
  rp.rotation.y = packet.ry;
}

// ==============================
// 🔁 Atualizar rede no loop principal
// ==============================
function updateNetwork() {
  sendPlayerData();
}

// ==============================
// 🧩 Interface visual do multiplayer
// ==============================
window.addEventListener("load", () => {
  // Cria elementos do menu se não existirem
  if (!document.getElementById("btnMultiplayer")) {
    const html = `
      <button id="btnMultiplayer" class="menu-btn-icon" style="right:60px;">🔗</button>
      <div id="multiplayerMenu" class="modal-overlay" style="display:none;">
        <div class="modal-content-game">
          <h2>🌐 Multiplayer P2P</h2>
          <p>Seu ID: <span id="myPeerId">Carregando...</span></p>
          <input type="text" id="peerInput" placeholder="ID do jogador..." style="width:100%;padding:6px;">
          <button id="connectBtn" class="modal-option-btn">Conectar</button>
          <button id="closeMultiplayer" class="modal-close-btn">Voltar</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);
  }

  // Elementos
  const btnMultiplayer = document.getElementById("btnMultiplayer");
  const menu = document.getElementById("multiplayerMenu");
  const closeBtn = document.getElementById("closeMultiplayer");
  const connectBtn = document.getElementById("connectBtn");
  const peerInput = document.getElementById("peerInput");
  const myPeerIdLabel = document.getElementById("myPeerId");

  // Mostrar/ocultar menu
  btnMultiplayer.addEventListener("click", () => menu.style.display = "flex");
  closeBtn.addEventListener("click", () => menu.style.display = "none");

  // Botão de conexão
  connectBtn.addEventListener("click", () => {
    const targetId = peerInput.value.trim();
    if (targetId) {
      connectToPeer(targetId);
      menu.style.display = "none";
    } else {
      alert("Digite um ID válido para conectar!");
    }
  });

  // Atualiza o ID exibido a cada segundo até o PeerJS inicializar
  const checkId = setInterval(() => {
    if (peer && peer.id) {
      myPeerIdLabel.textContent = peer.id;
      clearInterval(checkId);
    }
  }, 1000);

  // Inicia o PeerJS automaticamente
  initNetwork();
});
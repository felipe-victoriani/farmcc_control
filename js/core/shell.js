/**
 * @file shell.js
 * @description Inicialização do shell do FarmaCC Pro.
 *
 * Responsabilidades:
 *  - Definir o hash inicial de rota a partir do atributo `data-default-route`
 *    no elemento <body> (sem modificar este arquivo por módulo).
 *  - Remover a tela de carregamento quando o app emitir `app:ready`.
 *  - Detectar estado online/offline e ajustar o layout.
 *
 * Este arquivo NÃO é um ES module — deve ser carregado com <script src>
 * antes do <script type="module"> do app.js, garantindo execução síncrona.
 */

(function () {
  "use strict";

  /* ----------------------------------------------------------
     1. Roteamento inicial por hash
     Lê data-default-route do <body>; se o hash estiver vazio,
     define o hash para o módulo desta página.
  ---------------------------------------------------------- */
  var defaultRoute =
    document.body.getAttribute("data-default-route") || "dashboard";

  if (!location.hash || location.hash === "#") {
    location.hash = "#" + defaultRoute;
  }

  /* ----------------------------------------------------------
     2. Remoção da tela de carregamento
     Aguarda o evento `app:ready` disparado por app.js.
     Fallback de 8 s caso o evento não seja disparado.
  ---------------------------------------------------------- */
  function removeLoading() {
    var loading = document.getElementById("app-loading");
    if (loading) {
      loading.classList.add("fade-out");
      setTimeout(function () {
        loading.remove();
      }, 400);
    }
  }

  document.addEventListener("app:ready", removeLoading);
  setTimeout(removeLoading, 8000);

  /* ----------------------------------------------------------
     3. Detecção de estado offline
     Adiciona/remove a classe `is-offline` no <body> para que
     o CSS ajuste o layout (banner e padding do app-layout).
  ---------------------------------------------------------- */
  function updateOfflineBody() {
    document.body.classList.toggle("is-offline", !navigator.onLine);
  }

  window.addEventListener("online", updateOfflineBody);
  window.addEventListener("offline", updateOfflineBody);
  updateOfflineBody();
})();

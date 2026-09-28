// Service worker só pra notificações: recebe o push e abre o link ao tocar.
// Sem cache offline de propósito — o painel depende do banco pra tudo.

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Guia de Captação", {
      body: data.body || "",
      icon: "/apple-icon",
      data: { url: data.url || "/admin" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data.url, self.location.origin).href;
  // Reaproveita a janela do app se já estiver aberta, em vez de abrir outra.
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const client = clients[0];
        if (client) return client.navigate(url).then((c) => (c || client).focus());
        return self.clients.openWindow(url);
      })
  );
});

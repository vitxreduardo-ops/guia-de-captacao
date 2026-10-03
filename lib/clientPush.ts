import "server-only";
import { sendPushToUser } from "@/lib/push";
import { listClientUsers } from "@/lib/users";

/**
 * Avisa as pessoas do portal de um cliente. O push é extra: se o aparelho ou
 * o serviço falhar, a ação que o causou (liberar material, publicar roteiro)
 * não pode quebrar, então os erros só vão pro log.
 */
export async function notifyClientUsers(
  clientId: string,
  payload: { title: string; body: string; url: string }
) {
  try {
    const users = await listClientUsers(clientId);
    await Promise.all(
      users.map((user) =>
        sendPushToUser(user.id, payload).catch((err) =>
          console.error("Falha no push do cliente", err)
        )
      )
    );
  } catch (err) {
    console.error("Falha ao avisar o cliente", err);
  }
}

import "server-only";

/**
 * Manda um aviso pro WhatsApp do dono do estúdio pelo CallMeBot. É serviço de
 * terceiro e sem garantia: falhar aqui nunca pode derrubar o que já foi salvo,
 * por isso o erro é registrado e engolido.
 */
export async function sendWhatsAppNotice(text: string): Promise<boolean> {
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) {
    console.warn("CallMeBot não configurado: aviso de WhatsApp não enviado.");
    return false;
  }

  const url =
    "https://api.callmebot.com/whatsapp.php" +
    `?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(text)}` +
    `&apikey=${encodeURIComponent(apikey)}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      console.error("CallMeBot respondeu", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("CallMeBot falhou", error);
    return false;
  }
}

/**
 * Cloudflare Worker для GhostLayer
 * Функции: проверка лицензии (отзыв) и проверка обновлений.
 */

// Список отозванных ключей (или User ID)
// В реальном проекте лучше хранить в KV Storage или D1 Database
const REVOKED_IDS = [
  "USER_BANNED_123",
  "LEAKED_KEY_XYZ"
];

const LATEST_VERSION = "1.0.0";
const UPDATE_URL = "https://ghostlayer.app/download";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Получаем параметры
    const licenseKey = url.searchParams.get("key") || "";
    const clientVersion = url.searchParams.get("version") || "0.0.0";

    // Логика проверки отзыва
    let isRevoked = false;
    
    // Парсим UserID из ключа (формат PRO-DATE-USERID.SIGNATURE)
    // Это базовая проверка, можно усложнить
    if (licenseKey.includes(".")) {
      const payload = licenseKey.split(".")[0]; // PRO-DATE-USERID
      const parts = payload.split("-");
      if (parts.length >= 3) {
        const userId = parts[2];
        if (REVOKED_IDS.includes(userId)) {
          isRevoked = true;
        }
      }
    }

    // Формируем ответ
    const response = {
      valid: !isRevoked,
      revoked: isRevoked,
      latest_version: LATEST_VERSION,
      update_url: UPDATE_URL
    };

    return new Response(JSON.stringify(response), {
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*" // CORS
      },
    });
  },
};

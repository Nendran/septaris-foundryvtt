import {
  applyDamageFromAttack,
  type DamageRequest,
  type DamageResult,
} from "../combat/damage-application.js";

const QUERY_NAME = "septaris.applyDamage";
const QUERY_TIMEOUT = 30_000;

type QueryHandler = (
  payload: unknown,
  context?: unknown,
  sender?: unknown,
) => Promise<DamageResult>;

function isDamageRequest(value: unknown): value is DamageRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).messageUuid === "string"
  );
}

/**
 * Retrouve l'identité de l'émetteur dans les métadonnées
 * fournies par Foundry, jamais dans le payload utilisateur.
 */
function resolveSender(value: unknown): foundry.documents.User | null {
  if (value instanceof foundry.documents.User) {
    return value;
  }

  if (typeof value === "string") {
    return game.users.get(value) ?? null;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const context = value as Record<string, unknown>;

  for (const key of ["user", "userId", "sender", "senderId"]) {
    const candidate = context[key];

    if (candidate === value) continue;

    const user = resolveSender(candidate);

    if (user) return user;
  }

  return null;
}

/**
 * À appeler lors de l'initialisation du système.
 * L'enregistrement doit exister sur tous les clients.
 */
export function registerDamageRequests(): void {
  const queries = CONFIG.queries as unknown as Record<
    string,
    QueryHandler | undefined
  >;

  if (queries[QUERY_NAME]) {
    throw new Error("SEPTARIS | Requête de dégâts déjà enregistrée");
  }

  queries[QUERY_NAME] = async (
    payload: unknown,
    context?: unknown,
    sender?: unknown,
  ): Promise<DamageResult> => {
    if (!game.user?.isGM) {
      throw new Error("SEPTARIS | Requête reçue hors session MJ");
    }

    if (!isDamageRequest(payload)) {
      throw new Error("SEPTARIS | Demande de dégâts invalide");
    }

    // L'identité doit venir des métadonnées authentifiées
    // transmises par Foundry VTT 14.
    const requestingUser = resolveSender(sender) ?? resolveSender(context);

    if (!requestingUser) {
      throw new Error("SEPTARIS | Impossible d'authentifier l'émetteur");
    }

    return applyDamageFromAttack(payload, requestingUser);
  };
}

/**
 * Demande l'application des dégâts d'une attaque enregistrée.
 * Le MJ actif effectue la mise à jour automatiquement.
 */
export async function requestDamageApplication(
  messageUuid: string,
): Promise<DamageResult> {
  const currentUser = game.user;

  if (!currentUser) {
    throw new Error("SEPTARIS | Utilisateur introuvable");
  }

  const request: DamageRequest = { messageUuid };

  const activeGM = game.users.activeGM;

  // Cas où le MJ réalise lui-même l'attaque.
  if (currentUser.isGM && (!activeGM || activeGM.id === currentUser.id)) {
    return applyDamageFromAttack(request, currentUser);
  }

  if (!activeGM?.active) {
    throw new Error("SEPTARIS | Aucun MJ actif pour appliquer les dégâts");
  }

  try {
    const response: unknown = await activeGM.query(QUERY_NAME, request, {
      timeout: QUERY_TIMEOUT,
    });

    if (
      typeof response !== "object" ||
      response === null ||
      typeof (response as DamageResult).applied !== "boolean" ||
      typeof (response as DamageResult).remainingHealth !== "number"
    ) {
      throw new Error("SEPTARIS | Réponse du MJ invalide");
    }

    return response as DamageResult;
  } catch (error) {
    console.error("SEPTARIS | Application des dégâts :", error);

    throw new Error("SEPTARIS | Les dégâts n'ont pas pu être appliqués", {
      cause: error,
    });
  }
}

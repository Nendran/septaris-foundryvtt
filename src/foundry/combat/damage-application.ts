import { CharacterData } from "../../data/actor/character.js";
import { NPCData } from "../../data/actor/npc.js";
import { calculateDamage } from "../../rules/conflit/damage.js";
import { resolveAction } from "../../rules/resolution/resolution.js";

export interface DamageRequest {
  messageUuid: string;
}

export interface DamageResult {
  applied: boolean;
  alreadyApplied: boolean;
  damage: number;
  remainingHealth: number;
}

interface AttackMetadata {
  kind: "attack";
  attackerUuid: string;
  targetTokenUuid: string;
}

const SCOPE = "septaris";
const HISTORY_FLAG = "appliedDamageAttacks";
const HISTORY_LIMIT = 100;

// Sérialisation des mises à jour par acteur.
const pendingUpdates = new Map<string, Promise<void>>();

function isAttackMetadata(value: unknown): value is AttackMetadata {
  if (typeof value !== "object" || value === null) return false;

  const data = value as Record<string, unknown>;

  return (
    data.kind === "attack" &&
    typeof data.attackerUuid === "string" &&
    data.attackerUuid.length > 0 &&
    typeof data.targetTokenUuid === "string" &&
    data.targetTokenUuid.length > 0
  );
}

function readRollTotal(value: unknown): number {
  const data: unknown = typeof value === "string" ? JSON.parse(value) : value;

  if (typeof data !== "object" || data === null) {
    throw new Error("SEPTARIS | Jet invalide");
  }

  const total = (data as { total?: unknown }).total;

  if (typeof total !== "number" || !Number.isFinite(total)) {
    throw new Error("SEPTARIS | Résultat de dé invalide");
  }

  return total;
}

async function serializeUpdate<T>(
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = pendingUpdates.get(key) ?? Promise.resolve();

  let release!: () => void;

  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  const tail = previous.then(() => current);
  pendingUpdates.set(key, tail);

  await previous;

  try {
    return await operation();
  } finally {
    release();

    if (pendingUpdates.get(key) === tail) {
      pendingUpdates.delete(key);
    }
  }
}

export async function applyDamageFromAttack(
  request: DamageRequest,
  sender: foundry.documents.User,
): Promise<DamageResult> {
  if (!game.user?.isGM) {
    throw new Error("SEPTARIS | Exécution réservée au MJ");
  }

  if (!sender?.id) {
    throw new Error("SEPTARIS | Émetteur non identifié");
  }

  if (
    typeof request?.messageUuid !== "string" ||
    !request.messageUuid.startsWith("ChatMessage.")
  ) {
    throw new Error("SEPTARIS | Référence d'attaque invalide");
  }

  const message = await foundry.utils.fromUuid(request.messageUuid);

  if (!(message instanceof foundry.documents.ChatMessage)) {
    throw new Error("SEPTARIS | Message d'attaque introuvable");
  }

  // Le message doit provenir de l'utilisateur qui demande l'application.
  if (message.author?.id !== sender.id) {
    throw new Error("SEPTARIS | Auteur de l'attaque invalide");
  }

  const metadata: unknown = message.getFlag(SCOPE, "attack");

  if (!isAttackMetadata(metadata)) {
    throw new Error("SEPTARIS | Métadonnées d'attaque invalides");
  }

  const attacker = await foundry.utils.fromUuid(metadata.attackerUuid);
  const targetToken = await foundry.utils.fromUuid(metadata.targetTokenUuid);

  if (!(attacker instanceof foundry.documents.Actor)) {
    throw new Error("SEPTARIS | Attaquant introuvable");
  }

  if (!(targetToken instanceof foundry.documents.TokenDocument)) {
    throw new Error("SEPTARIS | Token ciblé introuvable");
  }

  const defender = targetToken.actor;

  if (!(defender instanceof foundry.documents.Actor)) {
    throw new Error("SEPTARIS | Défenseur introuvable");
  }

  const attackerSystem = attacker.system;
  const defenderSystem = defender.system;

  if (
    !(attackerSystem instanceof CharacterData) &&
    !(attackerSystem instanceof NPCData)
  ) {
    throw new Error("SEPTARIS | Modèle d'attaquant invalide");
  }

  if (
    !(defenderSystem instanceof CharacterData) &&
    !(defenderSystem instanceof NPCData)
  ) {
    throw new Error("SEPTARIS | Modèle de défenseur invalide");
  }

  // Le demandeur doit pouvoir jouer cet attaquant.
  if (!sender.isGM && !attacker.testUserPermission(sender, "OWNER")) {
    throw new Error("SEPTARIS | Attaquant non autorisé");
  }

  // Vérification du personnage associé au message.
  if (message.speakerActor?.uuid !== attacker.uuid) {
    throw new Error("SEPTARIS | Attaquant différent du jet enregistré");
  }

  if (!Array.isArray(message.rolls) || message.rolls.length < 1) {
    throw new Error("SEPTARIS | Aucun jet d'attaque enregistré");
  }

  // Les informations de la cible sont relues sur la session MJ.
  return serializeUpdate(defender.uuid, async () => {
    const rawHistory: unknown = defender.getFlag(SCOPE, HISTORY_FLAG);

    const history: string[] = Array.isArray(rawHistory)
      ? rawHistory.filter((value): value is string => typeof value === "string")
      : [];

    const currentHealth = defenderSystem.health.value;

    if (history.includes(request.messageUuid)) {
      return {
        applied: false,
        alreadyApplied: true,
        damage: 0,
        remainingHealth: currentHealth,
      };
    }

    const total = readRollTotal(message.rolls[0]);

    const featSuccess =
      attackerSystem instanceof CharacterData &&
      message.rolls.length > 1 &&
      readRollTotal(message.rolls[1]) === attackerSystem.featDice;

    const resolution = resolveAction({
      total,
      target: defenderSystem.defense,
      featSuccess,
    });

    const damage = resolution.success
      ? calculateDamage(resolution.finalMargin, attackerSystem.weaponDamage)
      : 0;

    if (!Number.isSafeInteger(damage) || damage < 0) {
      throw new Error("SEPTARIS | Dégâts invalides");
    }

    if (damage === 0) {
      return {
        applied: false,
        alreadyApplied: false,
        damage: 0,
        remainingHealth: currentHealth,
      };
    }

    const remainingHealth = Math.max(0, currentHealth - damage);

    // Les PV et l'historique sont enregistrés ensemble.
    await defender.update({
      "system.health.value": remainingHealth,
      [`flags.${SCOPE}.${HISTORY_FLAG}`]: [
        ...history.slice(-(HISTORY_LIMIT - 1)),
        request.messageUuid,
      ],
    });

    return {
      applied: true,
      alreadyApplied: false,
      damage,
      remainingHealth,
    };
  });
}

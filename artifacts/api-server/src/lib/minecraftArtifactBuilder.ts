import { spawn } from "node:child_process";
import {
  access,
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  copyFile,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

type MinecraftProject = {
  id: string;
  name: string;
  category: string;
  version: string;
  blocks: unknown;
};

type ProjectBlock = {
  kind: string;
  title: string;
  settings: Record<string, unknown>;
};

type CommandPlan = {
  name: string;
  permission?: string;
  blocks: ProjectBlock[];
};

type ReleaseManifest = {
  latest?: { release?: string };
  versions?: Array<{ id: string; type: string }>;
};

type CacheEntry = { expiresAt: number; value: unknown };

const metadataCache = new Map<string, CacheEntry>();
const BUILD_TIMEOUT_MS = 240_000;
const GRADLE_VERSION = "9.8.0";
const FOOJAY_VERSION = "1.0.0";

export class MinecraftBuildError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 422 | 503,
    readonly diagnostic?: string,
  ) {
    super(message);
    this.name = "MinecraftBuildError";
  }
}

class BuildProcessError extends Error {
  constructor(
    message: string,
    readonly diagnostic: string,
  ) {
    super(message);
    this.name = "BuildProcessError";
  }
}

async function fetchText(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": "PurpleCreator/1.0 Minecraft artifact builder" },
    });
    if (!response.ok) {
      throw new Error(`Metadata request returned ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    throw new MinecraftBuildError(
      "Nie udało się pobrać danych potrzebnych do budowania. Spróbuj ponownie za chwilę.",
      503,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const cached = metadataCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }
  const body = await fetchText(url);
  try {
    const value = JSON.parse(body) as T;
    metadataCache.set(url, { value, expiresAt: Date.now() + 5 * 60_000 });
    return value;
  } catch (error) {
    throw new MinecraftBuildError(
      "Minecraft nie zwrócił poprawnych danych wersji. Spróbuj ponownie.",
      503,
      error instanceof Error ? error.message : String(error),
    );
  }
}

function parseMavenVersions(xml: string): string[] {
  return [...xml.matchAll(/<version>([^<]+)<\/version>/g)].map((match) =>
    match[1]!.trim(),
  );
}

function compareDottedVersions(left: string, right: string): number {
  const a = left.match(/\d+/g)?.map(Number) ?? [];
  const b = right.match(/\d+/g)?.map(Number) ?? [];
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return left.localeCompare(right);
}

export async function listMinecraftReleaseVersions(): Promise<string[]> {
  const manifest = await fetchJson<ReleaseManifest>(
    "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",
  );
  return (manifest.versions ?? [])
    .filter(
      (version) =>
        version.type === "release" &&
        /^\d+\.\d+(?:\.\d+)?$/.test(version.id) &&
        compareDottedVersions(version.id, "1.20.1") >= 0,
    )
    .map((version) => version.id)
    .sort((a, b) => compareDottedVersions(b, a));
}

async function resolveMinecraftVersion(requested: string): Promise<string> {
  const manifest = await fetchJson<ReleaseManifest>(
    "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",
  );
  const releases = (manifest.versions ?? [])
    .filter((version) => version.type === "release")
    .map((version) => version.id);
  if (requested === "Latest") {
    if (manifest.latest?.release) return manifest.latest.release;
    throw new MinecraftBuildError(
      "Nie można teraz ustalić najnowszej wersji Minecrafta.",
      503,
    );
  }
  if (/^\d+\.\d+$/.test(requested)) {
    const matching = releases
      .filter((version) => version.startsWith(`${requested}.`))
      .sort(compareDottedVersions);
    const newest = matching.at(-1);
    if (newest) return newest;
  }
  if (releases.includes(requested)) return requested;

  throw new MinecraftBuildError(
    `Nie znaleziono wydania Minecrafta ${requested}. Zmień wersję projektu i spróbuj ponownie.`,
    400,
  );
}

function parseBlocks(rawBlocks: unknown): ProjectBlock[] {
  if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) {
    throw new MinecraftBuildError(
      "Dodaj co najmniej jeden blok do projektu, zanim wygenerujesz plik .jar.",
      400,
    );
  }
  if (rawBlocks.length > 100) {
    throw new MinecraftBuildError(
      "Projekt może zawierać najwyżej 100 bloków na jeden plik .jar.",
      400,
    );
  }

  return rawBlocks.map((value) => {
    if (
      !value ||
      typeof value !== "object" ||
      typeof (value as ProjectBlock).kind !== "string" ||
      typeof (value as ProjectBlock).title !== "string" ||
      !(value as ProjectBlock).settings ||
      typeof (value as ProjectBlock).settings !== "object"
    ) {
      throw new MinecraftBuildError(
        "W projekcie znaleziono nieprawidłowy blok. Popraw go i spróbuj ponownie.",
        400,
      );
    }
    return value as ProjectBlock;
  });
}

function setting(block: ProjectBlock | undefined, key: string): string | null {
  const value = block?.settings[key];
  if (typeof value !== "string" && typeof value !== "number") return null;
  return String(value).trim();
}

function safeCommandName(raw: string | null): string | null {
  const normalized = (raw ?? "")
    .trim()
    .replace(/^\/+/, "")
    .toLowerCase();
  return /^[a-z0-9_-]{1,32}$/.test(normalized) ? normalized : null;
}

function safePermission(raw: string | null): string | undefined {
  return raw && /^[a-z0-9_.-]{1,96}$/i.test(raw) ? raw : undefined;
}

function javaString(value: string): string {
  return JSON.stringify(value)
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function javaIdentifier(value: string): string {
  const result = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_$]/g, "_");
  return /^[a-zA-Z_$]/.test(result) ? result : `Project_${result}`;
}

function archiveBase(name: string): string {
  const result = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
  return result || "purple-creator-project";
}

function safeYaml(value: string): string {
  return JSON.stringify(value);
}

function javaTargetForMinecraft(version: string): number {
  const [major, minor, patch = 0] = version.split(".").map(Number);
  if (major! >= 26) return 25;
  if (major === 1 && minor! >= 21) return 21;
  if (major === 1 && minor === 20 && patch! >= 5) return 21;
  if (major === 1 && minor! >= 18) return 17;
  if (major === 1 && minor === 17) return 16;
  return 8;
}

function buildJavaForMinecraft(version: string): number {
  return javaTargetForMinecraft(version) >= 25 ? 25 : 21;
}

async function getPaperApiVersion(version: string): Promise<string> {
  const xml = await fetchText(
    "https://repo.papermc.io/repository/maven-public/io/papermc/paper/paper-api/maven-metadata.xml",
  );
  const versions = parseMavenVersions(xml);
  const [major] = version.split(".").map(Number);
  let matches: string[];
  if (major! >= 26) {
    matches = versions.filter(
      (candidate) =>
        candidate.startsWith(`${version}.build.`) &&
        !candidate.includes("-pre-") &&
        !candidate.includes("-rc-"),
    );
    matches.sort((a, b) => {
      const buildNumber = (value: string) =>
        Number(value.match(/\.build\.(\d+)/)?.[1] ?? 0);
      return buildNumber(a) - buildNumber(b);
    });
  } else {
    const exact = `${version}-R0.1-SNAPSHOT`;
    matches = versions.includes(exact) ? [exact] : [];
  }
  const selected = matches.at(-1);
  if (selected) return selected;

  if (major! < 17) {
    const spigotXml = await fetchText(
      "https://hub.spigotmc.org/nexus/content/repositories/snapshots/org/spigotmc/spigot-api/maven-metadata.xml",
    );
    const spigotVersions = parseMavenVersions(spigotXml);
    const spigot = `${version}-R0.1-SNAPSHOT`;
    if (spigotVersions.includes(spigot)) return `spigot:${spigot}`;
  }

  throw new MinecraftBuildError(
    `Nie znaleziono API Paper/Spigot dla Minecrafta ${version}. Wybierz inną wersję projektu.`,
    400,
  );
}

type FabricLoaderVersion = {
  loader?: { version?: string; stable?: boolean };
};

async function getFabricBuildVersions(version: string): Promise<{
  loader: string;
  fabricApi: string;
  yarn?: string;
  loom: string;
  remap: boolean;
}> {
  const [major, minor] = version.split(".").map(Number);
  if (major === 1 && minor! < 19) {
    throw new MinecraftBuildError(
      "Generowanie modów Fabric wymaga Minecrafta 1.19 lub nowszego. Zmień wersję projektu albo wybierz typ Plugin.",
      400,
    );
  }

  const fabricApiXml = await fetchText(
    "https://maven.fabricmc.net/net/fabricmc/fabric-api/fabric-api/maven-metadata.xml",
  );
  const fabricApiVersions = parseMavenVersions(fabricApiXml).filter((candidate) =>
    candidate.endsWith(`+${version}`),
  );
  fabricApiVersions.sort(compareDottedVersions);
  const fabricApi = fabricApiVersions.at(-1);
  if (!fabricApi) {
    throw new MinecraftBuildError(
      `Fabric API nie jest jeszcze dostępne dla Minecrafta ${version}. Wybierz wersję, dla której Fabric publikuje API.`,
      400,
    );
  }

  const loaderList = await fetchJson<FabricLoaderVersion[]>(
    `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(version)}`,
  );
  const loader = loaderList
    .filter((entry) => entry.loader?.version && entry.loader.stable)
    .map((entry) => entry.loader!.version!)
    .sort(compareDottedVersions)
    .at(-1);
  if (!loader) {
    throw new MinecraftBuildError(
      `Fabric Loader nie jest dostępny dla Minecrafta ${version}.`,
      400,
    );
  }

  const [loomArtifact, remap] =
    major! >= 26
      ? ["fabric-loom", false]
      : ["fabric-loom-remap", true];
  const markerUrl =
    `https://maven.fabricmc.net/net/fabricmc/${loomArtifact}/` +
    `net.fabricmc.${loomArtifact}.gradle.plugin/maven-metadata.xml`;
  const loomXml = await fetchText(markerUrl);
  const loomRelease = loomXml.match(/<release>([^<]+)<\/release>/)?.[1];
  if (!loomRelease) {
    throw new MinecraftBuildError(
      "Nie można ustalić wersji Fabric Loom potrzebnej do zbudowania moda.",
      503,
    );
  }

  let yarn: string | undefined;
  if (major === 1) {
    const yarnList = await fetchJson<
      Array<{ version: string; stable?: boolean; gameVersion?: string }>
    >(`https://meta.fabricmc.net/v2/versions/yarn/${encodeURIComponent(version)}`);
    const matchingYarn = yarnList.filter(
      (entry) => entry.gameVersion === version,
    );
    // Fabric's metadata currently marks some older, complete Yarn builds as
    // unstable. Prefer stable mappings when present, but don't reject a
    // supported game version if only the published fallback mappings remain.
    const stableYarn = matchingYarn.filter((entry) => entry.stable);
    yarn = (stableYarn.length > 0 ? stableYarn : matchingYarn)
      .map((entry) => entry.version)
      .sort(compareDottedVersions)
      .at(-1);
    if (!yarn) {
      throw new MinecraftBuildError(
        `Fabric nie publikuje mapowań dla Minecrafta ${version}.`,
        400,
      );
    }
  }

  return { loader, fabricApi, yarn, loom: loomRelease, remap };
}

function groupCommands(blocks: ProjectBlock[]): CommandPlan[] {
  const commands: CommandPlan[] = [];
  let current: CommandPlan | null = null;
  for (const block of blocks) {
    if (block.kind === "command") {
      const name = safeCommandName(setting(block, "command"));
      if (!name) continue;
      current = { name, blocks: [] };
      commands.push(current);
      continue;
    }
    if (current) {
      current.blocks.push(block);
      if (block.kind === "condition") {
        current.permission = safePermission(setting(block, "permission")) ?? current.permission;
      }
    }
  }
  return commands;
}

function isSpawnBlock(block: ProjectBlock): boolean {
  const text = `${block.title} ${setting(block, "target") ?? ""}`.toLowerCase();
  return /spawn|odrodz/.test(text);
}

function javaActionsForCommand(plan: CommandPlan): string[] {
  const actions: string[] = [];
  const spawnAction =
    plan.name === "setspawn" || plan.blocks.some(isSpawnBlock);
  const teleportAction = plan.name === "spawn";
  const messageBlock = plan.blocks.find(
    (block) =>
      typeof block.settings.message === "string" ||
      /wiadomość|wiadomosc|message/i.test(block.title),
  );
  const customMessage = setting(messageBlock, "message");

  if (spawnAction) {
    actions.push(
      'if (!(sender instanceof Player)) { sender.sendMessage("Tej komendy może użyć gracz w grze."); return true; }',
      "Player player = (Player) sender;",
      'player.getWorld().setSpawnLocation(player.getLocation());',
      `player.sendMessage(ChatColor.GREEN + ${javaString(customMessage ?? "Punkt odrodzenia został zapisany.")});`,
    );
    return actions;
  }
  if (teleportAction) {
    actions.push(
      'if (!(sender instanceof Player)) { sender.sendMessage("Tej komendy może użyć gracz w grze."); return true; }',
      "Player player = (Player) sender;",
      "player.teleport(player.getWorld().getSpawnLocation());",
      `player.sendMessage(ChatColor.GREEN + ${javaString(customMessage ?? "Przeniesiono do punktu odrodzenia.")});`,
    );
    return actions;
  }

  if (messageBlock) {
    actions.push(`sender.sendMessage(${javaString(customMessage ?? "Gotowe.")});`);
  }

  const itemBlock = plan.blocks.find(
    (block) =>
      block.kind === "item" || /przedmiot|item/i.test(block.title),
  );
  if (itemBlock) {
    const rawItem = setting(itemBlock, "item") ?? "minecraft:diamond";
    const material = rawItem
      .replace(/^minecraft:/i, "")
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "");
    const amount = Math.max(
      1,
      Math.min(64, Number(setting(itemBlock, "amount") ?? "1") || 1),
    );
    actions.push(
      "{",
      'if (!(sender instanceof Player)) { sender.sendMessage("Tej komendy może użyć gracz w grze."); return true; }',
      "Player player = (Player) sender;",
      `Material material = Material.matchMaterial(${javaString(material)});`,
      `if (material != null) player.getInventory().addItem(new ItemStack(material, ${amount}));`,
      'player.sendMessage(ChatColor.GREEN + "Przedmiot został dodany do ekwipunku.");',
      "}",
    );
  }

  const weatherBlock = plan.blocks.find((block) => block.kind === "world");
  const weather =
    setting(weatherBlock, "value")?.toLowerCase() ??
    setting(weatherBlock, "weather")?.toLowerCase();
  if (weather === "clear" || weather === "bezchmurnie") {
    actions.push(
      "{",
      'if (!(sender instanceof Player)) { sender.sendMessage("Tej komendy może użyć gracz w grze."); return true; }',
      "Player player = (Player) sender;",
      "player.getWorld().setStorm(false);",
      "player.getWorld().setThundering(false);",
      'player.sendMessage(ChatColor.GREEN + "Pogoda została wyczyszczona.");',
      "}",
    );
  } else if (weather === "rain" || weather === "deszcz") {
    actions.push(
      "{",
      'if (!(sender instanceof Player)) { sender.sendMessage("Tej komendy może użyć gracz w grze."); return true; }',
      "Player player = (Player) sender;",
      "player.getWorld().setStorm(true);",
      'player.sendMessage(ChatColor.GREEN + "Ustawiono deszcz.");',
      "}",
    );
  }

  if (actions.length === 0) {
    actions.push(
      `sender.sendMessage(${javaString(customMessage ?? `Komenda /${plan.name} została uruchomiona.`)});`,
    );
  }
  return actions;
}

function paperSource(blocks: ProjectBlock[], projectName: string): string {
  const commands = groupCommands(blocks);
  const joinEvent = blocks.some(
    (block) =>
      block.kind === "event" &&
      /join|dołącz|dolacz/i.test(
        `${block.title} ${setting(block, "event") ?? ""}`,
      ),
  );
  const joinMessage =
    setting(
      blocks.find(
        (block) =>
          typeof block.settings.message === "string" ||
          /wiadomość|wiadomosc|message/i.test(block.title),
      ),
      "message",
    ) ?? `Witaj w projekcie ${projectName}!`;
  if (commands.length === 0 && !joinEvent) {
    throw new MinecraftBuildError(
      "Dodaj blok komendy albo zdarzenia gracza, zanim wygenerujesz plugin.",
      400,
    );
  }

  const commandCases = commands
    .map((plan) => {
      const permission = plan.permission
        ? `\n        if (!sender.hasPermission(${javaString(plan.permission)})) { sender.sendMessage(ChatColor.RED + "Nie masz uprawnień."); return true; }`
        : "";
      const actions = javaActionsForCommand(plan)
        .map((line) => `        ${line}`)
        .join("\n");
      return `      case ${javaString(plan.name)}: {${permission}
${actions}
        return true;
      }`;
    })
    .join("\n");

  const joinHandler = joinEvent
    ? `\n  @EventHandler
  public void onPlayerJoin(PlayerJoinEvent event) {
    event.getPlayer().sendMessage(${javaString(joinMessage)});
  }
`
    : "";
  const eventImports = joinEvent
    ? "import org.bukkit.event.EventHandler;\nimport org.bukkit.event.Listener;\nimport org.bukkit.event.player.PlayerJoinEvent;\n"
    : "";
  const implementsClause = joinEvent ? " implements Listener" : "";
  const registerEvents = joinEvent
    ? "    getServer().getPluginManager().registerEvents(this, this);\n"
    : "";

  return `package pl.purplecreator.generated;

import java.util.Locale;
import org.bukkit.ChatColor;
import org.bukkit.Material;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.plugin.java.JavaPlugin;
${eventImports}
public final class PurpleCreatorPlugin extends JavaPlugin${implementsClause} {
  @Override
  public void onEnable() {
${registerEvents}    getLogger().info(${javaString(`${projectName} is ready.`)});
  }

  @Override
  public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
    switch (command.getName().toLowerCase(Locale.ROOT)) {
${commandCases}
      default:
        return false;
    }
  }
${joinHandler}}
`;
}

function fabricSource(
  blocks: ProjectBlock[],
  gameVersion: string,
  projectName: string,
): string {
  const commands = groupCommands(blocks);
  const joinEvent = blocks.some(
    (block) =>
      block.kind === "event" &&
      /join|dołącz|dolacz/i.test(
        `${block.title} ${setting(block, "event") ?? ""}`,
      ),
  );
  if (commands.length === 0 && !joinEvent) {
    throw new MinecraftBuildError(
      "Dodaj blok komendy albo zdarzenia gracza, zanim wygenerujesz mod Fabric.",
      400,
    );
  }

  const modernMappings = Number(gameVersion.split(".")[0]) >= 26;
  const commandManagerClass = modernMappings
    ? "net.minecraft.commands.Commands"
    : "net.minecraft.server.command.CommandManager";
  const commandRegistrations = commands
    .map((plan) => {
      const doSetSpawn =
        plan.name === "setspawn" || plan.blocks.some(isSpawnBlock);
      const response = doSetSpawn
        ? "setWorldSpawn(source); sendFeedback(source, \"Punkt odrodzenia świata został zapisany.\");"
        : `sendFeedback(source, ${javaString(`Komenda /${plan.name} została uruchomiona.`)});`;
      return `      dispatcher.register(${modernMappings ? "Commands" : "CommandManager"}.literal(${javaString(plan.name)})
        .requires(source -> hasPermission(source, 2))
        .executes(context -> {
          Object source = context.getSource();
          try {
            ${response}
            return 1;
          } catch (Exception error) {
            throw new RuntimeException("Nie udało się wykonać komendy Minecrafta.", error);
          }
        }));`;
    })
    .join("\n");

  const joinRegistration = joinEvent
    ? `\n    ServerPlayConnectionEvents.JOIN.register((handler, sender, server) -> {
      try {
        Object player = invokeAny(handler, new String[] { "getPlayer" });
        sendPlayerMessage(player, ${javaString(`Witaj w projekcie ${projectName}!`)});
      } catch (Exception error) {
        throw new RuntimeException("Nie udało się obsłużyć zdarzenia dołączenia gracza.", error);
      }
    });`
    : "";
  const joinImport = joinEvent
    ? "import net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents;\n"
    : "";
  const literalImport = modernMappings
    ? "import net.minecraft.commands.Commands;\n"
    : "import net.minecraft.server.command.CommandManager;\n";

  return `package pl.purplecreator.generated;

import java.lang.reflect.Method;
import java.util.function.Supplier;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
${joinImport}${literalImport}
public final class PurpleCreatorMod implements ModInitializer {
  @Override
  public void onInitialize() {
    CommandRegistrationCallback.EVENT.register((dispatcher, registryAccess, environment) -> {
${commandRegistrations}
    });${joinRegistration}
  }

  private static boolean hasPermission(Object source, int level) {
    try {
      Object result = invokeAny(source, new String[] { "hasPermissionLevel", "hasPermission" }, level);
      return Boolean.TRUE.equals(result);
    } catch (Exception ignored) {
      return false;
    }
  }

  private static void setWorldSpawn(Object source) throws Exception {
    Object world = invokeAny(source, new String[] { "getWorld", "getLevel" });
    Object position;
    try {
      position = invokeAny(source, new String[] { "getBlockPos" });
    } catch (NoSuchMethodException ignored) {
      Object vector = invokeAny(source, new String[] { "getPosition" });
      Class<?> blockPos = loadFirst(
          "net.minecraft.core.BlockPos",
          "net.minecraft.util.math.BlockPos"
      );
      position = invokeStatic(blockPos, new String[] { "containing", "ofFloored" }, vector);
    }
    invokeAny(world, new String[] { "setDefaultSpawnPos", "setSpawnPos" }, position, 0.0F);
  }

  private static void sendFeedback(Object source, String value) {
    try {
      Class<?> textType = loadFirst(
          "net.minecraft.network.chat.Component",
          "net.minecraft.text.Text"
      );
      Object component = invokeStatic(textType, new String[] { "literal" }, value);
      invokeSupplierMessage(source, component, new String[] { "sendSuccess", "sendFeedback" });
    } catch (Exception ignored) {
      // The command still completes if a Minecraft version has no compatible feedback method.
    }
  }

  private static void sendPlayerMessage(Object player, String value) throws Exception {
    Class<?> textType = loadFirst(
        "net.minecraft.network.chat.Component",
        "net.minecraft.text.Text"
    );
    Object component = invokeStatic(textType, new String[] { "literal" }, value);
    for (Method method : player.getClass().getMethods()) {
      if (!method.getName().equals("sendSystemMessage") && !method.getName().equals("sendMessage")) continue;
      Class<?>[] parameters = method.getParameterTypes();
      if (parameters.length == 1 && parameters[0].isInstance(component)) {
        method.invoke(player, component);
        return;
      }
      if (parameters.length == 2 && parameters[0].isInstance(component) && parameters[1] == boolean.class) {
        method.invoke(player, component, false);
        return;
      }
    }
    throw new NoSuchMethodException("Minecraft player message method was not found");
  }

  private static void invokeSupplierMessage(Object source, Object component, String[] names) throws Exception {
    for (String name : names) {
      for (Method method : source.getClass().getMethods()) {
        Class<?>[] parameters = method.getParameterTypes();
        if (!method.getName().equals(name) || parameters.length != 2 ||
            !Supplier.class.isAssignableFrom(parameters[0]) || parameters[1] != boolean.class) continue;
        method.invoke(source, (Supplier<Object>) () -> component, false);
        return;
      }
    }
    throw new NoSuchMethodException("Minecraft command feedback method was not found");
  }

  private static Class<?> loadFirst(String... names) throws ClassNotFoundException {
    for (String name : names) {
      try {
        return Class.forName(name);
      } catch (ClassNotFoundException ignored) {
        // Try the names used by the other supported Minecraft mappings.
      }
    }
    throw new ClassNotFoundException(String.join(", ", names));
  }

  private static Object invokeAny(Object target, String[] names, Object... arguments) throws Exception {
    for (String name : names) {
      for (Method method : target.getClass().getMethods()) {
        if (!method.getName().equals(name) || method.getParameterCount() != arguments.length) continue;
        Class<?>[] parameters = method.getParameterTypes();
        boolean compatible = true;
        for (int i = 0; i < parameters.length; i++) {
          if (!accepts(parameters[i], arguments[i])) {
            compatible = false;
            break;
          }
        }
        if (compatible) return method.invoke(target, arguments);
      }
    }
    throw new NoSuchMethodException("Minecraft method not found: " + String.join("/", names));
  }

  private static Object invokeStatic(Class<?> target, String[] names, Object... arguments) throws Exception {
    for (String name : names) {
      for (Method method : target.getMethods()) {
        if (!java.lang.reflect.Modifier.isStatic(method.getModifiers()) ||
            !method.getName().equals(name) || method.getParameterCount() != arguments.length) continue;
        Class<?>[] parameters = method.getParameterTypes();
        boolean compatible = true;
        for (int i = 0; i < parameters.length; i++) {
          if (!accepts(parameters[i], arguments[i])) {
            compatible = false;
            break;
          }
        }
        if (compatible) return method.invoke(null, arguments);
      }
    }
    throw new NoSuchMethodException("Minecraft factory method not found: " + String.join("/", names));
  }

  private static boolean accepts(Class<?> type, Object value) {
    if (value == null) return !type.isPrimitive();
    if (type.isInstance(value)) return true;
    return (type == int.class && value instanceof Integer) ||
        (type == float.class && value instanceof Float) ||
        (type == double.class && value instanceof Double) ||
        (type == long.class && value instanceof Long) ||
        (type == boolean.class && value instanceof Boolean);
  }
}
`;
}

function settingsGradle(): string {
  return `pluginManagement {
  repositories {
    gradlePluginPortal()
    maven { url = 'https://maven.fabricmc.net/' }
    mavenCentral()
  }
}

plugins {
  id 'org.gradle.toolchains.foojay-resolver-convention' version '${FOOJAY_VERSION}'
}

rootProject.name = 'purple-creator-build'
`;
}

function javaSetupGradle(buildJava: number, targetJava: number): string {
  return `
java {
  toolchain {
    languageVersion = JavaLanguageVersion.of(${buildJava})
  }
}

tasks.withType(JavaCompile).configureEach {
  options.release = ${targetJava}
  options.encoding = 'UTF-8'
}
`;
}

async function writeCommonGradleFiles(root: string): Promise<void> {
  await writeFile(join(root, "settings.gradle"), settingsGradle(), "utf8");
}

function pluginYml(
  project: MinecraftProject,
  version: string,
  commands: CommandPlan[],
): string {
  const [major, minor] = version.split(".").map(Number);
  const apiVersion =
    (major === 1 && minor! >= 13) || major! >= 26
      ? `api-version: ${safeYaml(
          major! >= 26 ? `${major}.${minor}` : `${major}.${minor}`,
        )}\n`
      : "";
  const commandYaml = commands.length
    ? `commands:\n${commands
        .map((command) => {
          const permission = command.permission
            ? `    permission: ${safeYaml(command.permission)}\n`
            : "";
          return `  ${command.name}:\n    description: ${safeYaml(
            `Komenda projektu ${project.name}`,
          )}\n${permission}    usage: /${command.name}\n`;
        })
        .join("")}`
    : "";
  const permissions = [...new Set(commands.map((command) => command.permission).filter(Boolean))];
  const permissionYaml = permissions.length
    ? `permissions:\n${permissions
        .map(
          (permission) =>
            `  ${permission}:\n    description: ${safeYaml(
              `Uprawnienie projektu ${project.name}`,
            )}\n    default: op\n`,
        )
        .join("")}`
    : "";
  return `name: ${safeYaml(project.name)}
version: 1.0.0
main: pl.purplecreator.generated.PurpleCreatorPlugin
${apiVersion}${commandYaml}${permissionYaml}`;
}

function gradleApiDependency(
  apiVersion: string,
  mcVersion: string,
): { repository: string; dependency: string } {
  if (apiVersion.startsWith("spigot:")) {
    return {
      repository:
        "maven { url = uri('https://hub.spigotmc.org/nexus/content/repositories/snapshots/') }",
      dependency: `compileOnly "org.spigotmc:spigot-api:${apiVersion.slice("spigot:".length)}"`,
    };
  }
  return {
    repository:
      "maven { url = uri('https://repo.papermc.io/repository/maven-public/') }",
    dependency: `compileOnly "io.papermc.paper:paper-api:${apiVersion}"`,
  };
}

async function writePaperProject(
  root: string,
  project: MinecraftProject,
  gameVersion: string,
  blocks: ProjectBlock[],
  apiVersion: string,
  jarName: string,
): Promise<void> {
  const commands = groupCommands(blocks);
  const source = paperSource(blocks, project.name);
  const dependency = gradleApiDependency(apiVersion, gameVersion);
  const targetJava = javaTargetForMinecraft(gameVersion);
  const buildJava = buildJavaForMinecraft(gameVersion);
  const buildGradle = `plugins {
  id 'java'
}

group = 'pl.purplecreator.generated'
version = '1.0.0'

repositories {
  ${dependency.repository}
  mavenCentral()
}

dependencies {
  ${dependency.dependency}
}

${javaSetupGradle(buildJava, targetJava)}

tasks.jar {
  archiveFileName = '${jarName}'
}
`;

  await mkdir(join(root, "src/main/java/pl/purplecreator/generated"), {
    recursive: true,
  });
  await mkdir(join(root, "src/main/resources"), { recursive: true });
  await writeCommonGradleFiles(root);
  await writeFile(join(root, "build.gradle"), buildGradle, "utf8");
  await writeFile(
    join(root, "src/main/java/pl/purplecreator/generated/PurpleCreatorPlugin.java"),
    source,
    "utf8",
  );
  await writeFile(
    join(root, "src/main/resources/plugin.yml"),
    pluginYml(project, gameVersion, commands),
    "utf8",
  );
}

async function writeFabricProject(
  root: string,
  project: MinecraftProject,
  gameVersion: string,
  blocks: ProjectBlock[],
  versions: {
    loader: string;
    fabricApi: string;
    yarn?: string;
    loom: string;
    remap: boolean;
  },
  jarName: string,
): Promise<void> {
  const targetJava = javaTargetForMinecraft(gameVersion);
  const buildJava = buildJavaForMinecraft(gameVersion);
  const modId = `purplecreator_${project.id.replaceAll("-", "").slice(0, 12)}`;
  const className = "PurpleCreatorMod";
  const packageName = "pl.purplecreator.generated";
  const pluginId = versions.remap
    ? "net.fabricmc.fabric-loom-remap"
    : "net.fabricmc.fabric-loom";
  const modDependencyConfiguration = versions.remap
    ? "modImplementation"
    : "implementation";
  const mappingLine = versions.yarn
    ? `  mappings "net.fabricmc:yarn:${versions.yarn}:v2"\n`
    : "";
  const gradle = `plugins {
  id '${pluginId}' version '${versions.loom}'
}

version = '1.0.0'
group = 'pl.purplecreator'
base.archivesName = '${archiveBase(project.name)}'

repositories {
  maven { url = 'https://maven.fabricmc.net/' }
  mavenCentral()
}

dependencies {
  minecraft "com.mojang:minecraft:${gameVersion}"
${mappingLine}  ${modDependencyConfiguration} "net.fabricmc:fabric-loader:${versions.loader}"
  ${modDependencyConfiguration} "net.fabricmc.fabric-api:fabric-api:${versions.fabricApi}"
}

${javaSetupGradle(buildJava, targetJava)}

tasks.named('jar') {
  archiveFileName = '${archiveBase(project.name)}-dev.jar'
}

if (tasks.findByName('remapJar') != null) {
  tasks.named('remapJar') {
    archiveFileName = '${jarName}'
  }
} else {
  tasks.named('jar') {
    archiveFileName = '${jarName}'
  }
}
`;
  const metadata = {
    schemaVersion: 1,
    id: modId,
    version: "1.0.0",
    name: project.name,
    description: `Mod Minecraft utworzony w Purple Creator (${gameVersion}).`,
    environment: "*",
    entrypoints: { main: [`${packageName}.${className}`] },
    depends: {
      "fabricloader": `>=${versions.loader}`,
      "fabric-api": "*",
      "minecraft": gameVersion,
      "java": `>=${targetJava}`,
    },
  };

  await mkdir(join(root, `src/main/java/${packageName.replaceAll(".", "/")}`), {
    recursive: true,
  });
  await mkdir(join(root, "src/main/resources"), { recursive: true });
  await writeCommonGradleFiles(root);
  await writeFile(join(root, "build.gradle"), gradle, "utf8");
  await writeFile(
    join(root, `src/main/java/${packageName.replaceAll(".", "/")}/${className}.java`),
    fabricSource(blocks, gameVersion, project.name),
    "utf8",
  );
  await writeFile(
    join(root, "src/main/resources/fabric.mod.json"),
    JSON.stringify(metadata, null, 2),
    "utf8",
  );
}

function captureCommand(
  executable: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
  javaHomeOverride?: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const home = process.env.HOME;
    const javaHome = javaHomeOverride ?? process.env.JAVA_HOME;
    const env = {
      PATH: [
        ...(javaHome ? [join(javaHome, "bin")] : []),
        process.env.PATH ?? "",
      ].join(":"),
      ...(home ? { HOME: home } : {}),
      ...(javaHome ? { JAVA_HOME: javaHome } : {}),
      ...(process.env.GRADLE_USER_HOME
        ? { GRADLE_USER_HOME: process.env.GRADLE_USER_HOME }
        : {}),
      ...(process.env.TMPDIR ? { TMPDIR: process.env.TMPDIR } : {}),
      LANG: "C.UTF-8",
    };
    let output = "";
    let settled = false;
    const child = spawn(executable, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    const append = (chunk: Buffer) => {
      output += chunk.toString("utf8");
      if (output.length > 120_000) output = output.slice(-120_000);
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 3_000).unref();
      reject(
        new BuildProcessError(
          "Minecraft build timed out.",
          output.slice(-12_000),
        ),
      );
    }, timeoutMs);

    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new BuildProcessError(error.message, output.slice(-12_000)));
    });
    child.once("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve(output);
      } else {
        reject(
          new BuildProcessError(
            `${executable} exited with ${code ?? "no status"}.`,
            output.slice(-12_000),
          ),
        );
      }
    });
  });
}

async function findJavaHome(major: number): Promise<string | null> {
  const gradleHome =
    process.env.GRADLE_USER_HOME ??
    join(process.env.HOME ?? tmpdir(), ".gradle");
  const javaRoots = [join(gradleHome, "jdks")];
  if (process.env.JAVA_HOME) javaRoots.push(process.env.JAVA_HOME);

  for (const root of javaRoots) {
    let entries: string[];
    try {
      entries = await readdir(root);
    } catch {
      entries = [];
    }
    const candidates = [root, ...entries.map((entry) => join(root, entry))];
    for (const candidate of candidates) {
      const java = join(candidate, "bin", "java");
      try {
        await access(java);
        const version = await captureCommand(java, ["-version"], candidate, 10_000);
        if (new RegExp(`version "${major}\\.`).test(version)) return candidate;
        if (new RegExp(`openjdk ${major}\\b`).test(version)) return candidate;
      } catch {
        // Continue through Gradle's downloaded JDKs.
      }
    }
  }
  return null;
}

async function ensureJdk25(root: string): Promise<string> {
  const existing = await findJavaHome(25);
  if (existing) return existing;

  const bootstrap = join(root, ".java25-bootstrap");
  await mkdir(join(bootstrap, "src/main/java"), { recursive: true });
  await writeFile(join(bootstrap, "settings.gradle"), settingsGradle(), "utf8");
  await writeFile(
    join(bootstrap, "build.gradle"),
    `plugins {
  id 'java'
}

java {
  toolchain {
    languageVersion = JavaLanguageVersion.of(25)
  }
}

tasks.withType(JavaCompile).configureEach {
  options.release = 25
}
`,
    "utf8",
  );
  await writeFile(
    join(bootstrap, "src/main/java/ToolchainProbe.java"),
    "public final class ToolchainProbe { public static void main(String[] args) {} }\n",
    "utf8",
  );

  try {
    await captureCommand(
      "gradle",
      [
        "--no-daemon",
        "wrapper",
        "--gradle-version",
        GRADLE_VERSION,
        "--distribution-type",
        "bin",
      ],
      bootstrap,
      60_000,
    );
    const bootstrapWrapper = join(bootstrap, "gradlew");
    await chmod(bootstrapWrapper, 0o755);
    await captureCommand(
      bootstrapWrapper,
      ["--no-daemon", "compileJava"],
      bootstrap,
      180_000,
    );
    const javaHome = await findJavaHome(25);
    if (!javaHome) {
      throw new Error("Foojay completed but the Java 25 installation was not found.");
    }
    await cp(join(bootstrap, "gradle"), join(root, "gradle"), {
      recursive: true,
    });
    await copyFile(bootstrapWrapper, join(root, "gradlew"));
    await chmod(join(root, "gradlew"), 0o755);
    return javaHome;
  } catch (error) {
    throw new MinecraftBuildError(
      "Nie udało się przygotować środowiska Java 25 wymaganego przez Fabric dla tej wersji Minecrafta.",
      503,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await rm(bootstrap, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function ensureGradleWrapper(root: string): Promise<void> {
  const wrapper = join(root, "gradlew");
  try {
    await access(wrapper);
    return;
  } catch {
    // Create the wrapper without configuring the Minecraft project: the
    // system Gradle can be older than the Fabric Loom version selected for it.
  }

  const bootstrap = join(root, ".gradle-wrapper-bootstrap");
  await mkdir(bootstrap, { recursive: true });
  await writeFile(
    join(bootstrap, "settings.gradle"),
    "rootProject.name = 'purple-creator-wrapper-bootstrap'\n",
    "utf8",
  );
  await writeFile(join(bootstrap, "build.gradle"), "", "utf8");
  try {
    await captureCommand(
      "gradle",
      [
        "--no-daemon",
        "wrapper",
        "--gradle-version",
        GRADLE_VERSION,
        "--distribution-type",
        "bin",
      ],
      bootstrap,
      60_000,
    );
    await cp(join(bootstrap, "gradle"), join(root, "gradle"), {
      recursive: true,
    });
    await copyFile(join(bootstrap, "gradlew"), wrapper);
    await chmod(wrapper, 0o755);
  } catch (error) {
    throw new MinecraftBuildError(
      "Nie udało się przygotować narzędzi Gradle wymaganych do wygenerowania pliku .jar.",
      503,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await rm(bootstrap, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function buildJar(
  root: string,
  jarName: string,
  javaHomeOverride?: string,
): Promise<Buffer> {
  try {
    await ensureGradleWrapper(root);
    const wrapper = join(root, "gradlew");
    await captureCommand(
      wrapper,
      ["--no-daemon", "--stacktrace", "build"],
      root,
      BUILD_TIMEOUT_MS,
      javaHomeOverride,
    );
    return await readFile(join(root, "build", "libs", jarName));
  } catch (error) {
    if (error instanceof BuildProcessError) {
      const diagnostic = error.diagnostic;
      const unavailable =
        /not found|ENOENT|Could not resolve|Could not GET|Could not download|PKIX|timed out|Unable to download a toolchain|No matching toolchains/i.test(
          `${error.message}\n${diagnostic}`,
        );
      throw new MinecraftBuildError(
        unavailable
          ? "Nie udało się pobrać narzędzi lub bibliotek Minecrafta. Spróbuj ponownie później."
          : "Nie udało się skompilować projektu. Sprawdź bloki i ustawienia, a potem spróbuj ponownie.",
        unavailable ? 503 : 422,
        `${error.message}\n${diagnostic}`,
      );
    }
    throw new MinecraftBuildError(
      "Nie udało się przygotować pliku .jar. Spróbuj ponownie.",
      503,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function generateMinecraftArtifact(
  project: MinecraftProject,
): Promise<{ buffer: Buffer; fileName: string; gameVersion: string }> {
  if (project.category !== "plugin" && project.category !== "mod") {
    throw new MinecraftBuildError(
      "Wybierz typ projektu: mod albo plugin.",
      400,
    );
  }

  const blocks = parseBlocks(project.blocks);
  const gameVersion = await resolveMinecraftVersion(project.version);
  const fileName = `${archiveBase(project.name)}.jar`;
  const root = await mkdtemp(join(tmpdir(), "purple-creator-build-"));

  try {
    if (project.category === "plugin") {
      const apiVersion = await getPaperApiVersion(gameVersion);
      await writePaperProject(
        root,
        project,
        gameVersion,
        blocks,
        apiVersion,
        fileName,
      );
    } else {
      const fabricVersions = await getFabricBuildVersions(gameVersion);
      await writeFabricProject(
        root,
        project,
        gameVersion,
        blocks,
        fabricVersions,
        fileName,
      );
      const javaHome = await ensureJdk25(root);
      const buffer = await buildJar(root, fileName, javaHome);
      if (buffer.length === 0 || buffer.length > 50 * 1024 * 1024) {
        throw new MinecraftBuildError(
          "Wygenerowany plik .jar ma nieprawidłowy rozmiar.",
          422,
        );
      }
      return { buffer, fileName, gameVersion };
    }
    const buffer = await buildJar(root, fileName);
    if (buffer.length === 0 || buffer.length > 50 * 1024 * 1024) {
      throw new MinecraftBuildError(
        "Wygenerowany plik .jar ma nieprawidłowy rozmiar.",
        422,
      );
    }
    return { buffer, fileName, gameVersion };
  } catch (error) {
    if (error instanceof MinecraftBuildError) throw error;
    throw new MinecraftBuildError(
      "Nie udało się wygenerować pliku .jar. Spróbuj ponownie.",
      422,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await rm(root, { recursive: true, force: true }).catch(() => undefined);
  }
}
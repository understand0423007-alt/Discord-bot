import "dotenv/config";
import { REST, Routes } from "discord.js";
import remindCommand from "./src/commands/remind.js";

const commands = [remindCommand.data];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function main() {
  const { DISCORD_CLIENT_ID, DISCORD_GUILD_ID, DISCORD_TOKEN } = process.env;

  if (!DISCORD_TOKEN) {
    console.error("ERROR: DISCORD_TOKEN がありません");
    return;
  }
  if (!DISCORD_CLIENT_ID) {
    console.error("ERROR: DISCORD_CLIENT_ID がありません");
    return;
  }
  if (!DISCORD_GUILD_ID) {
    console.error("ERROR: DISCORD_GUILD_ID がありません");
    return;
  }

  try {
    console.log("Start refreshing application (/) commands");
    console.log("CLIENT_ID:", DISCORD_CLIENT_ID);
    console.log("GUILD_ID :", DISCORD_GUILD_ID);

    await rest.put(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
      { body: commands }
    );

    console.log("Successfully reloaded application (/) commands");
  } catch (error) {
    console.error("Failed to reload commands:", error);
  }
}

main();
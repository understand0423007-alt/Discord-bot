import "dotenv/config";
import { Client, GatewayIntentBits, Events } from "discord.js";
import remindCommand from "./commands/remind.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Bot準備OK
client.once(Events.ClientReady, (c) => {
    console.log(`Logged in as ${c.user.tag}`);
});

// Slashコマンドが呼ばれたとき
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // ここで受け取ったコマンドをログに出す
    console.log(
        `Interaction received: /${interaction.commandName}${
            interaction.options.getSubcommand
            ? " " + interaction.options.getSubcommand()
            : ""
        }`
    );

    if (interaction.commandName === "remind")
        await remindCommand.execute(interaction);
});

client.login(process.env.DISCORD_TOKEN);
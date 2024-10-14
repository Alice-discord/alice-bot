import { SlashCommandBuilder } from "discord.js";

const rmchannel = new SlashCommandBuilder()
	.setName("rmchannel")
	.setIntegrationTypes(0)
	.setContexts(0)
	.setDescription("Remove a channel the app may speak inside when mentioned!");

export default rmchannel;

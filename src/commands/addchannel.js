import { SlashCommandBuilder } from "discord.js";

const addchannel = new SlashCommandBuilder()
	.setName("addchannel")
	.setIntegrationTypes(0)
	.setContexts(0)
	.setDescription("Add a channel the app may speak inside when mentioned!");

export default addchannel;

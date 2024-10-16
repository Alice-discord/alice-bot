import { SlashCommandBuilder } from "discord.js";

const disablewelcome = new SlashCommandBuilder()
	.setName("disablewelcome")
	.setIntegrationTypes(0)
	.setContexts(0)
	.setDescription("Disable welcome message to members!");

export default disablewelcome;

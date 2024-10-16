import { SlashCommandBuilder } from "discord.js";

const enablewelcome = new SlashCommandBuilder()
	.setName("enablewelcome")
	.setIntegrationTypes(0)
	.setContexts(0)
	.setDescription("Enable welcome message to members!");

export default enablewelcome;

import { SlashCommandBuilder } from "discord.js";

const togglewelcome = new SlashCommandBuilder()
	.setName("togglewelcome")
	.setIntegrationTypes(0)
	.setContexts(0)
	.setDescription("Toggle the welcome message to new members!");

export default togglewelcome;

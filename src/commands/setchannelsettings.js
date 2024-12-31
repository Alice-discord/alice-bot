import { SlashCommandBuilder } from "discord.js";

const setchannelsettings = new SlashCommandBuilder()
	.setContexts([0, 1, 2])
	.setIntegrationTypes([0, 1])
	.setName("channelsettings")
	.setDescription("Change current channel settings!")
    .addBooleanOption((option) =>
		option
			.setName("requires_mention")
			.setDescription("Does the bot need to be mentioned in this channel to speak?")
			.setRequired(false)
	)
    .addBooleanOption((option) =>
		option
			.setName("include_system_time")
			.setDescription("Does the LLM know current system time (Eastern time-zone(New york))?")
			.setRequired(false)
	)
    .addBooleanOption((option) =>
		option
			.setName("include_utc")
			.setDescription("Does the LLM know the current utc time?")
			.setRequired(false)
	)
    .addBooleanOption((option) =>
		option
			.setName("include_username")
			.setDescription("Does the LLM know the discord message author's username?")
			.setRequired(false)
	)
    .addBooleanOption((option) =>
		option
			.setName("include_user_id")
			.setDescription("Does the LLM know the discord message author's user id?")
			.setRequired(false)
	)
    .addBooleanOption((option) =>
		option
			.setName("include_user_nick")
			.setDescription("Does the LLM know the discord message author's nickname?")
			.setRequired(false)
	)
    .addBooleanOption((option) =>
		option
			.setName("include_channel_id")
			.setDescription("Does the LLM know the discord channel id?")
			.setRequired(false)
	)
    .addBooleanOption((option) =>
		option
			.setName("include_channel_name")
			.setDescription("Does the LLM know the discord channel name?")
			.setRequired(false)
	)
    .addBooleanOption((option) =>
		option
			.setName("include_guild_name")
			.setDescription("Does the LLM know the discord server/guild name?")
			.setRequired(false)
	)
	.addNumberOption((option) =>
		option
			.setName("repeat_penalty")
			.setDescription("Sets how strongly to penalize repetitions.")
			.setRequired(false)
			.setMinValue(0.1)
			.setMaxValue(10)
	)
	.addNumberOption((option) =>
		option
			.setName("temperature")
			.setDescription("The temperature of the model; more will make the model more creative.")
			.setRequired(false)
			.setMinValue(0.1)
			.setMaxValue(1)
	)
	.addNumberOption((option) =>
		option
			.setName("top_k")
			.setDescription("Reduces the chance of making bs. Higher the more diverse; Lower is more conservative")
			.setRequired(false)
			.setMinValue(1)
			.setMaxValue(100)
	)
	.addNumberOption((option) =>
		option
			.setName("top_p")
			.setDescription("Works together with top-k")
			.setRequired(false)
			.setMinValue(0.1)
			.setMaxValue(1)
	)
	.addNumberOption((option) =>
		option
			.setName("min_p")
			.setDescription("The min chance for a token to be considered, relative to the probability of the fav token.")
			.setRequired(false)
			.setMinValue(0)
			.setMaxValue(1)
	);
    
export default setchannelsettings;
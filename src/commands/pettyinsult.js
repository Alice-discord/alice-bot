import { ContextMenuCommandBuilder, ApplicationCommandType } from "discord.js";

const insultuser = new ContextMenuCommandBuilder()
	.setName("pettyinsultuser")
	.setContexts([0, 1, 2])
	.setType(ApplicationCommandType.User);

export default insultuser;

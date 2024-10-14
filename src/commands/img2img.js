import { SlashCommandBuilder } from "discord.js";

const img2img = new SlashCommandBuilder()
	.setName("img2img")
	.setContexts([0, 1, 2])
	.setIntegrationTypes([0, 1])
	.setDescription("Take an exsisting image and make it AI!")
	.addAttachmentOption((option) => option
		.setRequired(true)
		.setName("image")
		.setDescription("The image to convert")
	)
	.addStringOption((option) =>
		option.setName("prompt").setDescription("Prompt").setRequired(false)
	)
	.addNumberOption((option) =>
		option
			.setName("width")
			.setDescription("Width of the image")
			.setRequired(false)
			.setMinValue(32)
			.setMaxValue(8192)
	)
	.addNumberOption((option) =>
		option
			.setName("height")
			.setDescription("Height of the image")
			.setRequired(false)
			.setMinValue(32)
			.setMaxValue(8192)
	)
	.addNumberOption((option) =>
		option
			.setName("steps")
			.setDescription("Number of steps")
			.setRequired(false)
			.setMinValue(1)
			.setMaxValue(30)
	)
	.addNumberOption((option) =>
		option
			.setName("denoising_strength")
			.setDescription("Respect for original image, 0 highest respect, 1 absolutly no respect.")
			.setRequired(false)
			.setMinValue(0)
			.setMaxValue(1)
	)
	.addNumberOption((option) =>
		option
			.setName("batch_count")
			.setDescription("Batch count")
			.setRequired(false)
			.setMinValue(1)
			.setMaxValue(4)
	)
	.addNumberOption((option) =>
		option
			.setName("batch_size")
			.setDescription("Batch size")
			.setRequired(false)
			.setMinValue(1)
			.setMaxValue(5)
	)
	.addNumberOption((option) =>
		option
			.setName("seed")
			.setDescription("Seed for the Image")
			.setRequired(false)
			.setMinValue(-1)
			.setMaxValue(10000000)
	)
	.addNumberOption((option) =>
		option
			.setName("cfg_scale")
			.setDescription("CFG The higher the value, the more the image sticks to a given text input.")
			.setRequired(false)
			.setMinValue(1)
			.setMaxValue(30)
	)
	.addNumberOption((option) =>
		option
			.setName("distilled_cfg_scale")
			.setDescription("Distilled CFG.")
			.setRequired(false)
			.setMinValue(1)
			.setMaxValue(30)
	)
	.addStringOption((option) =>
		option.setName("sampling_method")
			.setDescription("What algorigthm to use while generating the image.")
			.setRequired(false)
			.addChoices(
				{ name: "DPM++ 2M", value: "DPM++ 2M" },
				{ name: "DPM++ SDE", value: "DPM++ SDE" },
				{ name: "DPM++ 2M SDE", value: "DPM++ 2M SDE" },
				{ name: "DPM++ 2M SDE Heun", value: "DPM++ 2M SDE Heun" },
				{ name: "DPM++ 2S a", value: "DPM++ 2S a" },
				{ name: "DPM++ 3M SDE", value: ":DPM++ 3M SDE" },
				{ name: "Euler a", value: "Euler a" },
				{ name: "Euler", value: "Euler" },
				{ name: "LMS", value: "LMS" },
				{ name: "Heun", value: "Heun" },
				{ name: "DPM2", value: "DPM2" },
				{ name: "DPM2 a", value: "DPM2 a" },
				{ name: "DPM fast", value: "DPM fast" },
				{ name: "Restart", value: "Restart" },
				{ name: "DDIM", value: "DDIM" },
				{ name: "DDIM CFG++", value: "DDIM CFG++" },
				{ name: "PLMS", value: "PLMS" },
				{ name: "UniPC", value: "UniPC" },
				{ name: "LCM", value: "LCM" }
			)
	)
	.addStringOption((option) =>
		option.setName("sampling_type")
			.setDescription("What algorigthm to use while generating the image.")
			.setRequired(false)
			.addChoices(
				{ name: "Simple", value: "Simple" },
				{ name: "Auto", value: "Automatic" },
				{ name: "Norm", value: "Normal" },
				{ name: "Turbo", value: "Turbo" },
				{ name: "Karras", value: "Karras" },
				{ name: "Beta", value: "Beta" }
			)
	)
	.addBooleanOption((option) =>
		option
			.setName("enhance_prompt")
			.setDescription("Enhance prompt")
			.setRequired(false)
	);

export default img2img;
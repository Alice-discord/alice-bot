<div align="center">
    <h1><a href="#"></a><img alt="Alice-logo" src="assets/icon2.png" /></h1>
    <h1><a href="#"></a>Alice Discord AI Bot</h1>
    <h3 align="center"><a href="#"></a>Discord bot to interact with <a href="https://github.com/jmorganca/ollama">Ollama</a> and <a href="https://github.com/lllyasviel/stable-diffusion-webui-forge">Stable Diffusion WebUI Forge</a> as a chatbot</h3>
    <h3><a href="#"></a><img alt="Discord chat with the bot" src="assets/screenshot.png" /></h3>
    <a href="https://ethmangameon.github.io/alice-app/">My website for my bot (Alice) that runs this code!</a>
    <p>
    <br>Alice uses webui forge, ollama and mongodb (Used for storing context, user, channel and even guild data) to give you a chatbot in discord; this repository was forked from <a href="https://github.com/mekb-turtle/discord-ai-bot">discord-ai-bot</a>
    </p>
    </div>
<div align="left">
1. Requirements
<a href="https://ollama.com/">Ollama</a>
<a href="https://github.com/lllyasviel/stable-diffusion-webui-forge">Webui forge</a>
<a href="https://nodejs.org/en">Node.js</a>
<a href="https://www.mongodb.com/try/download/community">MongoDB community</a>

2. .env
Rename the `.env.example` file to `.env`
Open it in an editer and change the settings to your likings
    
3. Start ollama
Pull the model `ollama pull llama3.2`
Start Ollama by using `ollama serve`
    
4. <a href="https://discord.com/developers/applications">Create an discord bot</a>
Make sure to enable `Enable Message Content Intent` and `Enable Server Members Intent`
    
5. Invite the bot to an server
Copy your application id then go to <a href="https://scarsz.me/authorize">scarsz.me</a>
    
6. Start npm
Open a terminal/cmd prompt
CD to your directory that contains the files
Run `npm i`
Then `npm start`
    
7. Install webui forge
8. Install mongodb community
</div>
